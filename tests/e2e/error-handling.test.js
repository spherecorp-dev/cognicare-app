/**
 * E2E Test: Error Handling
 * Story 1.8 AC6: Task failure → step fails → run fails with error details
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
  MOCK_TASKS,
} = require('./helpers');
const PureTaskRunner = require('../../.aios-core/core/orchestration/squad-engine/task-types/pure-task-runner');
const TaskExecutor = require('../../.aios-core/core/orchestration/squad-engine/task-executor');

describe('E2E: Error Handling', () => {
  let tempDirs;

  beforeEach(async () => {
    tempDirs = await createTempDirs();
    setupTaskMocks();
  });

  afterEach(async () => {
    restoreTaskMocks();
    await cleanupTempDirs(tempDirs.tmpDir);
  });

  test('task failure results in run status "failed"', async () => {
    // Create pipeline with error task
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

    const runId = 'e2e-error-001';

    const result = await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
    });

    expect(result.status).toBe('failed');
    expect(result.error).toBeDefined();
    expect(result.error.message).toContain('Simulated task failure');
  }, 30000);

  test('error details available in events', async () => {
    const pipeline = {
      phases: [
        {
          name: 'intelligence',
          steps: [
            { id: 'failing-step', type: 'task_pura', task: 'mock-error-task', input: {} },
          ],
        },
      ],
    };

    const runId = 'e2e-error-events-001';

    const result = await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
    });

    const events = await getRunEvents(result.eventStore, runId);
    const failedEvents = findEventsByType(events, 'run.failed');

    expect(failedEvents).toHaveLength(1);
    expect(failedEvents[0].data.error).toContain('Simulated task failure');
    expect(failedEvents[0].data.stack).toBeDefined();
  }, 30000);

  test('completed steps before failure are preserved in context', async () => {
    const pipeline = {
      phases: [
        {
          name: 'intelligence',
          steps: [
            { id: 'fetch-data', type: 'task_pura', task: 'mock-fetch-data', input: {} },
            { id: 'analyze-data', type: 'task_pura', task: 'mock-analyze-data', input: {} },
          ],
        },
        {
          name: 'production',
          steps: [
            { id: 'failing-step', type: 'task_pura', task: 'mock-error-task', input: {} },
          ],
        },
      ],
    };

    const runId = 'e2e-error-context-001';

    const result = await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
    });

    expect(result.status).toBe('failed');
    // Steps before failure should be in context
    expect(result.context['fetch-data']).toBeDefined();
    expect(result.context['analyze-data']).toBeDefined();
    // Failing step should NOT be in context
    expect(result.context['failing-step']).toBeUndefined();
  }, 30000);

  test('failed run does NOT have run.completed event', async () => {
    const pipeline = {
      phases: [
        {
          name: 'intelligence',
          steps: [
            { id: 'failing-step', type: 'task_pura', task: 'mock-error-task', input: {} },
          ],
        },
      ],
    };

    const runId = 'e2e-error-no-complete-001';

    const result = await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
    });

    const events = await getRunEvents(result.eventStore, runId);
    const completedEvents = findEventsByType(events, 'run.completed');
    expect(completedEvents).toHaveLength(0);
  }, 30000);
});
