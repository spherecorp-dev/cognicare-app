/**
 * MongoDB Run Archive
 *
 * Handles archiving completed runs to MongoDB and provides analytics
 * aggregation pipelines for queryable run history.
 *
 * Story 4.3: MongoDB Historical Storage — Queryable Run History
 *
 * @module MongoRunArchive
 */

const { getCollection, getDb, COLLECTIONS } = require('./mongo-config');

/**
 * Final run statuses that trigger archival
 */
const FINAL_STATUSES = new Set(['completed', 'failed', 'aborted']);

/**
 * Default data retention in days
 */
const DEFAULT_RETENTION_DAYS = parseInt(process.env.MONGO_RETENTION_DAYS || '90', 10);

/**
 * Index definitions for squad_runs collection (AC3)
 */
const INDEXES = [
  { key: { runId: 1 }, options: { unique: true, name: 'idx_runId_unique' } },
  { key: { squadId: 1, started_at: -1 }, options: { name: 'idx_squad_started' } },
  { key: { status: 1 }, options: { name: 'idx_status' } },
  { key: { started_at: -1 }, options: { name: 'idx_started_desc' } },
  { key: { 'error.step': 1 }, options: { name: 'idx_error_step', sparse: true } },
  {
    key: { completed_at: 1 },
    options: {
      name: 'idx_retention_ttl',
      expireAfterSeconds: DEFAULT_RETENTION_DAYS * 24 * 60 * 60,
    },
  },
];

/**
 * MongoRunArchive — Archive operations and analytics pipelines
 */
class MongoRunArchive {
  /**
   * @param {Object} [options]
   * @param {import('mongodb').Collection} [options.collection] - Pre-configured collection (for testing)
   * @param {import('./redis-state-adapter').RedisStateAdapter} [options.redisAdapter] - Redis adapter for analytics cache
   * @param {number} [options.analyticsCacheTtl=300] - Analytics cache TTL in seconds (default: 5min)
   */
  constructor(options = {}) {
    this._collection = options.collection || null;
    this._redisAdapter = options.redisAdapter || null;
    this._analyticsCacheTtl = options.analyticsCacheTtl ?? 300;
    this._indexesCreated = false;
  }

  /**
   * Get the squad_runs collection
   * @returns {import('mongodb').Collection}
   * @private
   */
  _getCollection() {
    if (!this._collection) {
      this._collection = getCollection(COLLECTIONS.SQUAD_RUNS);
    }
    return this._collection;
  }

  /**
   * Ensure indexes are created (idempotent)
   * @returns {Promise<void>}
   */
  async ensureIndexes() {
    if (this._indexesCreated) return;

    const col = this._getCollection();
    for (const idx of INDEXES) {
      try {
        await col.createIndex(idx.key, idx.options);
      } catch (error) {
        // Index already exists with different options — log warning, continue
        if (error.code !== 85 && error.code !== 86) {
          throw error;
        }
        console.warn(`[MongoRunArchive] Index ${idx.options.name} already exists with different options, skipping.`);
      }
    }
    this._indexesCreated = true;
  }

  /**
   * Build a run summary document from final state
   *
   * @param {string} runId - Run identifier
   * @param {Object} state - Final run state from StateManager
   * @param {Object} [metadata] - Additional metadata (events_count, etc.)
   * @returns {Object} MongoDB document ready for insertion
   */
  buildRunSummary(runId, state, metadata = {}) {
    const now = new Date();
    const started = state.started_at ? new Date(state.started_at) : now;
    const completed = state.completed_at ? new Date(state.completed_at) : now;
    const durationMs = completed.getTime() - started.getTime();

    // Extract phases summary
    const phasesSummary = (state.phases || []).map((phase) => ({
      name: phase.name || phase.id || 'unknown',
      status: phase.status || 'unknown',
      duration_ms: phase.duration_ms || 0,
      steps_count: (phase.steps || []).length,
    }));

    // Extract outputs summary
    const outputs = state.outputs || state.context?.outputs || {};
    const artifactTypes = Object.keys(outputs);
    const totalArtifacts = artifactTypes.reduce((sum, key) => {
      const val = outputs[key];
      return sum + (Array.isArray(val) ? val.length : 1);
    }, 0);

    // Build error info if failed/aborted
    let error = null;
    if (state.status === 'failed' || state.status === 'aborted') {
      error = {
        phase: state.error?.phase || state.current_phase || null,
        step: state.error?.step || state.current_step || null,
        message: state.error?.message || state.error_message || null,
        stack: state.error?.stack || null,
      };
    }

    return {
      runId,
      squadId: state.squadId || state.squad_id || 'unknown',
      trigger: state.trigger || {
        type: 'manual',
        source: 'unknown',
        offer: null,
        overrides: null,
      },
      status: state.status,
      priority: state.priority || 5,
      started_at: started,
      completed_at: completed,
      duration_ms: durationMs,
      phases_summary: phasesSummary,
      outputs_summary: {
        total_artifacts: totalArtifacts,
        artifact_types: artifactTypes,
      },
      events_count: metadata.events_count || 0,
      error,
      archived_at: now,
    };
  }

  /**
   * Archive a completed run to MongoDB (AC2)
   *
   * @param {string} runId - Run identifier
   * @param {Object} state - Final run state
   * @param {Object} [metadata] - Additional metadata
   * @returns {Promise<boolean>} true if archived successfully
   */
  async archive(runId, state, metadata = {}) {
    if (!FINAL_STATUSES.has(state.status)) {
      return false;
    }

    try {
      const doc = this.buildRunSummary(runId, state, metadata);
      const col = this._getCollection();

      // Upsert to handle potential re-archiving
      await col.updateOne(
        { runId },
        { $set: doc },
        { upsert: true }
      );

      return true;
    } catch (error) {
      console.warn(`[MongoRunArchive] Archive failed for ${runId}: ${error.message}. State persists in File System.`);
      return false;
    }
  }

  /**
   * Get period filter for date range
   * @param {string} period - Period string (24h, 7d, 30d)
   * @returns {Date} Start date for the period
   * @private
   */
  _getPeriodStart(period) {
    const now = new Date();
    switch (period) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Build match filter for period and squad
   * @param {string} period
   * @param {string} [squadId]
   * @returns {Object} MongoDB match filter
   * @private
   */
  _buildMatchFilter(period, squadId) {
    const filter = { started_at: { $gte: this._getPeriodStart(period) } };
    if (squadId && squadId !== 'all') {
      filter.squadId = squadId;
    }
    return filter;
  }

  /**
   * Get cached analytics result from Redis
   * @param {string} cacheKey
   * @returns {Promise<Object|null>}
   * @private
   */
  async _getCached(cacheKey) {
    if (!this._redisAdapter) return null;
    try {
      const client = this._redisAdapter._getClient();
      const data = await client.get(cacheKey);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set analytics result in Redis cache
   * @param {string} cacheKey
   * @param {Object} data
   * @returns {Promise<void>}
   * @private
   */
  async _setCache(cacheKey, data) {
    if (!this._redisAdapter) return;
    try {
      const client = this._redisAdapter._getClient();
      await client.set(cacheKey, JSON.stringify(data), 'EX', this._analyticsCacheTtl);
    } catch {
      // Fire-and-forget cache population
    }
  }

  /**
   * Pipeline: Average duration per squad (AC4)
   * @param {string} period
   * @param {string} [squadId]
   * @returns {Promise<Array<{squadId: string, avg_duration_ms: number, count: number}>>}
   */
  async getAvgDuration(period, squadId) {
    const cacheKey = `analytics:avg_duration:${period}:${squadId || 'all'}`;
    const cached = await this._getCached(cacheKey);
    if (cached) return cached;

    const col = this._getCollection();
    const match = this._buildMatchFilter(period, squadId);

    const result = await col.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$squadId',
          avg_duration_ms: { $avg: '$duration_ms' },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, squadId: '$_id', avg_duration_ms: { $round: ['$avg_duration_ms', 0] }, count: 1 } },
      { $sort: { avg_duration_ms: -1 } },
    ]).toArray();

    await this._setCache(cacheKey, result);
    return result;
  }

  /**
   * Pipeline: Success rate per period (AC4)
   * @param {string} period
   * @param {string} [squadId]
   * @returns {Promise<{total: number, completed: number, failed: number, aborted: number, success_rate: number}>}
   */
  async getSuccessRate(period, squadId) {
    const cacheKey = `analytics:success_rate:${period}:${squadId || 'all'}`;
    const cached = await this._getCached(cacheKey);
    if (cached) return cached;

    const col = this._getCollection();
    const match = this._buildMatchFilter(period, squadId);

    const pipeline = await col.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          aborted: { $sum: { $cond: [{ $eq: ['$status', 'aborted'] }, 1, 0] } },
        },
      },
    ]).toArray();

    const stats = pipeline[0] || { total: 0, completed: 0, failed: 0, aborted: 0 };
    const result = {
      total: stats.total,
      completed: stats.completed,
      failed: stats.failed,
      aborted: stats.aborted,
      success_rate: stats.total > 0
        ? Math.round((stats.completed / stats.total) * 10000) / 100
        : 0,
    };

    await this._setCache(cacheKey, result);
    return result;
  }

  /**
   * Pipeline: Top 5 failing tasks (AC4)
   * @param {string} period
   * @param {string} [squadId]
   * @returns {Promise<Array<{step: string, count: number, last_seen: Date}>>}
   */
  async getTopFailing(period, squadId) {
    const cacheKey = `analytics:top_failing:${period}:${squadId || 'all'}`;
    const cached = await this._getCached(cacheKey);
    if (cached) return cached;

    const col = this._getCollection();
    const match = {
      ...this._buildMatchFilter(period, squadId),
      'error.step': { $ne: null },
    };

    const result = await col.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$error.step',
          count: { $sum: 1 },
          last_seen: { $max: '$completed_at' },
          message: { $first: '$error.message' },
        },
      },
      { $project: { _id: 0, step: '$_id', count: 1, last_seen: 1, message: 1 } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]).toArray();

    await this._setCache(cacheKey, result);
    return result;
  }

  /**
   * Pipeline: Total runs by status (AC4)
   * @param {string} period
   * @param {string} [squadId]
   * @returns {Promise<Object<string, number>>}
   */
  async getTotalByStatus(period, squadId) {
    const cacheKey = `analytics:total_by_status:${period}:${squadId || 'all'}`;
    const cached = await this._getCached(cacheKey);
    if (cached) return cached;

    const col = this._getCollection();
    const match = this._buildMatchFilter(period, squadId);

    const pipeline = await col.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).toArray();

    const result = {};
    for (const row of pipeline) {
      result[row._id] = row.count;
    }

    await this._setCache(cacheKey, result);
    return result;
  }

  /**
   * Pipeline: Throughput — runs per day (AC4)
   * @param {string} period
   * @param {string} [squadId]
   * @returns {Promise<Array<{date: string, total: number, completed: number, failed: number, aborted: number}>>}
   */
  async getThroughput(period, squadId) {
    const cacheKey = `analytics:throughput:${period}:${squadId || 'all'}`;
    const cached = await this._getCached(cacheKey);
    if (cached) return cached;

    const col = this._getCollection();
    const match = this._buildMatchFilter(period, squadId);

    const result = await col.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$started_at' } },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          aborted: { $sum: { $cond: [{ $eq: ['$status', 'aborted'] }, 1, 0] } },
        },
      },
      { $project: { _id: 0, date: '$_id', total: 1, completed: 1, failed: 1, aborted: 1 } },
      { $sort: { date: 1 } },
    ]).toArray();

    await this._setCache(cacheKey, result);
    return result;
  }

  /**
   * Get full analytics summary (AC4 — combines all pipelines)
   * @param {string} [period='30d'] - Period (24h, 7d, 30d)
   * @param {string} [squadId='all'] - Squad filter
   * @returns {Promise<Object>} Complete analytics response
   */
  async getAnalytics(period = '30d', squadId = 'all') {
    const [avgDuration, successRate, topFailing, totalByStatus, throughput] = await Promise.all([
      this.getAvgDuration(period, squadId),
      this.getSuccessRate(period, squadId),
      this.getTopFailing(period, squadId),
      this.getTotalByStatus(period, squadId),
      this.getThroughput(period, squadId),
    ]);

    return {
      avg_duration: avgDuration,
      success_rate: successRate,
      top_failing: topFailing,
      total_by_status: totalByStatus,
      throughput,
      period,
      squadId,
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Query runs with filters (for general listing)
   * @param {Object} [filters]
   * @param {string} [filters.squadId]
   * @param {string} [filters.status]
   * @param {number} [filters.limit=50]
   * @param {number} [filters.skip=0]
   * @returns {Promise<Array<Object>>}
   */
  async queryRuns(filters = {}) {
    const col = this._getCollection();
    const query = {};

    if (filters.squadId && filters.squadId !== 'all') {
      query.squadId = filters.squadId;
    }
    if (filters.status) {
      query.status = filters.status;
    }

    return col
      .find(query)
      .sort({ started_at: -1 })
      .skip(filters.skip || 0)
      .limit(filters.limit || 50)
      .toArray();
  }

  /**
   * Count total archived runs
   * @returns {Promise<number>}
   */
  async countRuns() {
    const col = this._getCollection();
    return col.countDocuments();
  }

  /**
   * Delete runs older than retention period (AC6 fallback)
   * @param {number} [days] - Days to retain (default: MONGO_RETENTION_DAYS)
   * @returns {Promise<number>} Number of deleted documents
   */
  async cleanupOldRuns(days) {
    const retentionDays = days || DEFAULT_RETENTION_DAYS;
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const col = this._getCollection();
    const result = await col.deleteMany({ completed_at: { $lt: cutoff } });

    if (result.deletedCount > 0) {
      console.info(`[MongoRunArchive] Retention cleanup: removed ${result.deletedCount} runs older than ${retentionDays}d`);
    }

    return result.deletedCount;
  }
}

module.exports = {
  MongoRunArchive,
  FINAL_STATUSES,
  DEFAULT_RETENTION_DAYS,
  INDEXES,
};
