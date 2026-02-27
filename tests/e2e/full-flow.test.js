/**
 * E2E Test: Full Flow — Squad-copy Pipeline
 * Story 1.8 AC3: Complete pipeline from trigger to output
 *
 * Tests:
 * - Trigger SquadOrchestrator.execute() with mock playbook
 * - All phases execute in order
 * - Step outputs accumulate in context
 * - events.jsonl has correct event sequence
 * - Final state is `completed` with outputs
 * - Test completes in <30 seconds
 */

const {
  getMockPipeline,
  createTempDirs,
  cleanupTempDirs,
  setupTaskMocks,
  restoreTaskMocks,
  executeFullRun,
  getRunEvents,
  assertEventSequence,
  findEventsByType,
} = require('./helpers');

describe('E2E: Full Flow — Squad-copy Pipeline', () => {
  let tempDirs;

  beforeEach(async () => {
    tempDirs = await createTempDirs();
    setupTaskMocks();
  });

  afterEach(async () => {
    restoreTaskMocks();
    await cleanupTempDirs(tempDirs.tmpDir);
  });

  test('completes full pipeline with all phases and steps', async () => {
    const pipeline = getMockPipeline();
    const runId = 'e2e-full-flow-001';

    const result = await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
    });

    expect(result.status).toBe('completed');
  }, 30000);

  test('all phases execute in correct order', async () => {
    const pipeline = getMockPipeline();
    const runId = 'e2e-phase-order-001';
    const phaseOrder = [];

    await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
      onAfterPhase: async (phase) => {
        phaseOrder.push(phase.name);
      },
    });

    expect(phaseOrder).toEqual(['intelligence', 'production']);
  }, 30000);

  test('step outputs accumulate in context correctly', async () => {
    const pipeline = getMockPipeline();
    const runId = 'e2e-context-001';

    const result = await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
    });

    // All 4 steps should have outputs in context
    expect(result.context['fetch-data']).toBeDefined();
    expect(result.context['fetch-data'].output.data).toBeDefined();
    expect(result.context['fetch-data'].output.data.id).toBe('offer-e2e-001');

    expect(result.context['analyze-data']).toBeDefined();
    expect(result.context['analyze-data'].output.analysis.score).toBe(92);

    expect(result.context['generate-output']).toBeDefined();
    expect(result.context['generate-output'].output.content).toBeDefined();

    expect(result.context['finalize']).toBeDefined();
    expect(result.context['finalize'].output.summary).toBe('Pipeline completed successfully');
  }, 30000);

  test('events.jsonl has correct event sequence', async () => {
    const pipeline = getMockPipeline();
    const runId = 'e2e-events-001';

    const result = await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
    });

    const events = await getRunEvents(result.eventStore, runId);

    // Expected sequence: run.started → phase1(started→steps→completed) → phase2(started→steps→completed) → run.completed
    const expectedSequence = [
      'run.started',
      'phase.started',       // intelligence
      'step.started',        // fetch-data
      'step.completed',
      'step.started',        // analyze-data
      'step.completed',
      'phase.completed',
      'phase.started',       // production
      'step.started',        // generate-output
      'step.completed',
      'step.started',        // finalize
      'step.completed',
      'phase.completed',
      'run.completed',
    ];

    assertEventSequence(events, expectedSequence);
  }, 30000);

  test('final state is completed with valid outputs', async () => {
    const pipeline = getMockPipeline();
    const runId = 'e2e-final-state-001';

    const result = await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
    });

    expect(result.status).toBe('completed');
    expect(Object.keys(result.context)).toHaveLength(4);

    // Verify run.completed event data
    const events = await getRunEvents(result.eventStore, runId);
    const completedEvents = findEventsByType(events, 'run.completed');
    expect(completedEvents).toHaveLength(1);
    expect(completedEvents[0].data.status).toBe('completed');
    expect(completedEvents[0].data.outputs_count).toBe(4);
    expect(completedEvents[0].data.total_duration_ms).toBeDefined();
  }, 30000);

  test('each event has valid schema (event, timestamp, runId, data)', async () => {
    const pipeline = getMockPipeline();
    const runId = 'e2e-schema-001';

    await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
    });

    const events = await getRunEvents(
      require('../../.aios-core/core/orchestration/squad-engine/event-store').EventStore
        ? new (require('../../.aios-core/core/orchestration/squad-engine/event-store').EventStore)(tempDirs.runsDir)
        : null,
      runId
    );

    // Re-read events directly from the EventStore
    const { EventStore } = require('../../.aios-core/core/orchestration/squad-engine/event-store');
    const store = new EventStore(tempDirs.runsDir);
    const allEvents = await store.getEvents(runId);

    for (const event of allEvents) {
      expect(event.event).toBeDefined();
      expect(typeof event.event).toBe('string');
      expect(event.timestamp).toBeDefined();
      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(event.runId).toBe(runId);
      expect(event.data).toBeDefined();
      expect(typeof event.data).toBe('object');
    }
  }, 30000);
});
