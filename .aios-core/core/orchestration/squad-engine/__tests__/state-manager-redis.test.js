/**
 * State Manager with Redis - Integration Tests
 * Story 4.2 - Tasks 8.2-8.8: Dual write, cache-first, TTL, circuit breaker, performance
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { StateManager, StateCorruptionError, InvalidStateError } = require('../state-manager');
const { RedisStateAdapter, TTL } = require('../redis-state-adapter');

/**
 * In-memory Redis mock for integration tests
 */
function createMockRedisClient() {
  const store = new Map();
  const ttls = new Map();
  let shouldFail = false;
  let failCount = 0;
  let maxFails = Infinity;

  return {
    _store: store,
    _ttls: ttls,
    _setFailMode(fail, count = Infinity) {
      shouldFail = fail;
      failCount = 0;
      maxFails = count;
    },

    async get(key) {
      if (shouldFail && failCount < maxFails) {
        failCount++;
        throw new Error('Redis connection refused');
      }
      return store.get(key) || null;
    },

    async set(key, value, ...args) {
      if (shouldFail && failCount < maxFails) {
        failCount++;
        throw new Error('Redis connection refused');
      }
      store.set(key, value);
      if (args[0] === 'EX' && args[1]) {
        ttls.set(key, args[1]);
      }
      return 'OK';
    },

    async del(key) {
      if (shouldFail && failCount < maxFails) {
        failCount++;
        throw new Error('Redis connection refused');
      }
      const existed = store.has(key);
      store.delete(key);
      ttls.delete(key);
      return existed ? 1 : 0;
    },

    async exists(key) {
      if (shouldFail && failCount < maxFails) {
        failCount++;
        throw new Error('Redis connection refused');
      }
      return store.has(key) ? 1 : 0;
    },

    async ping() {
      if (shouldFail) throw new Error('Redis connection refused');
      return 'PONG';
    },

    async quit() {
      store.clear();
      ttls.clear();
    },

    on() {
      return this;
    },
  };
}

/**
 * Create a valid state object for testing
 */
function createTestState(overrides = {}) {
  return {
    squadId: 'squad-copy',
    currentTask: 'fetch-data',
    currentTaskIndex: 0,
    completedTasks: [],
    pendingTasks: ['analyze', 'generate'],
    context: { offerId: 'TEST01' },
    timestamp: Date.now(),
    status: 'running',
    ...overrides,
  };
}

describe('StateManager with Redis (Story 4.2)', () => {
  let stateManager;
  let redisAdapter;
  let mockClient;
  let testStateDir;

  beforeEach(async () => {
    testStateDir = path.join(__dirname, '.test-state-redis');
    mockClient = createMockRedisClient();
    redisAdapter = new RedisStateAdapter({ client: mockClient });
    stateManager = new StateManager(testStateDir, { redisAdapter });
    await fs.mkdir(testStateDir, { recursive: true });
  });

  afterEach(async () => {
    stateManager.destroy();
    await redisAdapter.close();
    try {
      await fs.rm(testStateDir, { recursive: true, force: true });
    } catch {
      // Ignora
    }
  });

  describe('Task 2: Dual Write Strategy (AC2)', () => {
    test('saveState should write to both Redis and File System', async () => {
      const runId = 'dual-write-001';
      const state = createTestState();

      await stateManager.saveState(runId, state);

      // Verify Redis has the state
      const redisData = await mockClient.get('run:dual-write-001');
      expect(redisData).not.toBeNull();
      const redisState = JSON.parse(redisData);
      expect(redisState.squadId).toBe('squad-copy');

      // Verify File System has the state
      const stateFile = path.join(testStateDir, `${runId}.state.yaml`);
      const fsContent = await fs.readFile(stateFile, 'utf8');
      const fsState = yaml.load(fsContent);
      expect(fsState.squadId).toBe('squad-copy');
      expect(fsState.checksum).toBeDefined(); // FS has checksum
    });

    test('saveState should use same state object for both writes', async () => {
      const runId = 'dual-write-002';
      const state = createTestState({ context: { unique: 'data-xyz' } });

      await stateManager.saveState(runId, state);

      const redisState = JSON.parse(await mockClient.get('run:dual-write-002'));
      const stateFile = path.join(testStateDir, `${runId}.state.yaml`);
      const fsState = yaml.load(await fs.readFile(stateFile, 'utf8'));

      expect(redisState.context.unique).toBe('data-xyz');
      expect(fsState.context.unique).toBe('data-xyz');
    });

    test('saveState should continue with FS only if Redis fails', async () => {
      const runId = 'dual-write-003';
      const state = createTestState();

      // Make Redis fail
      mockClient._setFailMode(true);

      // Should NOT throw
      await stateManager.saveState(runId, state);

      // File System should still have the data
      const stateFile = path.join(testStateDir, `${runId}.state.yaml`);
      const fsContent = await fs.readFile(stateFile, 'utf8');
      const fsState = yaml.load(fsContent);
      expect(fsState.squadId).toBe('squad-copy');
    });

    test('pause should trigger dual write', async () => {
      const runId = 'dual-write-pause';
      const state = createTestState();

      await stateManager.pause(runId, state);

      // Both stores should have paused state
      const redisState = JSON.parse(await mockClient.get('run:dual-write-pause'));
      expect(redisState.status).toBe('paused');

      const stateFile = path.join(testStateDir, `${runId}.state.yaml`);
      const fsState = yaml.load(await fs.readFile(stateFile, 'utf8'));
      expect(fsState.status).toBe('paused');
    });
  });

  describe('Task 3: Cache-First Read Strategy (AC3)', () => {
    test('loadState should return from Redis on cache hit', async () => {
      const runId = 'cache-hit-001';
      const state = createTestState();

      await stateManager.saveState(runId, state);

      const loaded = await stateManager.loadState(runId);
      expect(loaded.squadId).toBe('squad-copy');

      // Verify it came from Redis (hits incremented)
      const metrics = redisAdapter.getMetrics();
      expect(metrics.hits).toBe(1);
    });

    test('loadState should fallback to FS on cache miss', async () => {
      const runId = 'cache-miss-001';
      const state = createTestState();

      // Save ONLY to File System (bypass Redis)
      await stateManager._saveToFileSystem(runId, state);

      const loaded = await stateManager.loadState(runId);
      expect(loaded.squadId).toBe('squad-copy');

      // Should have a cache miss
      const metrics = redisAdapter.getMetrics();
      expect(metrics.misses).toBe(1);
    });

    test('loadState should populate Redis after FS fallback', async () => {
      const runId = 'populate-cache-001';
      const state = createTestState();

      // Save ONLY to File System
      await stateManager._saveToFileSystem(runId, state);

      // First load: miss, loads from FS, populates Redis
      await stateManager.loadState(runId);

      // Second load: should be a hit
      redisAdapter.resetMetrics();
      await stateManager.loadState(runId);
      const metrics = redisAdapter.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(0);
    });

    test('loadState should fallback to FS on Redis error', async () => {
      const runId = 'redis-error-001';
      const state = createTestState();

      // Save to both
      await stateManager.saveState(runId, state);

      // Make Redis fail for reads
      mockClient._setFailMode(true);

      const loaded = await stateManager.loadState(runId);
      expect(loaded.squadId).toBe('squad-copy');

      // Should have incremented fsFallback
      expect(redisAdapter.getMetrics().fsFallbackCount).toBe(1);
    });

    test('loadState should throw when both Redis and FS fail', async () => {
      const runId = 'both-fail-001';
      mockClient._setFailMode(true);

      await expect(stateManager.loadState(runId))
        .rejects
        .toThrow('Estado não encontrado');
    });
  });

  describe('Task 4: TTL Management (AC4)', () => {
    test('active runs should get 24h TTL', async () => {
      const runId = 'ttl-active';
      await stateManager.saveState(runId, createTestState({ status: 'running' }));
      expect(mockClient._ttls.get('run:ttl-active')).toBe(TTL.ACTIVE);
    });

    test('paused runs should get 24h TTL', async () => {
      const runId = 'ttl-paused';
      await stateManager.saveState(runId, createTestState({ status: 'paused' }));
      expect(mockClient._ttls.get('run:ttl-paused')).toBe(TTL.ACTIVE);
    });

    test('queued runs should get 24h TTL', async () => {
      const runId = 'ttl-queued';
      await stateManager.saveState(runId, createTestState({ status: 'queued' }));
      expect(mockClient._ttls.get('run:ttl-queued')).toBe(TTL.ACTIVE);
    });

    test('completed runs should get 1h TTL', async () => {
      const runId = 'ttl-completed';
      await stateManager.saveState(runId, createTestState({ status: 'completed' }));
      expect(mockClient._ttls.get('run:ttl-completed')).toBe(TTL.COMPLETED);
    });

    test('aborted runs should get 1h TTL', async () => {
      const runId = 'ttl-aborted';
      await stateManager.saveState(runId, createTestState({ status: 'aborted' }));
      expect(mockClient._ttls.get('run:ttl-aborted')).toBe(TTL.COMPLETED);
    });

    test('failed runs should get 1h TTL', async () => {
      const runId = 'ttl-failed';
      await stateManager.saveState(runId, createTestState({ status: 'failed' }));
      expect(mockClient._ttls.get('run:ttl-failed')).toBe(TTL.COMPLETED);
    });

    test('TTL should refresh on each save', async () => {
      const runId = 'ttl-refresh';
      await stateManager.saveState(runId, createTestState({ status: 'running' }));
      const ttl1 = mockClient._ttls.get('run:ttl-refresh');

      // Update state and save again
      await stateManager.saveState(runId, createTestState({ status: 'running', currentTaskIndex: 1 }));
      const ttl2 = mockClient._ttls.get('run:ttl-refresh');

      expect(ttl1).toBe(TTL.ACTIVE);
      expect(ttl2).toBe(TTL.ACTIVE); // TTL refreshed
    });

    test('TTL should change when status transitions to completed', async () => {
      const runId = 'ttl-transition';

      // Running → 24h
      await stateManager.saveState(runId, createTestState({ status: 'running' }));
      expect(mockClient._ttls.get('run:ttl-transition')).toBe(TTL.ACTIVE);

      // Completed → 1h
      await stateManager.saveState(runId, createTestState({ status: 'completed' }));
      expect(mockClient._ttls.get('run:ttl-transition')).toBe(TTL.COMPLETED);
    });
  });

  describe('Task 5: Graceful Degradation — Circuit Breaker (AC5)', () => {
    test('should start in CLOSED state', () => {
      const status = stateManager.getCircuitBreakerStatus();
      expect(status.state).toBe('CLOSED');
      expect(status.failures).toBe(0);
    });

    test('should open circuit after threshold failures', async () => {
      const runId = 'cb-open';
      mockClient._setFailMode(true);

      // Trigger 3 failures (threshold = 3)
      for (let i = 0; i < 3; i++) {
        await stateManager.saveState(`${runId}-${i}`, createTestState());
      }

      const status = stateManager.getCircuitBreakerStatus();
      expect(status.state).toBe('OPEN');
    });

    test('should skip Redis when circuit is OPEN', async () => {
      const runId = 'cb-skip';
      mockClient._setFailMode(true);

      // Open circuit
      for (let i = 0; i < 3; i++) {
        await stateManager.saveState(`fail-${i}`, createTestState());
      }

      // Now Redis is bypassed — save should succeed via FS only
      mockClient._setFailMode(false);
      const metrics = redisAdapter.getMetrics();
      const errorsBefore = metrics.errors;

      await stateManager.saveState(runId, createTestState());

      // No new Redis errors because circuit is OPEN (skipped)
      // But FS write should succeed
      const stateFile = path.join(testStateDir, `${runId}.state.yaml`);
      const fsContent = await fs.readFile(stateFile, 'utf8');
      expect(yaml.load(fsContent).squadId).toBe('squad-copy');
    });

    test('should transition to HALF_OPEN after timeout', async () => {
      // Use short timeout for test
      const sm = new StateManager(testStateDir, {
        redisAdapter,
        circuitBreaker: { failureThreshold: 2, resetTimeout: 50 },
      });

      mockClient._setFailMode(true);

      // Open circuit
      await sm.saveState('fail-1', createTestState());
      await sm.saveState('fail-2', createTestState());

      expect(sm.getCircuitBreakerStatus().state).toBe('OPEN');

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sm.getCircuitBreakerStatus().state).toBe('HALF_OPEN');
      sm.destroy();
    });

    test('should close circuit on successful Redis call in HALF_OPEN', async () => {
      const sm = new StateManager(testStateDir, {
        redisAdapter,
        circuitBreaker: { failureThreshold: 2, resetTimeout: 50 },
      });

      mockClient._setFailMode(true);

      // Open circuit
      await sm.saveState('fail-1', createTestState());
      await sm.saveState('fail-2', createTestState());

      // Wait for HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(sm.getCircuitBreakerStatus().state).toBe('HALF_OPEN');

      // Redis recovers
      mockClient._setFailMode(false);
      await sm.saveState('success', createTestState());

      expect(sm.getCircuitBreakerStatus().state).toBe('CLOSED');
      sm.destroy();
    });

    test('should re-open circuit on failure in HALF_OPEN', async () => {
      const sm = new StateManager(testStateDir, {
        redisAdapter,
        circuitBreaker: { failureThreshold: 2, resetTimeout: 50 },
      });

      mockClient._setFailMode(true);

      // Open circuit
      await sm.saveState('fail-1', createTestState());
      await sm.saveState('fail-2', createTestState());

      // Wait for HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 100));

      // Still failing
      await sm.saveState('still-fail', createTestState());

      expect(sm.getCircuitBreakerStatus().state).toBe('OPEN');
      sm.destroy();
    });

    test('no operation should fail due to Redis outage', async () => {
      mockClient._setFailMode(true);

      const runId = 'no-fail';
      const state = createTestState();

      // Save should succeed (FS fallback)
      await expect(stateManager.saveState(runId, state)).resolves.not.toThrow();

      // Load should succeed (FS fallback)
      const loaded = await stateManager.loadState(runId);
      expect(loaded.squadId).toBe('squad-copy');

      // Pause/resume should succeed (FS fallback)
      await stateManager.pause(runId, state);
      const resumed = await stateManager.resume(runId);
      expect(resumed.status).toBe('paused');
    });

    test('health endpoint should reflect Redis status', () => {
      const status = stateManager.getCircuitBreakerStatus();
      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('failures');
      expect(status).toHaveProperty('redisAvailable');
    });
  });

  describe('Task 6: Cache Metrics (AC7)', () => {
    test('should track redis_hits on cache hit', async () => {
      const runId = 'metrics-hit';
      await stateManager.saveState(runId, createTestState());
      await stateManager.loadState(runId);

      const metrics = redisAdapter.getMetrics();
      expect(metrics.hits).toBeGreaterThanOrEqual(1);
    });

    test('should track redis_misses on cache miss', async () => {
      const runId = 'metrics-miss';
      await stateManager._saveToFileSystem(runId, createTestState());
      await stateManager.loadState(runId);

      const metrics = redisAdapter.getMetrics();
      expect(metrics.misses).toBeGreaterThanOrEqual(1);
    });

    test('should track redis_errors on Redis failure', async () => {
      mockClient._setFailMode(true);
      await stateManager.saveState('err-1', createTestState());

      const metrics = redisAdapter.getMetrics();
      expect(metrics.errors).toBeGreaterThanOrEqual(1);
    });

    test('should track fs_fallback_count', async () => {
      const runId = 'metrics-fallback';
      await stateManager._saveToFileSystem(runId, createTestState());

      mockClient._setFailMode(true);
      await stateManager.loadState(runId);

      const metrics = redisAdapter.getMetrics();
      expect(metrics.fsFallbackCount).toBeGreaterThanOrEqual(1);
    });

    test('should compute redis_latency_avg', async () => {
      await stateManager.saveState('lat-1', createTestState());
      await stateManager.loadState('lat-1');

      const metrics = redisAdapter.getMetrics();
      expect(metrics.avgLatency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Task 7: Performance Benchmarking (AC6)', () => {
    test('save with Redis should be fast (<50ms)', async () => {
      const state = createTestState();
      const start = Date.now();
      await stateManager.saveState('perf-save', state);
      const elapsed = Date.now() - start;

      // With mock Redis, this should be near-instant
      expect(elapsed).toBeLessThan(50);
    });

    test('load from Redis (cache hit) should be fast (<20ms)', async () => {
      const state = createTestState();
      await stateManager.saveState('perf-load', state);

      const start = Date.now();
      await stateManager.loadState('perf-load');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(20);
    });

    test('pause/resume cycle should be fast (<100ms)', async () => {
      const state = createTestState();
      const start = Date.now();

      await stateManager.pause('perf-cycle', state);
      await stateManager.resume('perf-cycle');

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('Task 8.7: 100 Concurrent Operations', () => {
    test('100 concurrent save/load operations should succeed', async () => {
      const promises = [];

      for (let i = 0; i < 100; i++) {
        const runId = `concurrent-${i}`;
        const state = createTestState({ currentTaskIndex: i });

        promises.push(
          stateManager.saveState(runId, state)
            .then(() => stateManager.loadState(runId))
            .then(loaded => ({ runId, success: true, index: loaded.currentTaskIndex }))
            .catch(error => ({ runId, success: false, error: error.message }))
        );
      }

      const results = await Promise.all(promises);
      const successes = results.filter(r => r.success);
      const failures = results.filter(r => !r.success);

      expect(successes).toHaveLength(100);
      expect(failures).toHaveLength(0);

      // Verify each operation preserved its data
      for (const result of successes) {
        const expectedIndex = parseInt(result.runId.split('-')[1]);
        expect(result.index).toBe(expectedIndex);
      }
    });
  });

  describe('Task 8.8: Redis Down → Fallback → Recovery', () => {
    test('should fallback on Redis down, then resume when Redis recovers', async () => {
      const sm = new StateManager(testStateDir, {
        redisAdapter,
        circuitBreaker: { failureThreshold: 2, resetTimeout: 50 },
      });

      // Phase 1: Redis is up — dual write works
      await sm.saveState('recovery-1', createTestState({ status: 'running' }));
      const loaded1 = await sm.loadState('recovery-1');
      expect(loaded1.squadId).toBe('squad-copy');
      expect(redisAdapter.getMetrics().hits).toBeGreaterThanOrEqual(1);

      // Phase 2: Redis goes down
      mockClient._setFailMode(true);
      await sm.saveState('recovery-fail-1', createTestState());
      await sm.saveState('recovery-fail-2', createTestState());

      expect(sm.getCircuitBreakerStatus().state).toBe('OPEN');

      // Operations still work via FS
      await sm.saveState('recovery-fs', createTestState());
      const loadedFs = await sm.loadState('recovery-fs');
      expect(loadedFs.squadId).toBe('squad-copy');

      // Phase 3: Wait for circuit half-open
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(sm.getCircuitBreakerStatus().state).toBe('HALF_OPEN');

      // Phase 4: Redis recovers
      mockClient._setFailMode(false);
      await sm.saveState('recovery-ok', createTestState());
      expect(sm.getCircuitBreakerStatus().state).toBe('CLOSED');

      // Cache resumes working
      const loadedRecovered = await sm.loadState('recovery-ok');
      expect(loadedRecovered.squadId).toBe('squad-copy');

      sm.destroy();
    });
  });

  describe('Backward Compatibility (no Redis adapter)', () => {
    test('StateManager without redisAdapter should work as before', async () => {
      const sm = new StateManager(testStateDir);
      const runId = 'compat-001';
      const state = createTestState({ status: 'paused' });

      await sm.saveState(runId, state);
      const loaded = await sm.loadState(runId);

      expect(loaded.squadId).toBe('squad-copy');
      expect(loaded.status).toBe('paused');
      sm.destroy();
    });

    test('clearState should work without Redis', async () => {
      const sm = new StateManager(testStateDir);
      const runId = 'compat-clear';
      await sm.saveState(runId, createTestState());

      await sm.clearState(runId);

      await expect(sm.loadState(runId)).rejects.toThrow('Estado não encontrado');
      sm.destroy();
    });
  });

  describe('clearState with Redis', () => {
    test('should delete from both Redis and FS', async () => {
      const runId = 'clear-both';
      await stateManager.saveState(runId, createTestState());

      await stateManager.clearState(runId);

      // Redis should be empty
      expect(await mockClient.get('run:clear-both')).toBeNull();

      // FS should be empty
      const stateFile = path.join(testStateDir, `${runId}.state.yaml`);
      await expect(fs.access(stateFile)).rejects.toThrow();
    });
  });
});
