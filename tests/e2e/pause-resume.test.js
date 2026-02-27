/**
 * E2E Test: Pause/Resume
 * Story 1.8 AC4: Run starts, pauses, saves state, resumes, completes
 */

const {
  getMockPipeline,
  createTempDirs,
  cleanupTempDirs,
  setupTaskMocks,
  restoreTaskMocks,
  executeFullRun,
  getRunEvents,
  findEventsByType,
} = require('./helpers');
const { StateManager } = require('../../.aios-core/core/orchestration/squad-engine/state-manager');
const { EventStore } = require('../../.aios-core/core/orchestration/squad-engine/event-store');
const TaskExecutor = require('../../.aios-core/core/orchestration/squad-engine/task-executor');

describe('E2E: Pause/Resume', () => {
  let tempDirs;

  beforeEach(async () => {
    tempDirs = await createTempDirs();
    setupTaskMocks();
  });

  afterEach(async () => {
    restoreTaskMocks();
    await cleanupTempDirs(tempDirs.tmpDir);
  });

  test('pauses after first phase and saves state correctly', async () => {
    const pipeline = getMockPipeline();
    const runId = 'e2e-pause-001';
    let phasesCompleted = 0;

    const result = await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
      onBeforeStep: async (step, phase, phaseIdx) => {
        // Pause at the start of the second phase (production)
        if (phaseIdx === 1 && step.id === 'generate-output') {
          return 'pause';
        }
        return null;
      },
      onAfterPhase: async () => {
        phasesCompleted++;
      },
    });

    expect(result.status).toBe('paused');
    expect(phasesCompleted).toBe(1); // Only intelligence phase completed
    expect(result.pausedAt.phaseIndex).toBe(1);
    expect(result.pausedAt.stepId).toBe('generate-output');
  }, 30000);

  test('paused run emits run.paused event with correct data', async () => {
    const pipeline = getMockPipeline();
    const runId = 'e2e-pause-event-001';

    const result = await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
      onBeforeStep: async (step, phase, phaseIdx) => {
        if (phaseIdx === 1 && step.id === 'generate-output') return 'pause';
        return null;
      },
    });

    const events = await getRunEvents(result.eventStore, runId);
    const pauseEvents = findEventsByType(events, 'run.paused');

    expect(pauseEvents).toHaveLength(1);
    expect(pauseEvents[0].data.reason).toBe('user-request');
    expect(pauseEvents[0].data.current_step).toBe('generate-output');
  }, 30000);

  test('pause saves state via StateManager and resume loads it', async () => {
    const runId = 'e2e-pause-resume-state-001';
    const eventStore = new EventStore(tempDirs.runsDir);
    const stateManager = new StateManager(tempDirs.stateDir, { eventStore });

    // Simulate paused state
    const pausedState = {
      squadId: 'e2e-test-squad',
      currentTask: 'generate-output',
      currentTaskIndex: 0,
      completedTasks: ['fetch-data', 'analyze-data'],
      pendingTasks: ['generate-output', 'finalize'],
      context: {
        'fetch-data': { output: { data: { id: 'offer-e2e-001' } } },
        'analyze-data': { output: { analysis: { score: 92 } } },
      },
    };

    // Save state via pause
    await stateManager.pause(runId, pausedState);

    // Resume loads the state
    const resumed = await stateManager.resume(runId);

    expect(resumed.status).toBe('paused');
    expect(resumed.squadId).toBe('e2e-test-squad');
    expect(resumed.currentTask).toBe('generate-output');
    expect(resumed.completedTasks).toEqual(['fetch-data', 'analyze-data']);
    expect(resumed.context['fetch-data'].output.data.id).toBe('offer-e2e-001');
  }, 30000);

  test('resume continues execution from paused step to completion', async () => {
    const pipeline = getMockPipeline();
    const runId = 'e2e-resume-complete-001';

    // Phase 1: Run and pause at start of phase 2
    const pausedResult = await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
      onBeforeStep: async (step, phase, phaseIdx) => {
        if (phaseIdx === 1 && step.id === 'generate-output') return 'pause';
        return null;
      },
    });

    expect(pausedResult.status).toBe('paused');

    // Phase 2: Resume from paused point (execute remaining steps)
    const eventStore = pausedResult.eventStore;
    const taskExecutor = new TaskExecutor({ eventStore });
    const context = { ...pausedResult.context };
    const remainingPhases = pipeline.phases.slice(pausedResult.pausedAt.phaseIndex);

    // Emit run.resumed
    eventStore.append(runId, 'run.resumed', {
      resumed_at_step: pausedResult.pausedAt.stepId,
    });

    // Execute remaining phases
    for (const phase of remainingPhases) {
      eventStore.append(runId, 'phase.started', {
        phaseName: phase.name,
        phaseIndex: pipeline.phases.indexOf(phase),
      });

      for (const step of phase.steps) {
        const result = await taskExecutor.executeTask(step, context, 'e2e-test-squad', runId);
        context[step.id] = { output: result.output };
      }

      eventStore.append(runId, 'phase.completed', {
        phaseName: phase.name,
        status: 'completed',
        duration_ms: 0,
      });
    }

    eventStore.append(runId, 'run.completed', {
      status: 'completed',
      total_duration_ms: 0,
      outputs_count: Object.keys(context).length,
    });

    // Verify all 4 steps completed
    expect(Object.keys(context)).toHaveLength(4);
    expect(context['finalize']).toBeDefined();

    // Verify events include both paused and resumed
    const events = await getRunEvents(eventStore, runId);
    const eventTypes = events.map((e) => e.event);
    expect(eventTypes).toContain('run.paused');
    expect(eventTypes).toContain('run.resumed');
    expect(eventTypes).toContain('run.completed');
  }, 30000);
});
