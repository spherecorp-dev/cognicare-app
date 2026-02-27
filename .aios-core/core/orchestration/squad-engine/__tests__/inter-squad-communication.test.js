/**
 * Unit Tests - Inter-Squad Communication
 * Story 3.2: Inter-Squad Communication — Squad-to-Squad Calls
 *
 * Covers: AC1 (executeSquad), AC2 (waitForCompletion), AC3 (getOutputs),
 *         AC4 (inter-squad logging), AC6 (executeAndWait), AC7 (path resolution)
 */

const SquadOrchestrator = require('../squad-orchestrator');
const { InterSquadTimeoutError, InterSquadRunError } = require('../errors');
const { EVENT_TYPES } = require('../event-store');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

// Helper: create minimal squad directory structure
async function createSquadFixture(basePath, squadName) {
  const squadDir = path.join(basePath, squadName);
  await fs.mkdir(path.join(squadDir, 'workflows'), { recursive: true });
  await fs.mkdir(path.join(squadDir, 'tasks'), { recursive: true });

  await fs.writeFile(
    path.join(squadDir, 'squad.yaml'),
    yaml.dump({
      id: squadName,
      name: squadName,
      description: `Test squad: ${squadName}`,
      version: '1.0.0',
      components: {
        workflows: ['creative-pipeline'],
        agents: [{ id: 'test-agent', role: 'tester' }],
      },
    }),
    'utf8'
  );

  await fs.writeFile(
    path.join(squadDir, 'workflows', 'creative-pipeline.yaml'),
    yaml.dump({
      name: 'creative-pipeline',
      description: 'Test pipeline',
      trigger: { type: 'manual' },
      phases: [
        {
          name: 'phase-1',
          steps: [
            {
              id: 'step-1',
              type: 'output',
              task: 'test-task',
              input: {},
            },
          ],
        },
      ],
    }),
    'utf8'
  );

  return squadDir;
}

// Helper: cleanup run state directories
async function cleanupRunDirs() {
  const runsDir = path.join(process.cwd(), '.aios', 'squad-runs');
  try {
    const entries = await fs.readdir(runsDir);
    for (const entry of entries) {
      if (entry.startsWith('test-squad-') || entry.startsWith('squad-callee-')) {
        await fs.rm(path.join(runsDir, entry), { recursive: true, force: true });
      }
    }
  } catch {
    // Directory may not exist
  }
}

describe('Inter-Squad Communication (Story 3.2)', () => {
  let orchestrator;
  let emittedEvents;
  let projectSquadsDir;

  beforeEach(async () => {
    emittedEvents = [];

    // Create mock event store that captures events
    const mockEventStore = {
      append: vi.fn((runId, eventType, data) => {
        emittedEvents.push({ runId, eventType, data });
      }),
    };

    orchestrator = new SquadOrchestrator('.aios-core/.state', {
      eventStore: mockEventStore,
    });

    // Create test squad at project root level (squads/)
    projectSquadsDir = path.join(process.cwd(), 'squads');
    await createSquadFixture(projectSquadsDir, 'test-squad-inter');
  });

  afterEach(async () => {
    // Cleanup test squad fixtures
    try {
      await fs.rm(path.join(projectSquadsDir, 'test-squad-inter'), { recursive: true, force: true });
    } catch {
      // ignore
    }
    // Cleanup .aios-core/squads test fixtures
    try {
      await fs.rm(path.join(process.cwd(), '.aios-core', 'squads', 'test-squad-fallback'), { recursive: true, force: true });
    } catch {
      // ignore
    }
    await cleanupRunDirs();
  });

  // ===== AC7: Path Resolution =====
  describe('AC7: resolveSquadPath', () => {
    test('resolves squad from project root (squads/)', async () => {
      const resolved = await orchestrator.resolveSquadPath('test-squad-inter');
      expect(resolved).toBe(path.join(process.cwd(), 'squads', 'test-squad-inter'));
    });

    test('falls back to .aios-core/squads/ if not at project root', async () => {
      // Create squad in .aios-core/squads/ only
      const aiosCoreSquadsDir = path.join(process.cwd(), '.aios-core', 'squads');
      await createSquadFixture(aiosCoreSquadsDir, 'test-squad-fallback');

      const resolved = await orchestrator.resolveSquadPath('test-squad-fallback');
      expect(resolved).toBe(path.join(process.cwd(), '.aios-core', 'squads', 'test-squad-fallback'));
    });

    test('throws error when squad not found in any location', async () => {
      await expect(
        orchestrator.resolveSquadPath('non-existent-squad')
      ).rejects.toThrow(/Squad not found: non-existent-squad/);
    });

    test('prefers project root over .aios-core fallback', async () => {
      // Create squad in both locations
      const aiosCoreSquadsDir = path.join(process.cwd(), '.aios-core', 'squads');
      await createSquadFixture(aiosCoreSquadsDir, 'test-squad-inter');

      const resolved = await orchestrator.resolveSquadPath('test-squad-inter');
      // Should resolve to project root
      expect(resolved).toBe(path.join(process.cwd(), 'squads', 'test-squad-inter'));

      // Cleanup .aios-core copy
      await fs.rm(path.join(aiosCoreSquadsDir, 'test-squad-inter'), { recursive: true, force: true });
    });
  });

  // ===== AC1: executeSquad =====
  describe('AC1: executeSquad', () => {
    test('creates run with inter_squad trigger type', async () => {
      const result = await orchestrator.executeSquad('test-squad-inter', {
        pipelineName: 'creative-pipeline',
        trigger: {
          caller: 'squad-trafego',
          parentRunId: 'parent-run-001',
          callerStepId: 'step-invoke-copy',
        },
      });

      expect(result.runId).toBeDefined();
      expect(result.squadId).toBe('test-squad-inter');
      expect(result.status).toBe('running');

      // Verify state file has inter_squad metadata
      const state = await orchestrator.getRunState(result.runId);
      expect(state.trigger.type).toBe('inter_squad');
      expect(state.inter_squad).toBeDefined();
      expect(state.inter_squad.parentRunId).toBe('parent-run-001');
      expect(state.inter_squad.callerSquadId).toBe('squad-trafego');
      expect(state.inter_squad.callerStepId).toBe('step-invoke-copy');
    });

    test('returns { runId, squadId, status: "running" }', async () => {
      const result = await orchestrator.executeSquad('test-squad-inter');

      expect(result).toHaveProperty('runId');
      expect(result).toHaveProperty('squadId', 'test-squad-inter');
      expect(result).toHaveProperty('status', 'running');
      expect(Object.keys(result)).toHaveLength(3);
    });

    test('uses default pipeline name when not specified', async () => {
      const result = await orchestrator.executeSquad('test-squad-inter');

      const state = await orchestrator.getRunState(result.runId);
      expect(state.pipelineName).toBe('creative-pipeline');
    });

    test('stores trigger data with falsy fields when not provided', async () => {
      const result = await orchestrator.executeSquad('test-squad-inter');

      const state = await orchestrator.getRunState(result.runId);
      // YAML serialization may omit null fields — check they're falsy
      expect(state.trigger.caller).toBeFalsy();
      expect(state.trigger.parentRunId).toBeFalsy();
      expect(state.trigger.callerStepId).toBeFalsy();
    });
  });

  // ===== AC2: waitForCompletion =====
  describe('AC2: waitForCompletion', () => {
    test('returns completed status when run finishes', async () => {
      const run = await orchestrator.executeSquad('test-squad-inter');

      // Complete the run manually
      await orchestrator.completeRun(run.runId, 'completed', {
        duration_ms: 5000,
        outputs_path: `.aios/squad-runs/${run.runId}/outputs`,
      });

      const result = await orchestrator.waitForCompletion(run.runId, {
        pollInterval: 10,
        timeout: 1000,
      });

      expect(result.status).toBe('completed');
      expect(result.duration_ms).toBeDefined();
      expect(result.outputs_path).toContain(run.runId);
    });

    test('throws InterSquadTimeoutError when timeout exceeded', async () => {
      const run = await orchestrator.executeSquad('test-squad-inter');

      // Do NOT complete the run — it will stay "running"
      await expect(
        orchestrator.waitForCompletion(run.runId, {
          pollInterval: 10,
          timeout: 50,
        })
      ).rejects.toThrow(InterSquadTimeoutError);
    });

    test('throws InterSquadRunError when run fails', async () => {
      const run = await orchestrator.executeSquad('test-squad-inter');

      // Mark run as failed
      await orchestrator.completeRun(run.runId, 'failed', {
        error: 'Task execution failed',
      });

      await expect(
        orchestrator.waitForCompletion(run.runId, {
          pollInterval: 10,
          timeout: 1000,
        })
      ).rejects.toThrow(InterSquadRunError);
    });

    test('throws InterSquadRunError when run is aborted', async () => {
      const run = await orchestrator.executeSquad('test-squad-inter');

      await orchestrator.completeRun(run.runId, 'aborted');

      await expect(
        orchestrator.waitForCompletion(run.runId, {
          pollInterval: 10,
          timeout: 1000,
        })
      ).rejects.toThrow(InterSquadRunError);
    });

    test('throws InterSquadRunError when run state not found', async () => {
      await expect(
        orchestrator.waitForCompletion('nonexistent-run-id', {
          pollInterval: 10,
          timeout: 100,
        })
      ).rejects.toThrow(InterSquadRunError);
    });
  });

  // ===== AC3: getOutputs =====
  describe('AC3: getOutputs', () => {
    test('returns output manifest for completed run', async () => {
      const run = await orchestrator.executeSquad('test-squad-inter');

      // Create outputs directory with files
      const outputsDir = path.join(process.cwd(), '.aios', 'squad-runs', run.runId, 'outputs');
      await fs.mkdir(outputsDir, { recursive: true });
      await fs.writeFile(path.join(outputsDir, 'result.json'), '{"data": true}', 'utf8');
      await fs.writeFile(path.join(outputsDir, 'report.md'), '# Report', 'utf8');

      // Complete the run
      await orchestrator.completeRun(run.runId, 'completed', {
        duration_ms: 3000,
      });

      const outputs = await orchestrator.getOutputs(run.runId);

      expect(outputs).not.toBeNull();
      expect(outputs.runId).toBe(run.runId);
      expect(outputs.squadId).toBe('test-squad-inter');
      expect(outputs.status).toBe('completed');
      expect(outputs.files).toHaveLength(2);

      const fileNames = outputs.files.map((f) => f.path);
      expect(fileNames).toContain('outputs/result.json');
      expect(fileNames).toContain('outputs/report.md');

      // Check file types
      const jsonFile = outputs.files.find((f) => f.path === 'outputs/result.json');
      expect(jsonFile.type).toBe('json');
      expect(jsonFile.size).toBeGreaterThan(0);
    });

    test('returns null for running (non-completed) run', async () => {
      const run = await orchestrator.executeSquad('test-squad-inter');

      const outputs = await orchestrator.getOutputs(run.runId);
      expect(outputs).toBeNull();
    });

    test('returns null for nonexistent run', async () => {
      const outputs = await orchestrator.getOutputs('nonexistent-run');
      expect(outputs).toBeNull();
    });

    test('returns empty files array when outputs directory is empty', async () => {
      const run = await orchestrator.executeSquad('test-squad-inter');

      // Create empty outputs directory
      const outputsDir = path.join(process.cwd(), '.aios', 'squad-runs', run.runId, 'outputs');
      await fs.mkdir(outputsDir, { recursive: true });

      await orchestrator.completeRun(run.runId, 'completed');

      const outputs = await orchestrator.getOutputs(run.runId);
      expect(outputs.files).toEqual([]);
    });

    test('returns empty files when outputs directory does not exist', async () => {
      const run = await orchestrator.executeSquad('test-squad-inter');
      await orchestrator.completeRun(run.runId, 'completed');

      const outputs = await orchestrator.getOutputs(run.runId);
      expect(outputs.files).toEqual([]);
    });

    test('includes metadata with completed_at and duration_ms', async () => {
      const run = await orchestrator.executeSquad('test-squad-inter');
      await orchestrator.completeRun(run.runId, 'completed', { duration_ms: 7500 });

      const outputs = await orchestrator.getOutputs(run.runId);
      expect(outputs.metadata).toBeDefined();
      expect(outputs.metadata.completed_at).toBeDefined();
      expect(outputs.metadata.duration_ms).toBe(7500);
    });
  });

  // ===== AC4: Inter-Squad Logging =====
  describe('AC4: Inter-squad event logging', () => {
    test('emits inter_squad.call on executeSquad', async () => {
      await orchestrator.executeSquad('test-squad-inter', {
        trigger: {
          caller: 'squad-trafego',
          parentRunId: 'parent-123',
          callerStepId: 'step-call-copy',
        },
      });

      const callEvents = emittedEvents.filter((e) => e.eventType === 'inter_squad.call');
      expect(callEvents).toHaveLength(1);
      expect(callEvents[0].data.callerSquadId).toBe('squad-trafego');
      expect(callEvents[0].data.calleeSquadId).toBe('test-squad-inter');
      expect(callEvents[0].data.parentRunId).toBe('parent-123');
    });

    test('emits inter_squad.completed on successful waitForCompletion', async () => {
      const run = await orchestrator.executeSquad('test-squad-inter');
      await orchestrator.completeRun(run.runId, 'completed');

      await orchestrator.waitForCompletion(run.runId, {
        pollInterval: 10,
        timeout: 1000,
      });

      const completedEvents = emittedEvents.filter((e) => e.eventType === 'inter_squad.completed');
      expect(completedEvents).toHaveLength(1);
      expect(completedEvents[0].data.runId).toBe(run.runId);
      expect(completedEvents[0].data.duration_ms).toBeDefined();
    });

    test('emits inter_squad.timeout on timeout', async () => {
      const run = await orchestrator.executeSquad('test-squad-inter');

      try {
        await orchestrator.waitForCompletion(run.runId, {
          pollInterval: 10,
          timeout: 30,
        });
      } catch {
        // Expected timeout
      }

      const timeoutEvents = emittedEvents.filter((e) => e.eventType === 'inter_squad.timeout');
      expect(timeoutEvents).toHaveLength(1);
      expect(timeoutEvents[0].data.timeout_ms).toBe(30);
    });

    test('emits inter_squad.error on run failure', async () => {
      const run = await orchestrator.executeSquad('test-squad-inter');
      await orchestrator.completeRun(run.runId, 'failed', { error: 'Step X crashed' });

      try {
        await orchestrator.waitForCompletion(run.runId, {
          pollInterval: 10,
          timeout: 1000,
        });
      } catch {
        // Expected error
      }

      const errorEvents = emittedEvents.filter((e) => e.eventType === 'inter_squad.error');
      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0].data.status).toBe('failed');
      expect(errorEvents[0].data.error).toBe('Step X crashed');
    });

    test('inter_squad event types are registered in EVENT_TYPES', () => {
      expect(EVENT_TYPES).toContain('inter_squad.call');
      expect(EVENT_TYPES).toContain('inter_squad.completed');
      expect(EVENT_TYPES).toContain('inter_squad.timeout');
      expect(EVENT_TYPES).toContain('inter_squad.error');
    });
  });

  // ===== AC6: executeAndWait =====
  describe('AC6: executeAndWait', () => {
    test('chains executeSquad + waitForCompletion + getOutputs', async () => {
      // We need to complete the run asynchronously
      // Use a short poll interval and complete the run before first poll
      const executePromise = orchestrator.executeSquad('test-squad-inter');
      const run = await executePromise;

      // Create outputs
      const outputsDir = path.join(process.cwd(), '.aios', 'squad-runs', run.runId, 'outputs');
      await fs.mkdir(outputsDir, { recursive: true });
      await fs.writeFile(path.join(outputsDir, 'output.txt'), 'done', 'utf8');

      // Complete the run
      await orchestrator.completeRun(run.runId, 'completed', { duration_ms: 100 });

      // Now call waitForCompletion directly (since executeAndWait calls executeSquad internally)
      const completion = await orchestrator.waitForCompletion(run.runId, {
        pollInterval: 10,
        timeout: 1000,
      });

      expect(completion.status).toBe('completed');

      const outputs = await orchestrator.getOutputs(run.runId);
      expect(outputs.files).toHaveLength(1);
      expect(outputs.files[0].path).toBe('outputs/output.txt');
    });

    test('propagates InterSquadTimeoutError from waitForCompletion', async () => {
      // Mock executeSquad to control the flow
      const originalExecuteSquad = orchestrator.executeSquad.bind(orchestrator);

      orchestrator.executeSquad = async (squadId, options) => {
        const result = await originalExecuteSquad(squadId, options);
        // Don't complete the run — it stays running → timeout
        return result;
      };

      await expect(
        orchestrator.executeAndWait('test-squad-inter', {
          pollInterval: 10,
          timeout: 50,
        })
      ).rejects.toThrow(InterSquadTimeoutError);
    });

    test('propagates InterSquadRunError when callee fails', async () => {
      const originalExecuteSquad = orchestrator.executeSquad.bind(orchestrator);

      orchestrator.executeSquad = async (squadId, options) => {
        const result = await originalExecuteSquad(squadId, options);
        // Mark as failed immediately
        await orchestrator.completeRun(result.runId, 'failed', {
          error: 'Callee squad failed',
        });
        return result;
      };

      await expect(
        orchestrator.executeAndWait('test-squad-inter', {
          pollInterval: 10,
          timeout: 1000,
        })
      ).rejects.toThrow(InterSquadRunError);
    });

    test('returns { runId, status, duration_ms, outputs }', async () => {
      const originalExecuteSquad = orchestrator.executeSquad.bind(orchestrator);

      let capturedRunId;
      orchestrator.executeSquad = async (squadId, options) => {
        const result = await originalExecuteSquad(squadId, options);
        capturedRunId = result.runId;
        // Complete immediately
        await orchestrator.completeRun(result.runId, 'completed', { duration_ms: 42 });
        return result;
      };

      const result = await orchestrator.executeAndWait('test-squad-inter', {
        pollInterval: 10,
        timeout: 1000,
      });

      expect(result.runId).toBe(capturedRunId);
      expect(result.status).toBe('completed');
      expect(result.duration_ms).toBeDefined();
      expect(result.outputs).toBeDefined();
      expect(result.outputs.runId).toBe(capturedRunId);
    });
  });

  // ===== Error Classes =====
  describe('Error classes', () => {
    test('InterSquadTimeoutError has correct properties', () => {
      const err = new InterSquadTimeoutError('run-123', 30000);
      expect(err.name).toBe('InterSquadTimeoutError');
      expect(err.runId).toBe('run-123');
      expect(err.timeoutMs).toBe(30000);
      expect(err.message).toContain('timed out');
      expect(err.message).toContain('30000ms');
      expect(err.message).toContain('run-123');
      expect(err instanceof Error).toBe(true);
    });

    test('InterSquadRunError has correct properties', () => {
      const err = new InterSquadRunError('run-456', 'failed', 'Step X crashed');
      expect(err.name).toBe('InterSquadRunError');
      expect(err.runId).toBe('run-456');
      expect(err.status).toBe('failed');
      expect(err.originalError).toBe('Step X crashed');
      expect(err.message).toContain('run-456');
      expect(err.message).toContain('failed');
      expect(err instanceof Error).toBe(true);
    });

    test('InterSquadRunError works without error message', () => {
      const err = new InterSquadRunError('run-789', 'aborted');
      expect(err.originalError).toBeNull();
      expect(err.message).toContain('run-789');
      expect(err.message).toContain('aborted');
    });
  });
});

// ===== AC7: TaskExecutor path resolution =====
describe('TaskExecutor path resolution (Story 3.2 AC7)', () => {
  const TaskExecutor = require('../task-executor');
  let executor;

  beforeEach(() => {
    executor = new TaskExecutor();
  });

  test('loads task from project root squads/ first', async () => {
    // Create task file at project root
    const taskDir = path.join(process.cwd(), 'squads', 'test-squad-te', 'tasks');
    await fs.mkdir(taskDir, { recursive: true });
    await fs.writeFile(path.join(taskDir, 'sample-task.md'), '# Sample Task', 'utf8');

    const result = await executor.loadTaskFile('test-squad-te', 'sample-task');
    expect(result.name).toBe('sample-task');
    expect(result.content).toBe('# Sample Task');
    expect(result.path).toContain(path.join('squads', 'test-squad-te', 'tasks'));

    // Cleanup
    await fs.rm(path.join(process.cwd(), 'squads', 'test-squad-te'), { recursive: true, force: true });
  });

  test('falls back to .aios-core/squads/ when not at project root', async () => {
    // Create task file in .aios-core only
    const taskDir = path.join(process.cwd(), '.aios-core', 'squads', 'test-squad-te-fb', 'tasks');
    await fs.mkdir(taskDir, { recursive: true });
    await fs.writeFile(path.join(taskDir, 'fallback-task.md'), '# Fallback', 'utf8');

    const result = await executor.loadTaskFile('test-squad-te-fb', 'fallback-task');
    expect(result.name).toBe('fallback-task');
    expect(result.content).toBe('# Fallback');
    expect(result.path).toContain(path.join('.aios-core', 'squads', 'test-squad-te-fb', 'tasks'));

    // Cleanup
    await fs.rm(path.join(process.cwd(), '.aios-core', 'squads', 'test-squad-te-fb'), { recursive: true, force: true });
  });

  test('throws error when task not found in any location', async () => {
    await expect(
      executor.loadTaskFile('nonexistent-squad', 'nonexistent-task')
    ).rejects.toThrow(/Task file not found/);
  });
});
