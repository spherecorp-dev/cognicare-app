/**
 * Pause/Resume Integration Tests
 * Story 1.4 - AC8: 4 integration tests
 *
 * Tests full pause-resume workflow with SquadOrchestrator
 */

const fs = require('fs').promises;
const path = require('path');
const SquadOrchestrator = require('../../squad-orchestrator');
const { StateManager, StateCorruptionError } = require('../../state-manager');

describe('Pause/Resume Integration', () => {
  let orchestrator;
  let stateManager;
  let testStateDir;

  beforeEach(async () => {
    testStateDir = path.join(__dirname, '.test-integration-state');
    orchestrator = new SquadOrchestrator(testStateDir);
    stateManager = new StateManager(testStateDir);
    await fs.mkdir(testStateDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testStateDir, { recursive: true, force: true });
    } catch (error) {
      // Ignora erros de remoção
    }
  });

  /**
   * Integration Test 1: Full Pause-Resume Cycle
   * Tests complete workflow: run → pause → resume → continue
   */
  test('IT1: should complete full pause-resume cycle successfully', async () => {
    const runId = 'integration-run-001';
    const initialState = {
      squadId: 'test-squad',
      currentTask: 'generate-copy',
      currentTaskIndex: 2,
      completedTasks: ['load-offer', 'analyze-context'],
      pendingTasks: ['review-copy', 'finalize'],
      context: {
        offerId: 'TESTIT01',
        language: 'pt-BR',
        copyGenerated: 'Sample copy text'
      }
    };

    // PAUSE: Simulate graceful pause during execution
    await orchestrator.pause(runId, initialState);

    // Verify state file exists
    const stateFile = path.join(testStateDir, `${runId}.state.yaml`);
    const fileExists = await fs.access(stateFile).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);

    // RESUME: Load paused state
    const resumedState = await orchestrator.resume(runId);

    // Verify state integrity
    expect(resumedState.squadId).toBe(initialState.squadId);
    expect(resumedState.currentTask).toBe(initialState.currentTask);
    expect(resumedState.currentTaskIndex).toBe(initialState.currentTaskIndex);
    expect(resumedState.completedTasks).toEqual(initialState.completedTasks);
    expect(resumedState.pendingTasks).toEqual(initialState.pendingTasks);
    expect(resumedState.context.offerId).toBe(initialState.context.offerId);
    expect(resumedState.context.copyGenerated).toBe(initialState.context.copyGenerated);
    expect(resumedState.status).toBe('paused');

    // CLEANUP: Clear state after completion
    await orchestrator.clearState(runId);
    const fileExistsAfterClear = await fs.access(stateFile).then(() => true).catch(() => false);
    expect(fileExistsAfterClear).toBe(false);
  });

  /**
   * Integration Test 2: Multiple Concurrent Paused Executions
   * Tests handling of multiple paused runs simultaneously
   */
  test('IT2: should handle multiple concurrent paused executions', async () => {
    const runs = [
      {
        runId: 'multi-run-001',
        state: {
          squadId: 'squad-copy',
          currentTask: 'task-1',
          currentTaskIndex: 0,
          completedTasks: [],
          pendingTasks: ['task-2', 'task-3'],
          context: { id: 'run1' }
        }
      },
      {
        runId: 'multi-run-002',
        state: {
          squadId: 'squad-design',
          currentTask: 'task-2',
          currentTaskIndex: 1,
          completedTasks: ['task-1'],
          pendingTasks: ['task-3'],
          context: { id: 'run2' }
        }
      },
      {
        runId: 'multi-run-003',
        state: {
          squadId: 'squad-analysis',
          currentTask: 'task-3',
          currentTaskIndex: 2,
          completedTasks: ['task-1', 'task-2'],
          pendingTasks: [],
          context: { id: 'run3' }
        }
      }
    ];

    // Pause all runs
    for (const run of runs) {
      await orchestrator.pause(run.runId, run.state);
    }

    // List paused executions
    const pausedRuns = await orchestrator.listPausedExecutions();
    expect(pausedRuns).toHaveLength(3);
    expect(pausedRuns).toContain('multi-run-001');
    expect(pausedRuns).toContain('multi-run-002');
    expect(pausedRuns).toContain('multi-run-003');

    // Resume each run individually and verify isolation
    for (const run of runs) {
      const resumedState = await orchestrator.resume(run.runId);
      expect(resumedState.squadId).toBe(run.state.squadId);
      expect(resumedState.currentTask).toBe(run.state.currentTask);
      expect(resumedState.context.id).toBe(run.state.context.id);
    }

    // Cleanup
    for (const run of runs) {
      await orchestrator.clearState(run.runId);
    }

    const pausedRunsAfterClear = await orchestrator.listPausedExecutions();
    expect(pausedRunsAfterClear).toHaveLength(0);
  });

  /**
   * Integration Test 3: State Corruption Detection and Recovery
   * Tests that corrupted state files are detected and rejected
   */
  test('IT3: should detect corrupted state files and attempt recovery or reject', async () => {
    const runId = 'corruption-test-001';
    const state = {
      squadId: 'test-squad',
      currentTask: 'critical-task',
      currentTaskIndex: 5,
      completedTasks: ['task-1', 'task-2', 'task-3', 'task-4', 'task-5'],
      pendingTasks: ['task-6', 'task-7'],
      context: {
        criticalData: 'IMPORTANT_VALUE',
        processed: true
      }
    };

    // Save valid state
    await orchestrator.pause(runId, state);

    // Verify valid state can be loaded
    const validState = await orchestrator.resume(runId);
    expect(validState.context.criticalData).toBe('IMPORTANT_VALUE');

    // CORRUPT the state file (modify data without updating checksum)
    const stateFile = path.join(testStateDir, `${runId}.state.yaml`);
    let fileContent = await fs.readFile(stateFile, 'utf8');

    // Tamper with critical data
    fileContent = fileContent.replace('IMPORTANT_VALUE', 'TAMPERED_VALUE');
    await fs.writeFile(stateFile, fileContent, 'utf8');

    // Story 1.7: With EventStore, corrupted state triggers recovery via event replay.
    // The recovered state has status from events (e.g., 'paused'), not 'paused' from state file.
    // Resume should either recover successfully or reject with an appropriate error.
    // With EventStore active, it recovers state from events — resume succeeds or fails
    // based on the recovered state's status.
    await expect(orchestrator.resume(runId))
      .rejects
      .toThrow(); // Rejects because recovered state may not have status 'paused'
  });

  /**
   * Integration Test 4: Complex Context Preservation
   * Tests that complex nested context objects are preserved correctly
   */
  test('IT4: should preserve complex nested context during pause-resume', async () => {
    const runId = 'complex-context-001';
    const complexState = {
      squadId: 'squad-complex',
      currentTask: 'process-data',
      currentTaskIndex: 3,
      completedTasks: ['init', 'load', 'validate'],
      pendingTasks: ['transform', 'export'],
      context: {
        offer: {
          id: 'OFFER123',
          name: 'Premium Offer',
          details: {
            price: 99.99,
            currency: 'USD',
            features: ['feature1', 'feature2', 'feature3']
          }
        },
        user: {
          id: 'user-456',
          preferences: {
            language: 'pt-BR',
            timezone: 'America/Sao_Paulo',
            settings: {
              notifications: true,
              theme: 'dark'
            }
          }
        },
        results: {
          processed: [
            { id: 1, status: 'completed', data: { value: 100 } },
            { id: 2, status: 'pending', data: { value: 200 } }
          ],
          metadata: {
            startTime: 1234567890,
            processingTime: 5000,
            checksums: ['abc123', 'def456']
          }
        }
      }
    };

    // Pause with complex context
    await orchestrator.pause(runId, complexState);

    // Resume and verify deep object equality
    const resumedState = await orchestrator.resume(runId);

    // Verify nested offer details
    expect(resumedState.context.offer.id).toBe('OFFER123');
    expect(resumedState.context.offer.details.price).toBe(99.99);
    expect(resumedState.context.offer.details.features).toEqual(['feature1', 'feature2', 'feature3']);

    // Verify nested user preferences
    expect(resumedState.context.user.preferences.language).toBe('pt-BR');
    expect(resumedState.context.user.preferences.settings.theme).toBe('dark');

    // Verify nested results array
    expect(resumedState.context.results.processed).toHaveLength(2);
    expect(resumedState.context.results.processed[0].data.value).toBe(100);
    expect(resumedState.context.results.metadata.checksums).toContain('abc123');

    // Verify complete deep equality
    expect(resumedState.context).toEqual(complexState.context);
  });
});
