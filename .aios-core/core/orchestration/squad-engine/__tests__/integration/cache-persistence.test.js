/**
 * Idempotency Cache - Integration Tests
 * Story 2.2: Idempotency Keys — Evitar Execução Duplicada
 *
 * Tests cache integration with TaskExecutor and persistence via StateManager
 */

const path = require('path');
const fs = require('fs').promises;
const TaskExecutor = require('../../task-executor');
const { IdempotencyCache } = require('../../idempotency-cache');
const { EventStore } = require('../../event-store');
const { StateManager } = require('../../state-manager');
const PureTaskRunner = require('../../task-types/pure-task-runner');

describe('Idempotency Cache Integration', () => {
  let executor;
  let cache;
  let eventStore;
  let testRunsDir;

  beforeEach(async () => {
    testRunsDir = path.join(__dirname, '.test-cache-integration-runs');
    eventStore = new EventStore(testRunsDir);
    cache = new IdempotencyCache();
    executor = new TaskExecutor({ eventStore, idempotencyCache: cache });
    await fs.mkdir(testRunsDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testRunsDir, { recursive: true, force: true });
    } catch {
      // Ignora
    }
  });

  describe('TaskExecutor with IdempotencyCache', () => {
    // Mock PureTaskRunner.getTaskMap to provide test tasks
    const mockTaskMap = {
      'generate-text': async (input) => ({ text: `Generated: ${input.prompt}`, timestamp: Date.now() }),
      'fetch-data': async (input) => ({ data: `Data for ${input.id}`, fetched: true }),
    };

    beforeEach(() => {
      vi.spyOn(PureTaskRunner.prototype, 'getTaskMap').mockReturnValue(mockTaskMap);
      // Mock loadTaskFile to avoid filesystem access
      vi.spyOn(TaskExecutor.prototype, 'loadTaskFile').mockImplementation(async (squadName, taskName) => ({
        name: taskName,
        content: `# ${taskName}`,
        path: `squads/${squadName}/tasks/${taskName}.md`,
      }));
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    test('should execute task on cache miss and store result', async () => {
      const step = {
        id: 'gen-text',
        type: 'task_pura',
        task: 'generate-text',
        input: { prompt: 'hello' },
      };

      const result = await executor.executeTask(step, {}, 'test-squad', 'run-cache-1');

      expect(result.output.text).toBe('Generated: hello');
      expect(result.metadata.cacheHit).toBeUndefined(); // Not a cache hit
      expect(cache.size).toBe(1);
    });

    test('should return cached result on cache hit', async () => {
      const step = {
        id: 'gen-text',
        type: 'task_pura',
        task: 'generate-text',
        input: { prompt: 'hello' },
      };

      // First execution — cache miss
      const result1 = await executor.executeTask(step, {}, 'test-squad', 'run-cache-2');
      const firstTimestamp = result1.output.timestamp;

      // Second execution — cache hit (should return same result)
      const result2 = await executor.executeTask(step, {}, 'test-squad', 'run-cache-2');

      expect(result2.output.text).toBe('Generated: hello');
      expect(result2.output.timestamp).toBe(firstTimestamp); // Same result, not re-executed
      expect(result2.metadata.cacheHit).toBe(true);
    });

    test('should generate different cache keys for different inputs', async () => {
      const step1 = {
        id: 'gen-text',
        type: 'task_pura',
        task: 'generate-text',
        input: { prompt: 'hello' },
      };

      const step2 = {
        id: 'gen-text',
        type: 'task_pura',
        task: 'generate-text',
        input: { prompt: 'world' },
      };

      await executor.executeTask(step1, {}, 'test-squad', 'run-cache-3');
      await executor.executeTask(step2, {}, 'test-squad', 'run-cache-3');

      // Both should be cached (different keys)
      expect(cache.size).toBe(2);
    });

    test('should bypass cache when force_execute is true', async () => {
      const step = {
        id: 'gen-text',
        type: 'task_pura',
        task: 'generate-text',
        input: { prompt: 'hello' },
        force_execute: true,
      };

      // First execution
      const result1 = await executor.executeTask(step, {}, 'test-squad', 'run-cache-4');

      // Small delay to ensure Date.now() differs
      await new Promise(r => setTimeout(r, 2));

      // Second execution with force_execute — should NOT use cache
      const result2 = await executor.executeTask(step, {}, 'test-squad', 'run-cache-4');

      // Should not be a cache hit (force_execute bypasses cache)
      expect(result2.metadata.cacheHit).toBeUndefined();
      // Timestamps should differ (re-executed)
      expect(result2.output.timestamp).not.toBe(result1.output.timestamp);
    });

    test('should work without cache (backward compatible)', async () => {
      const noCacheExecutor = new TaskExecutor({ eventStore });
      const step = {
        id: 'gen-text',
        type: 'task_pura',
        task: 'generate-text',
        input: { prompt: 'hello' },
      };

      const result = await noCacheExecutor.executeTask(step, {}, 'test-squad', 'run-cache-5');
      expect(result.output.text).toBe('Generated: hello');
    });

    test('should emit step.cache_hit event on cache hit', async () => {
      const step = {
        id: 'gen-text',
        type: 'task_pura',
        task: 'generate-text',
        input: { prompt: 'hello' },
      };

      // First execution (miss)
      await executor.executeTask(step, {}, 'test-squad', 'run-cache-events');

      // Second execution (hit)
      await executor.executeTask(step, {}, 'test-squad', 'run-cache-events');

      const events = await eventStore.getEvents('run-cache-events');
      const cacheHitEvents = events.filter(e => e.event === 'step.cache_hit');

      expect(cacheHitEvents).toHaveLength(1);
      expect(cacheHitEvents[0].data.stepId).toBe('gen-text');
      expect(cacheHitEvents[0].data.idempotencyKey).toMatch(/^[a-f0-9]{64}$/);
      expect(cacheHitEvents[0].data.cached_at).toBeDefined();
    });

    test('should not emit step.cache_hit on cache miss', async () => {
      const step = {
        id: 'gen-text',
        type: 'task_pura',
        task: 'generate-text',
        input: { prompt: 'unique-input' },
      };

      await executor.executeTask(step, {}, 'test-squad', 'run-cache-no-hit');

      const events = await eventStore.getEvents('run-cache-no-hit');
      const cacheHitEvents = events.filter(e => e.event === 'step.cache_hit');
      expect(cacheHitEvents).toHaveLength(0);
    });
  });

  describe('Cache persistence across pause/resume', () => {
    let stateManager;
    let testStateDir;

    beforeEach(async () => {
      testStateDir = path.join(__dirname, '.test-cache-state');
      stateManager = new StateManager(testStateDir, { eventStore });
      await fs.mkdir(testStateDir, { recursive: true });
    });

    afterEach(async () => {
      try {
        await fs.rm(testStateDir, { recursive: true, force: true });
      } catch {
        // Ignora
      }
    });

    test('should serialize cache state and restore after pause/resume', async () => {
      // Populate cache
      cache.set('key1', { output: 'result1' });
      cache.set('key2', { output: 'result2' });

      // Simulate pause: save state with cache data
      const runId = 'run-persist-1';
      const state = {
        squadId: 'test-squad',
        currentTask: 'step-3',
        currentTaskIndex: 2,
        completedTasks: ['step-1', 'step-2'],
        pendingTasks: ['step-3', 'step-4'],
        context: {},
        cache: cache.serialize(), // Include serialized cache
      };

      await stateManager.pause(runId, state);

      // Simulate resume: load state and restore cache
      const loadedState = await stateManager.resume(runId);
      expect(loadedState.cache).toBeDefined();

      const restoredCache = IdempotencyCache.restore(loadedState.cache);
      expect(restoredCache.get('key1')).toEqual({ output: 'result1' });
      expect(restoredCache.get('key2')).toEqual({ output: 'result2' });
    });

    test('should discard expired entries on restore', async () => {
      // Create a cache with entries at different TTLs
      const shortCache = new IdempotencyCache(1000, 1); // 1ms TTL

      shortCache.set('expired-key', 'will-expire', 1);
      const longLivedData = {
        maxEntries: 1000,
        defaultTTL: 86400000,
        entries: [
          { key: 'alive', result: 'yes', cachedAt: Date.now(), expiresAt: Date.now() + 86400000 },
          { key: 'dead', result: 'no', cachedAt: Date.now() - 10000, expiresAt: Date.now() - 1 },
        ],
      };

      const restoredCache = IdempotencyCache.restore(longLivedData);
      expect(restoredCache.get('alive')).toBe('yes');
      expect(restoredCache.get('dead')).toBeNull();
      expect(restoredCache.size).toBe(1);
    });

    test('should include cache in state checksum', async () => {
      const runId = 'run-checksum-1';
      const state = {
        squadId: 'test-squad',
        currentTask: 'step-1',
        currentTaskIndex: 0,
        completedTasks: [],
        pendingTasks: ['step-1'],
        context: {},
        cache: cache.serialize(),
      };

      await stateManager.pause(runId, state);

      // Load and verify integrity passes (checksum includes cache field)
      const loadedState = await stateManager.resume(runId);
      expect(loadedState.cache).toBeDefined();
    });
  });
});
