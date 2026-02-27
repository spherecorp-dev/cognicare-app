/**
 * E2E Test: Condition Engine Integration
 * Story 1.8 AC7: Pre/post-conditions with blocker/non-blocker behavior
 */

const {
  createTempDirs,
  cleanupTempDirs,
  setupTaskMocks,
  restoreTaskMocks,
  executeFullRun,
  getRunEvents,
} = require('./helpers');

describe('E2E: Condition Engine Integration', () => {
  let tempDirs;

  beforeEach(async () => {
    tempDirs = await createTempDirs();
    setupTaskMocks();
  });

  afterEach(async () => {
    restoreTaskMocks();
    await cleanupTempDirs(tempDirs.tmpDir);
  });

  test('pre-condition blocker fails → step blocked, run fails', async () => {
    const pipeline = {
      phases: [
        {
          name: 'intelligence',
          steps: [
            {
              id: 'blocked-step',
              type: 'task_pura',
              task: 'mock-fetch-data',
              input: {},
              pre_conditions: [
                {
                  condition: 'required-data-present',
                  source: '{{missing-step.output.data}}',
                  validation: 'presente',
                  blocker: true,
                },
              ],
            },
          ],
        },
      ],
    };

    const runId = 'e2e-precond-blocker-001';

    const result = await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
    });

    expect(result.status).toBe('failed');
    expect(result.error).toBeDefined();
    expect(result.error.name).toBe('PreConditionError');
  }, 30000);

  test('post-condition fails → step marked failed', async () => {
    const pipeline = {
      phases: [
        {
          name: 'intelligence',
          steps: [
            {
              id: 'fetch-data',
              type: 'task_pura',
              task: 'mock-fetch-data',
              input: {},
              post_conditions: [
                {
                  condition: 'output-score-high',
                  source: '{{fetch-data.output.nonexistent}}',
                  validation: '>= 100',
                  blocker: true,
                },
              ],
            },
          ],
        },
      ],
    };

    const runId = 'e2e-postcond-fail-001';

    const result = await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
    });

    expect(result.status).toBe('failed');
    expect(result.error).toBeDefined();
    expect(result.error.name).toBe('PostConditionError');
  }, 30000);

  test('non-blocker condition fails → warning logged, execution continues', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const pipeline = {
      phases: [
        {
          name: 'intelligence',
          steps: [
            {
              id: 'fetch-data',
              type: 'task_pura',
              task: 'mock-fetch-data',
              input: {},
              pre_conditions: [
                {
                  condition: 'optional-check',
                  source: '{{nonexistent.path}}',
                  validation: 'presente',
                  blocker: false, // Non-blocker
                },
              ],
            },
            {
              id: 'analyze-data',
              type: 'task_pura',
              task: 'mock-analyze-data',
              input: {},
            },
          ],
        },
      ],
    };

    const runId = 'e2e-nonblocker-001';

    const result = await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
    });

    // Execution continues despite non-blocker failure
    expect(result.status).toBe('completed');
    expect(result.context['fetch-data']).toBeDefined();
    expect(result.context['analyze-data']).toBeDefined();

    // Warning was logged
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Pre-condition'),
      expect.anything()
    );

    consoleSpy.mockRestore();
  }, 30000);

  test('pre-condition passes when context has required data', async () => {
    const pipeline = {
      phases: [
        {
          name: 'intelligence',
          steps: [
            {
              id: 'fetch-data',
              type: 'task_pura',
              task: 'mock-fetch-data',
              input: {},
            },
            {
              id: 'analyze-data',
              type: 'task_pura',
              task: 'mock-analyze-data',
              input: {},
              pre_conditions: [
                {
                  condition: 'fetch-data-present',
                  source: '{{fetch-data.output.data}}',
                  validation: 'presente',
                  blocker: true,
                },
              ],
            },
          ],
        },
      ],
    };

    const runId = 'e2e-precond-pass-001';

    const result = await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
    });

    expect(result.status).toBe('completed');
    expect(result.context['analyze-data']).toBeDefined();
  }, 30000);
});
