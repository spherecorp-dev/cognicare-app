/**
 * MongoDB Run Archive - Unit Tests
 * Story 4.3 - Tasks 2, 3, 4, 7: Schema, Archive, Analytics, Retention
 */

const { MongoRunArchive, FINAL_STATUSES, DEFAULT_RETENTION_DAYS, INDEXES } = require('../mongo-run-archive');

/**
 * Create in-memory mock MongoDB collection with call tracking
 */
function createMockCollection() {
  const docs = [];
  const indexes = [];
  let aggregateResults = [];
  let deleteResult = { deletedCount: 0 };
  let shouldCreateIndexFail = false;
  let shouldUpdateOneFail = false;

  const col = {
    _docs: docs,
    _indexes: indexes,
    _setAggregateResults(results) { aggregateResults = results; },
    _setDeleteResult(result) { deleteResult = result; },
    _setCreateIndexFail(code) { shouldCreateIndexFail = code; },
    _setUpdateOneFail(flag) { shouldUpdateOneFail = flag; },

    updateOneCalls: [],
    aggregateCalls: [],
    createIndexCalls: [],
    deleteManyCalls: [],

    async insertOne(doc) {
      docs.push(doc);
      return { insertedId: `mock-${docs.length}` };
    },

    async updateOne(filter, update, options) {
      col.updateOneCalls.push({ filter, update, options });
      if (shouldUpdateOneFail) throw new Error('Write error');

      const idx = docs.findIndex(d => d.runId === filter.runId);
      if (idx >= 0) {
        docs[idx] = { ...docs[idx], ...update.$set };
        return { matchedCount: 1, upsertedCount: 0 };
      }
      if (options?.upsert) {
        docs.push(update.$set);
        return { matchedCount: 0, upsertedCount: 1 };
      }
      return { matchedCount: 0, upsertedCount: 0 };
    },

    find() {
      return {
        sort: () => ({
          skip: () => ({
            limit: () => ({
              toArray: async () => docs,
            }),
          }),
        }),
      };
    },

    aggregate(pipeline) {
      col.aggregateCalls.push(pipeline);
      return {
        toArray: async () => aggregateResults.shift() || [],
      };
    },

    async createIndex(key, options) {
      col.createIndexCalls.push({ key, options });
      if (shouldCreateIndexFail) {
        const err = new Error('Index exists');
        err.code = shouldCreateIndexFail;
        throw err;
      }
      indexes.push({ key, options });
      return options.name;
    },

    async countDocuments() {
      return docs.length;
    },

    async deleteMany(filter) {
      col.deleteManyCalls.push(filter);
      return deleteResult;
    },
  };

  return col;
}

/**
 * Create mock Redis adapter for analytics cache
 */
function createMockRedisAdapter() {
  const cache = new Map();
  let shouldGetFail = false;

  const mockClient = {
    async get(key) {
      if (shouldGetFail) throw new Error('Redis down');
      return cache.get(key) || null;
    },
    async set(key, value, ...args) {
      cache.set(key, value);
      return 'OK';
    },
  };

  return {
    _cache: cache,
    _getClient: () => mockClient,
    _setGetFail(flag) { shouldGetFail = flag; },
  };
}

/**
 * Create a sample completed run state
 */
function createSampleState(overrides = {}) {
  return {
    squadId: 'squad-copy',
    status: 'completed',
    started_at: '2026-02-21T15:00:00.000Z',
    completed_at: '2026-02-21T15:25:00.000Z',
    trigger: {
      type: 'webhook',
      source: 'n8n',
      offer: 'MEMFR02',
      overrides: { method: 'variacao_de_winner' },
    },
    priority: 5,
    phases: [
      { name: 'intelligence', status: 'completed', duration_ms: 450000, steps: ['a', 'b', 'c'] },
      { name: 'production', status: 'completed', duration_ms: 300000, steps: ['d', 'e'] },
    ],
    outputs: { images: ['img1.png', 'img2.png'], copy: ['headline.txt'] },
    error: null,
    ...overrides,
  };
}

describe('MongoRunArchive', () => {
  let archive;
  let mockCollection;
  let mockRedisAdapter;

  beforeEach(() => {
    mockCollection = createMockCollection();
    mockRedisAdapter = createMockRedisAdapter();
    archive = new MongoRunArchive({
      collection: mockCollection,
      redisAdapter: mockRedisAdapter,
    });
  });

  describe('FINAL_STATUSES', () => {
    test('should include completed, failed, aborted', () => {
      expect(FINAL_STATUSES.has('completed')).toBe(true);
      expect(FINAL_STATUSES.has('failed')).toBe(true);
      expect(FINAL_STATUSES.has('aborted')).toBe(true);
    });

    test('should NOT include running, paused, queued', () => {
      expect(FINAL_STATUSES.has('running')).toBe(false);
      expect(FINAL_STATUSES.has('paused')).toBe(false);
      expect(FINAL_STATUSES.has('queued')).toBe(false);
    });
  });

  describe('DEFAULT_RETENTION_DAYS', () => {
    test('should default to 90 days', () => {
      expect(DEFAULT_RETENTION_DAYS).toBe(90);
    });
  });

  describe('INDEXES', () => {
    test('should define 6 indexes', () => {
      expect(INDEXES.length).toBe(6);
    });

    test('should include unique index on runId', () => {
      const runIdIdx = INDEXES.find(i => i.options.name === 'idx_runId_unique');
      expect(runIdIdx).toBeDefined();
      expect(runIdIdx.options.unique).toBe(true);
    });

    test('should include squad_started compound index', () => {
      const idx = INDEXES.find(i => i.options.name === 'idx_squad_started');
      expect(idx).toBeDefined();
      expect(idx.key.squadId).toBe(1);
      expect(idx.key.started_at).toBe(-1);
    });

    test('should include TTL retention index', () => {
      const ttlIdx = INDEXES.find(i => i.options.name === 'idx_retention_ttl');
      expect(ttlIdx).toBeDefined();
      expect(ttlIdx.options.expireAfterSeconds).toBe(90 * 24 * 60 * 60);
    });

    test('should include error.step sparse index', () => {
      const idx = INDEXES.find(i => i.options.name === 'idx_error_step');
      expect(idx).toBeDefined();
      expect(idx.options.sparse).toBe(true);
    });
  });

  describe('ensureIndexes()', () => {
    test('should create all indexes', async () => {
      await archive.ensureIndexes();
      expect(mockCollection.createIndexCalls.length).toBe(6);
    });

    test('should be idempotent (skip on second call)', async () => {
      await archive.ensureIndexes();
      await archive.ensureIndexes();
      expect(mockCollection.createIndexCalls.length).toBe(6); // Not 12
    });

    test('should tolerate existing index errors (code 85)', async () => {
      mockCollection._setCreateIndexFail(85);
      await expect(archive.ensureIndexes()).resolves.not.toThrow();
    });
  });

  describe('buildRunSummary()', () => {
    test('should build document from completed state', () => {
      const state = createSampleState();
      const doc = archive.buildRunSummary('run-001', state, { events_count: 42 });

      expect(doc.runId).toBe('run-001');
      expect(doc.squadId).toBe('squad-copy');
      expect(doc.status).toBe('completed');
      expect(doc.priority).toBe(5);
      expect(doc.events_count).toBe(42);
      expect(doc.error).toBeNull();
      expect(doc.phases_summary).toHaveLength(2);
      expect(doc.phases_summary[0].name).toBe('intelligence');
      expect(doc.phases_summary[0].steps_count).toBe(3);
      expect(doc.outputs_summary.total_artifacts).toBe(3);
      expect(doc.outputs_summary.artifact_types).toContain('images');
      expect(doc.outputs_summary.artifact_types).toContain('copy');
      expect(doc.archived_at).toBeInstanceOf(Date);
    });

    test('should include error details for failed runs', () => {
      const state = createSampleState({
        status: 'failed',
        error: {
          phase: 'production',
          step: 'generate_images',
          message: 'DALL-E API timeout',
          stack: 'Error: ...',
        },
      });

      const doc = archive.buildRunSummary('run-002', state);
      expect(doc.error).not.toBeNull();
      expect(doc.error.phase).toBe('production');
      expect(doc.error.step).toBe('generate_images');
      expect(doc.error.message).toBe('DALL-E API timeout');
    });

    test('should handle missing phases gracefully', () => {
      const state = createSampleState({ phases: undefined });
      const doc = archive.buildRunSummary('run-003', state);
      expect(doc.phases_summary).toEqual([]);
    });

    test('should default events_count to 0', () => {
      const state = createSampleState();
      const doc = archive.buildRunSummary('run-004', state);
      expect(doc.events_count).toBe(0);
    });

    test('should default trigger if missing', () => {
      const state = createSampleState({ trigger: undefined });
      const doc = archive.buildRunSummary('run-005', state);
      expect(doc.trigger.type).toBe('manual');
    });

    test('should compute duration_ms from dates', () => {
      const state = createSampleState();
      const doc = archive.buildRunSummary('run-006', state);
      expect(doc.duration_ms).toBe(25 * 60 * 1000); // 25 minutes
    });
  });

  describe('archive()', () => {
    test('should archive completed run via upsert', async () => {
      const state = createSampleState();
      const result = await archive.archive('run-001', state, { events_count: 10 });

      expect(result).toBe(true);
      expect(mockCollection.updateOneCalls.length).toBe(1);
      expect(mockCollection.updateOneCalls[0].filter).toEqual({ runId: 'run-001' });
      expect(mockCollection.updateOneCalls[0].options.upsert).toBe(true);
    });

    test('should archive failed run', async () => {
      const state = createSampleState({ status: 'failed' });
      const result = await archive.archive('run-002', state);
      expect(result).toBe(true);
    });

    test('should archive aborted run', async () => {
      const state = createSampleState({ status: 'aborted' });
      const result = await archive.archive('run-003', state);
      expect(result).toBe(true);
    });

    test('should reject non-final status', async () => {
      const state = createSampleState({ status: 'running' });
      const result = await archive.archive('run-004', state);
      expect(result).toBe(false);
      expect(mockCollection.updateOneCalls.length).toBe(0);
    });

    test('should return false on MongoDB failure', async () => {
      mockCollection._setUpdateOneFail(true);
      const state = createSampleState();
      const result = await archive.archive('run-005', state);
      expect(result).toBe(false);
    });
  });

  describe('Analytics Pipelines', () => {
    describe('getAvgDuration()', () => {
      test('should call aggregate with pipeline', async () => {
        mockCollection._setAggregateResults([
          [{ squadId: 'squad-copy', avg_duration_ms: 1500000, count: 10 }],
        ]);

        const result = await archive.getAvgDuration('24h', 'all');
        expect(mockCollection.aggregateCalls.length).toBe(1);
        expect(result).toHaveLength(1);
        expect(result[0].squadId).toBe('squad-copy');
      });

      test('should use Redis cache on second call', async () => {
        mockCollection._setAggregateResults([
          [{ squadId: 'squad-copy', avg_duration_ms: 1500000, count: 10 }],
        ]);

        await archive.getAvgDuration('24h', 'all');
        const result = await archive.getAvgDuration('24h', 'all');
        expect(result).toHaveLength(1);
        // aggregate should be called only once (first call cached)
        expect(mockCollection.aggregateCalls.length).toBe(1);
      });
    });

    describe('getSuccessRate()', () => {
      test('should compute success rate correctly', async () => {
        mockCollection._setAggregateResults([
          [{ _id: null, total: 100, completed: 85, failed: 10, aborted: 5 }],
        ]);

        const result = await archive.getSuccessRate('7d');
        expect(result.total).toBe(100);
        expect(result.success_rate).toBe(85);
      });

      test('should return 0 success rate when no runs', async () => {
        mockCollection._setAggregateResults([[]]);
        const result = await archive.getSuccessRate('30d');
        expect(result.total).toBe(0);
        expect(result.success_rate).toBe(0);
      });
    });

    describe('getTopFailing()', () => {
      test('should return top failing tasks', async () => {
        mockCollection._setAggregateResults([
          [
            { step: 'generate_images', count: 15, last_seen: new Date(), message: 'timeout' },
            { step: 'fetch_spy_data', count: 8, last_seen: new Date(), message: 'API error' },
          ],
        ]);

        const result = await archive.getTopFailing('30d');
        expect(result).toHaveLength(2);
        expect(result[0].step).toBe('generate_images');
        expect(result[0].count).toBe(15);
      });
    });

    describe('getTotalByStatus()', () => {
      test('should group runs by status', async () => {
        mockCollection._setAggregateResults([
          [
            { _id: 'completed', count: 85 },
            { _id: 'failed', count: 10 },
            { _id: 'aborted', count: 5 },
          ],
        ]);

        const result = await archive.getTotalByStatus('30d');
        expect(result.completed).toBe(85);
        expect(result.failed).toBe(10);
        expect(result.aborted).toBe(5);
      });
    });

    describe('getThroughput()', () => {
      test('should return runs per day', async () => {
        mockCollection._setAggregateResults([
          [
            { date: '2026-02-20', total: 12, completed: 10, failed: 2, aborted: 0 },
            { date: '2026-02-21', total: 8, completed: 7, failed: 0, aborted: 1 },
          ],
        ]);

        const result = await archive.getThroughput('7d');
        expect(result).toHaveLength(2);
        expect(result[0].date).toBe('2026-02-20');
        expect(result[0].total).toBe(12);
      });
    });

    describe('getAnalytics()', () => {
      test('should combine all pipelines', async () => {
        const result = await archive.getAnalytics('30d', 'all');

        expect(result).toHaveProperty('avg_duration');
        expect(result).toHaveProperty('success_rate');
        expect(result).toHaveProperty('top_failing');
        expect(result).toHaveProperty('total_by_status');
        expect(result).toHaveProperty('throughput');
        expect(result.period).toBe('30d');
        expect(result.squadId).toBe('all');
        expect(result.generated_at).toBeDefined();
      });
    });
  });

  describe('queryRuns()', () => {
    test('should return documents', async () => {
      const result = await archive.queryRuns({ squadId: 'squad-copy', limit: 10 });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('countRuns()', () => {
    test('should return document count', async () => {
      // Insert some docs directly
      mockCollection._docs.push({ runId: 'r1' }, { runId: 'r2' });
      const count = await archive.countRuns();
      expect(count).toBe(2);
    });
  });

  describe('cleanupOldRuns()', () => {
    test('should delete old runs and return count', async () => {
      mockCollection._setDeleteResult({ deletedCount: 150 });
      const deleted = await archive.cleanupOldRuns(90);
      expect(deleted).toBe(150);
      expect(mockCollection.deleteManyCalls.length).toBe(1);
    });

    test('should use default retention days', async () => {
      mockCollection._setDeleteResult({ deletedCount: 0 });
      await archive.cleanupOldRuns();
      expect(mockCollection.deleteManyCalls.length).toBe(1);
    });
  });

  describe('Redis analytics cache', () => {
    test('should work without Redis adapter', async () => {
      const archiveNoRedis = new MongoRunArchive({ collection: mockCollection });
      const result = await archiveNoRedis.getAvgDuration('24h');
      expect(result).toEqual([]);
    });

    test('should tolerate Redis cache errors gracefully', async () => {
      mockRedisAdapter._setGetFail(true);
      await expect(archive.getAvgDuration('24h')).resolves.not.toThrow();
    });
  });
});
