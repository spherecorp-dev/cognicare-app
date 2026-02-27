/**
 * Redis State Adapter - Unit Tests
 * Story 4.2 - Task 8.1: Unit tests for RedisStateAdapter
 */

const { RedisStateAdapter, KEY_PREFIX, TTL, ACTIVE_STATUSES } = require('../redis-state-adapter');

/**
 * In-memory Redis mock for unit tests
 */
function createMockRedisClient() {
  const store = new Map();
  const ttls = new Map();

  return {
    _store: store,
    _ttls: ttls,

    async get(key) {
      return store.get(key) || null;
    },

    async set(key, value, ...args) {
      store.set(key, value);
      // Handle SET key value EX ttl
      if (args[0] === 'EX' && args[1]) {
        ttls.set(key, args[1]);
      }
      return 'OK';
    },

    async del(key) {
      const existed = store.has(key);
      store.delete(key);
      ttls.delete(key);
      return existed ? 1 : 0;
    },

    async exists(key) {
      return store.has(key) ? 1 : 0;
    },

    async ping() {
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

describe('RedisStateAdapter', () => {
  let adapter;
  let mockClient;

  beforeEach(() => {
    mockClient = createMockRedisClient();
    adapter = new RedisStateAdapter({ client: mockClient });
  });

  afterEach(async () => {
    await adapter.close();
  });

  describe('constructor', () => {
    test('should accept injected client', () => {
      const a = new RedisStateAdapter({ client: mockClient });
      expect(a).toBeDefined();
    });

    test('should accept connection options', () => {
      const a = new RedisStateAdapter({ connection: { host: 'localhost', port: 6379 } });
      expect(a).toBeDefined();
    });

    test('should default to no client (lazy init)', () => {
      const a = new RedisStateAdapter();
      expect(a).toBeDefined();
    });
  });

  describe('get()', () => {
    test('should return null for non-existent key', async () => {
      const result = await adapter.get('non-existent');
      expect(result).toBeNull();
    });

    test('should increment misses on cache miss', async () => {
      await adapter.get('missing-key');
      const metrics = adapter.getMetrics();
      expect(metrics.misses).toBe(1);
      expect(metrics.hits).toBe(0);
    });

    test('should return deserialized state for existing key', async () => {
      const state = { squadId: 'test', status: 'running', data: [1, 2, 3] };
      await mockClient.set('run:test-run', JSON.stringify(state));

      const result = await adapter.get('test-run');
      expect(result).toEqual(state);
    });

    test('should increment hits on cache hit', async () => {
      await mockClient.set('run:test-run', JSON.stringify({ test: true }));
      await adapter.get('test-run');

      const metrics = adapter.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(0);
    });

    test('should track latency on get operations', async () => {
      await adapter.get('any-key');
      const metrics = adapter.getMetrics();
      expect(metrics.operationCount).toBe(1);
      expect(metrics.totalLatency).toBeGreaterThanOrEqual(0);
    });

    test('should increment errors on Redis failure', async () => {
      mockClient.get = async () => { throw new Error('Redis connection lost'); };

      await expect(adapter.get('key')).rejects.toThrow('Redis connection lost');
      expect(adapter.getMetrics().errors).toBe(1);
    });
  });

  describe('set()', () => {
    test('should serialize and store state', async () => {
      const state = { squadId: 'squad-copy', status: 'running' };
      await adapter.set('run-001', state);

      const stored = await mockClient.get('run:run-001');
      expect(JSON.parse(stored)).toEqual(state);
    });

    test('should apply TTL when provided', async () => {
      await adapter.set('run-001', { status: 'running' }, 86400);
      expect(mockClient._ttls.get('run:run-001')).toBe(86400);
    });

    test('should determine TTL from status when not provided', async () => {
      // Active status → 24h TTL
      await adapter.set('run-active', { status: 'running' });
      expect(mockClient._ttls.get('run:run-active')).toBe(TTL.ACTIVE);

      // Completed status → 1h TTL
      await adapter.set('run-done', { status: 'completed' });
      expect(mockClient._ttls.get('run:run-done')).toBe(TTL.COMPLETED);
    });

    test('should use ACTIVE TTL for paused status', async () => {
      await adapter.set('run-paused', { status: 'paused' });
      expect(mockClient._ttls.get('run:run-paused')).toBe(TTL.ACTIVE);
    });

    test('should use ACTIVE TTL for queued status', async () => {
      await adapter.set('run-queued', { status: 'queued' });
      expect(mockClient._ttls.get('run:run-queued')).toBe(TTL.ACTIVE);
    });

    test('should use COMPLETED TTL for failed status', async () => {
      await adapter.set('run-failed', { status: 'failed' });
      expect(mockClient._ttls.get('run:run-failed')).toBe(TTL.COMPLETED);
    });

    test('should use COMPLETED TTL for aborted status', async () => {
      await adapter.set('run-aborted', { status: 'aborted' });
      expect(mockClient._ttls.get('run:run-aborted')).toBe(TTL.COMPLETED);
    });

    test('should track latency on set operations', async () => {
      await adapter.set('run-x', { status: 'running' });
      expect(adapter.getMetrics().operationCount).toBe(1);
    });

    test('should increment errors on Redis failure', async () => {
      mockClient.set = async () => { throw new Error('Write failed'); };

      await expect(adapter.set('key', {})).rejects.toThrow('Write failed');
      expect(adapter.getMetrics().errors).toBe(1);
    });
  });

  describe('delete()', () => {
    test('should remove key and return true', async () => {
      await mockClient.set('run:run-del', 'data');

      const result = await adapter.delete('run-del');
      expect(result).toBe(true);
      expect(await mockClient.get('run:run-del')).toBeNull();
    });

    test('should return false for non-existent key', async () => {
      const result = await adapter.delete('non-existent');
      expect(result).toBe(false);
    });

    test('should increment errors on Redis failure', async () => {
      mockClient.del = async () => { throw new Error('Del failed'); };

      await expect(adapter.delete('key')).rejects.toThrow('Del failed');
      expect(adapter.getMetrics().errors).toBe(1);
    });
  });

  describe('exists()', () => {
    test('should return true for existing key', async () => {
      await mockClient.set('run:exists-test', 'data');

      const result = await adapter.exists('exists-test');
      expect(result).toBe(true);
    });

    test('should return false for non-existent key', async () => {
      const result = await adapter.exists('no-key');
      expect(result).toBe(false);
    });

    test('should increment errors on Redis failure', async () => {
      mockClient.exists = async () => { throw new Error('Exists failed'); };

      await expect(adapter.exists('key')).rejects.toThrow('Exists failed');
      expect(adapter.getMetrics().errors).toBe(1);
    });
  });

  describe('ping()', () => {
    test('should return true when Redis responds', async () => {
      const result = await adapter.ping();
      expect(result).toBe(true);
    });

    test('should return false when Redis fails', async () => {
      mockClient.ping = async () => { throw new Error('Connection refused'); };

      const result = await adapter.ping();
      expect(result).toBe(false);
    });

    test('should return false when Redis returns non-PONG', async () => {
      mockClient.ping = async () => 'ERROR';

      const result = await adapter.ping();
      expect(result).toBe(false);
    });
  });

  describe('metrics', () => {
    test('should track hits and misses correctly', async () => {
      await mockClient.set('run:exists', JSON.stringify({ x: 1 }));

      await adapter.get('exists');   // hit
      await adapter.get('missing1'); // miss
      await adapter.get('missing2'); // miss
      await adapter.get('exists');   // hit

      const metrics = adapter.getMetrics();
      expect(metrics.hits).toBe(2);
      expect(metrics.misses).toBe(2);
    });

    test('should compute avgLatency correctly', async () => {
      await adapter.get('key1');
      await adapter.set('key2', { status: 'running' });

      const metrics = adapter.getMetrics();
      expect(metrics.operationCount).toBe(2);
      expect(metrics.avgLatency).toBeGreaterThanOrEqual(0);
    });

    test('should return 0 avgLatency when no operations', () => {
      const metrics = adapter.getMetrics();
      expect(metrics.avgLatency).toBe(0);
    });

    test('should track fsFallback count', () => {
      adapter.incrementFsFallback();
      adapter.incrementFsFallback();
      adapter.incrementFsFallback();

      expect(adapter.getMetrics().fsFallbackCount).toBe(3);
    });

    test('should reset all metrics', async () => {
      await adapter.get('key');
      adapter.incrementFsFallback();
      adapter.resetMetrics();

      const metrics = adapter.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.errors).toBe(0);
      expect(metrics.fsFallbackCount).toBe(0);
      expect(metrics.operationCount).toBe(0);
    });
  });

  describe('close()', () => {
    test('should close client connection', async () => {
      let quitCalled = false;
      mockClient.quit = async () => { quitCalled = true; };

      await adapter.close();
      expect(quitCalled).toBe(true);
    });

    test('should be idempotent (safe to call twice)', async () => {
      await adapter.close();
      await adapter.close(); // Should not throw
    });
  });

  describe('KEY_PREFIX', () => {
    test('should be "run:"', () => {
      expect(KEY_PREFIX).toBe('run:');
    });
  });

  describe('TTL constants', () => {
    test('ACTIVE should be 86400 (24h)', () => {
      expect(TTL.ACTIVE).toBe(86400);
    });

    test('COMPLETED should be 3600 (1h)', () => {
      expect(TTL.COMPLETED).toBe(3600);
    });
  });

  describe('ACTIVE_STATUSES', () => {
    test('should include running, paused, queued', () => {
      expect(ACTIVE_STATUSES.has('running')).toBe(true);
      expect(ACTIVE_STATUSES.has('paused')).toBe(true);
      expect(ACTIVE_STATUSES.has('queued')).toBe(true);
    });

    test('should NOT include completed, aborted, failed', () => {
      expect(ACTIVE_STATUSES.has('completed')).toBe(false);
      expect(ACTIVE_STATUSES.has('aborted')).toBe(false);
      expect(ACTIVE_STATUSES.has('failed')).toBe(false);
    });
  });
});
