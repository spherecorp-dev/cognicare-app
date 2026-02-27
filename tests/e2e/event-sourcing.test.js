/**
 * E2E Test: Event Sourcing Integration
 * Story 1.8 AC8: Event emission, replay, and state recovery
 */

const path = require('path');
const fs = require('fs').promises;
const yaml = require('js-yaml');

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
const { EventStore } = require('../../.aios-core/core/orchestration/squad-engine/event-store');
const { StateManager } = require('../../.aios-core/core/orchestration/squad-engine/state-manager');

describe('E2E: Event Sourcing Integration', () => {
  let tempDirs;

  beforeEach(async () => {
    tempDirs = await createTempDirs();
    setupTaskMocks();
  });

  afterEach(async () => {
    restoreTaskMocks();
    await cleanupTempDirs(tempDirs.tmpDir);
  });

  test('full run generates events.jsonl with all expected event types', async () => {
    const pipeline = getMockPipeline();
    const runId = 'e2e-eventsource-001';

    const result = await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
    });

    const events = await getRunEvents(result.eventStore, runId);
    const eventTypes = [...new Set(events.map((e) => e.event))];

    // All expected types should be present in a full run
    expect(eventTypes).toContain('run.started');
    expect(eventTypes).toContain('phase.started');
    expect(eventTypes).toContain('phase.completed');
    expect(eventTypes).toContain('step.started');
    expect(eventTypes).toContain('step.completed');
    expect(eventTypes).toContain('run.completed');

    // Verify counts
    const phaseStarted = findEventsByType(events, 'phase.started');
    const phaseCompleted = findEventsByType(events, 'phase.completed');
    const stepStarted = findEventsByType(events, 'step.started');
    const stepCompleted = findEventsByType(events, 'step.completed');

    expect(phaseStarted).toHaveLength(2); // intelligence, production
    expect(phaseCompleted).toHaveLength(2);
    expect(stepStarted).toHaveLength(4); // 4 steps total
    expect(stepCompleted).toHaveLength(4);
  }, 30000);

  test('EventStore.replay() reconstructs state matching actual final state', async () => {
    const pipeline = getMockPipeline();
    const runId = 'e2e-replay-001';

    const result = await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
    });

    // Replay events
    const eventStore = new EventStore(tempDirs.runsDir);
    const replayedState = await eventStore.replay(runId);

    // Verify replayed state matches actual run
    expect(replayedState.status).toBe('completed');
    expect(replayedState.squadId).toBe('e2e-test-squad');
    expect(replayedState.pipelineName).toBe('mock-pipeline');

    // Verify phases completed
    expect(replayedState.phases_completed).toContain('intelligence');
    expect(replayedState.phases_completed).toContain('production');
    expect(replayedState.phases_completed).toHaveLength(2);

    // Verify steps completed
    expect(replayedState.steps_completed).toContain('fetch-data');
    expect(replayedState.steps_completed).toContain('analyze-data');
    expect(replayedState.steps_completed).toContain('generate-output');
    expect(replayedState.steps_completed).toContain('finalize');
    expect(replayedState.steps_completed).toHaveLength(4);

    // Verify context has step outputs
    expect(replayedState.context['fetch-data']).toBeDefined();
    expect(replayedState.context['finalize']).toBeDefined();
  }, 30000);

  test('corrupted state.yaml recovers via event replay', async () => {
    const pipeline = getMockPipeline();
    const runId = 'e2e-recovery-001';
    const eventStore = new EventStore(tempDirs.runsDir);

    // Execute a full run to generate events
    await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
    });

    // Create a corrupted state.yaml
    const stateFile = path.join(tempDirs.stateDir, `${runId}.state.yaml`);
    await fs.writeFile(stateFile, ':::CORRUPTED YAML{{{invalid', 'utf8');

    // StateManager should recover via EventStore replay
    const stateManager = new StateManager(tempDirs.stateDir, { eventStore });

    // loadState should detect corruption and fall back to replay
    const recoveredState = await stateManager.loadState(runId);

    expect(recoveredState.status).toBe('completed');
    expect(recoveredState.squadId).toBe('e2e-test-squad');
    expect(recoveredState.steps_completed).toHaveLength(4);
  }, 30000);

  test('replay of empty events returns initial state with unknown status', async () => {
    const eventStore = new EventStore(tempDirs.runsDir);
    const runId = 'e2e-replay-empty-001';

    const state = await eventStore.replay(runId);

    expect(state.status).toBe('unknown');
    expect(state.squadId).toBeNull();
    expect(state.phases_completed).toEqual([]);
    expect(state.steps_completed).toEqual([]);
  }, 30000);

  test('replay of failed run reconstructs error state', async () => {
    const pipeline = {
      phases: [
        {
          name: 'intelligence',
          steps: [
            { id: 'fetch-data', type: 'task_pura', task: 'mock-fetch-data', input: {} },
            { id: 'failing-step', type: 'task_pura', task: 'mock-error-task', input: {} },
          ],
        },
      ],
    };

    const runId = 'e2e-replay-failed-001';

    await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
    });

    const eventStore = new EventStore(tempDirs.runsDir);
    const replayedState = await eventStore.replay(runId);

    expect(replayedState.status).toBe('failed');
    expect(replayedState.error).toBeDefined();
    expect(replayedState.steps_completed).toContain('fetch-data');
  }, 30000);
});
