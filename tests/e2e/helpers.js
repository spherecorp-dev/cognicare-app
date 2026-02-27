/**
 * E2E Test Helpers
 * Story 1.8: E2E Testing — Squad-copy Completo
 *
 * Setup/teardown utilities, mock tasks, and execution helpers
 * for integration/E2E tests of the Squad Orchestration Engine.
 */

const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const yaml = require('js-yaml');

const TaskExecutor = require('../../.aios-core/core/orchestration/squad-engine/task-executor');
const PureTaskRunner = require('../../.aios-core/core/orchestration/squad-engine/task-types/pure-task-runner');
const { EventStore } = require('../../.aios-core/core/orchestration/squad-engine/event-store');
const { StateManager } = require('../../.aios-core/core/orchestration/squad-engine/state-manager');

// ─── Mock Task Functions ───────────────────────────────────────────────────────

const MOCK_TASKS = {
  'mock-fetch-data': async (input) => ({
    data: { id: 'offer-e2e-001', name: 'E2E Test Offer', price: 199.99 },
  }),

  'mock-analyze-data': async (input) => ({
    analysis: { score: 92, summary: 'High-quality offer', keywords: ['premium', 'exclusive'] },
  }),

  'mock-generate-output': async (input) => ({
    content: 'Generated creative content for E2E test',
    format: 'text',
  }),

  'mock-finalize': async (input) => ({
    summary: 'Pipeline completed successfully',
    outputCount: 4,
    status: 'finalized',
  }),

  'mock-error-task': async () => {
    throw new Error('Simulated task failure for E2E testing');
  },

  'mock-slow-task': async () => {
    return { data: 'slow task completed' };
  },
};

// ─── Mock Pipeline ─────────────────────────────────────────────────────────────

function getMockPipeline() {
  return {
    phases: [
      {
        name: 'intelligence',
        steps: [
          { id: 'fetch-data', type: 'task_pura', task: 'mock-fetch-data', input: { offerId: 'offer-e2e-001' } },
          { id: 'analyze-data', type: 'task_pura', task: 'mock-analyze-data', input: {} },
        ],
      },
      {
        name: 'production',
        steps: [
          { id: 'generate-output', type: 'task_pura', task: 'mock-generate-output', input: {} },
          { id: 'finalize', type: 'task_pura', task: 'mock-finalize', input: {} },
        ],
      },
    ],
  };
}

// ─── Temp Directory Management ─────────────────────────────────────────────────

async function createTempDirs() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-squad-'));
  const stateDir = path.join(tmpDir, 'state');
  const runsDir = path.join(tmpDir, 'runs');
  await fs.mkdir(stateDir, { recursive: true });
  await fs.mkdir(runsDir, { recursive: true });
  return { tmpDir, stateDir, runsDir };
}

async function cleanupTempDirs(tmpDir) {
  if (!tmpDir) return;
  try {
    await fs.rm(tmpDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

// ─── Mock Setup ────────────────────────────────────────────────────────────────

/**
 * Setup Jest mocks for TaskExecutor and PureTaskRunner.
 * Call this in beforeEach() of E2E tests.
 */
function setupTaskMocks() {
  // Mock loadTaskFile to avoid file system access for task files
  jest.spyOn(TaskExecutor.prototype, 'loadTaskFile').mockImplementation(
    async (squadName, taskName) => ({
      name: taskName,
      content: `Mock task: ${taskName}`,
      path: `/mock/squads/${squadName}/tasks/${taskName}.md`,
    })
  );

  // Mock PureTaskRunner to use our mock task functions
  jest.spyOn(PureTaskRunner.prototype, 'getTaskMap').mockReturnValue(MOCK_TASKS);
}

/**
 * Restore all Jest mocks. Call this in afterEach().
 */
function restoreTaskMocks() {
  jest.restoreAllMocks();
}

// ─── Pipeline Execution Helper ─────────────────────────────────────────────────

/**
 * Executes a full pipeline run using real components (with mocked task I/O).
 *
 * @param {Object} options
 * @param {Object} options.pipeline - Pipeline definition object
 * @param {string} options.runId - Run identifier
 * @param {string} options.runsDir - Directory for events.jsonl
 * @param {string} options.stateDir - Directory for state files
 * @param {Function} [options.onBeforeStep] - Hook called before each step. Return 'pause' or 'abort' to interrupt.
 * @param {Function} [options.onAfterPhase] - Hook called after each phase completes.
 * @returns {Promise<Object>} Run result { status, context, eventStore, error? }
 */
async function executeFullRun(options) {
  const { pipeline, runId, runsDir, stateDir, onBeforeStep, onAfterPhase } = options;

  const eventStore = new EventStore(runsDir);
  const taskExecutor = new TaskExecutor({ eventStore });

  const context = {};
  const startTime = Date.now();

  // Emit run.started
  eventStore.append(runId, 'run.started', {
    squadId: 'e2e-test-squad',
    playbook: 'mock-pipeline',
    trigger: { type: 'manual' },
  });

  try {
    for (let phaseIdx = 0; phaseIdx < pipeline.phases.length; phaseIdx++) {
      const phase = pipeline.phases[phaseIdx];

      // Emit phase.started
      eventStore.append(runId, 'phase.started', {
        phaseName: phase.name,
        phaseIndex: phaseIdx,
      });

      for (const step of phase.steps) {
        // Hook for test control (pause/abort)
        if (onBeforeStep) {
          const action = await onBeforeStep(step, phase, phaseIdx, context);
          if (action === 'abort') {
            eventStore.append(runId, 'run.aborted', {
              reason: 'user-request',
              aborted_at_step: step.id,
            });
            return { status: 'aborted', context, eventStore };
          }
          if (action === 'pause') {
            eventStore.append(runId, 'run.paused', {
              reason: 'user-request',
              current_step: step.id,
            });
            return {
              status: 'paused',
              context,
              eventStore,
              pausedAt: { phaseIndex: phaseIdx, stepId: step.id },
            };
          }
        }

        // Execute step using REAL TaskExecutor (with mocked file I/O)
        // TaskExecutor already emits step.started and step.completed events
        const result = await taskExecutor.executeTask(step, context, 'e2e-test-squad', runId);

        // Accumulate output in context
        context[step.id] = { output: result.output };
      }

      // Emit phase.completed
      eventStore.append(runId, 'phase.completed', {
        phaseName: phase.name,
        status: 'completed',
        duration_ms: Date.now() - startTime,
      });

      if (onAfterPhase) {
        await onAfterPhase(phase, phaseIdx, context);
      }
    }

    // Emit run.completed
    const totalDuration = Date.now() - startTime;
    eventStore.append(runId, 'run.completed', {
      status: 'completed',
      total_duration_ms: totalDuration,
      outputs_count: Object.keys(context).length,
    });

    return { status: 'completed', context, eventStore };
  } catch (error) {
    eventStore.append(runId, 'run.failed', {
      error: error.message,
      failed_step: null,
      stack: error.stack,
    });
    return { status: 'failed', error, context, eventStore };
  }
}

// ─── Event Verification Helpers ────────────────────────────────────────────────

/**
 * Get all events for a run from EventStore.
 */
async function getRunEvents(eventStore, runId) {
  return eventStore.getEvents(runId);
}

/**
 * Assert that events contain the expected sequence of event types.
 */
function assertEventSequence(events, expectedTypes) {
  const actualTypes = events.map((e) => e.event);
  expect(actualTypes).toEqual(expectedTypes);
}

/**
 * Find events by type.
 */
function findEventsByType(events, eventType) {
  return events.filter((e) => e.event === eventType);
}

module.exports = {
  MOCK_TASKS,
  getMockPipeline,
  createTempDirs,
  cleanupTempDirs,
  setupTaskMocks,
  restoreTaskMocks,
  executeFullRun,
  getRunEvents,
  assertEventSequence,
  findEventsByType,
};
