/**
 * E2E Test: Abort
 * Story 1.8 AC5: Run starts, abort triggered, no further steps execute
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

describe('E2E: Abort', () => {
  let tempDirs;

  beforeEach(async () => {
    tempDirs = await createTempDirs();
    setupTaskMocks();
  });

  afterEach(async () => {
    restoreTaskMocks();
    await cleanupTempDirs(tempDirs.tmpDir);
  });

  test('abort stops execution and sets status to aborted', async () => {
    const pipeline = getMockPipeline();
    const runId = 'e2e-abort-001';

    const result = await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
      onBeforeStep: async (step) => {
        // Abort when reaching the second step
        if (step.id === 'analyze-data') return 'abort';
        return null;
      },
    });

    expect(result.status).toBe('aborted');
  }, 30000);

  test('no steps execute after abort signal', async () => {
    const pipeline = getMockPipeline();
    const runId = 'e2e-abort-no-steps-001';
    const executedSteps = [];

    const result = await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
      onBeforeStep: async (step) => {
        executedSteps.push(step.id);
        if (step.id === 'analyze-data') return 'abort';
        return null;
      },
    });

    // Only fetch-data executed, analyze-data was the abort point
    // onBeforeStep sees analyze-data but it's not executed
    expect(result.context['fetch-data']).toBeDefined();
    expect(result.context['analyze-data']).toBeUndefined();
    expect(result.context['generate-output']).toBeUndefined();
    expect(result.context['finalize']).toBeUndefined();
  }, 30000);

  test('events include run.aborted with correct data', async () => {
    const pipeline = getMockPipeline();
    const runId = 'e2e-abort-events-001';

    const result = await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
      onBeforeStep: async (step) => {
        if (step.id === 'generate-output') return 'abort';
        return null;
      },
    });

    const events = await getRunEvents(result.eventStore, runId);
    const abortEvents = findEventsByType(events, 'run.aborted');

    expect(abortEvents).toHaveLength(1);
    expect(abortEvents[0].data.reason).toBe('user-request');
    expect(abortEvents[0].data.aborted_at_step).toBe('generate-output');

    // Should NOT have run.completed event
    const completedEvents = findEventsByType(events, 'run.completed');
    expect(completedEvents).toHaveLength(0);
  }, 30000);

  test('abort at first step results in no completed steps', async () => {
    const pipeline = getMockPipeline();
    const runId = 'e2e-abort-first-001';

    const result = await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
      onBeforeStep: async (step) => {
        if (step.id === 'fetch-data') return 'abort';
        return null;
      },
    });

    expect(result.status).toBe('aborted');
    expect(Object.keys(result.context)).toHaveLength(0);
  }, 30000);
});
