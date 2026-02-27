/**
 * Redis State Adapter
 *
 * Provides Redis-backed state storage for fast pause/resume operations.
 * Serializes state as JSON in Redis with key format `run:{runId}`.
 * Includes metrics tracking for observability.
 *
 * Story 4.2: Redis State Cache — Fast Pause/Resume
 *
 * @module RedisStateAdapter
 */

const Redis = require('ioredis');
const { getSharedConnection } = require('./queue-config');

const KEY_PREFIX = 'run:';

/**
 * TTL constants (in seconds)
 */
const TTL = {
  ACTIVE: 86400,   // 24h for active runs (running, paused, queued)
  COMPLETED: 3600, // 1h for completed runs (completed, aborted, failed)
};

/**
 * Active run statuses that get long TTL
 */
const ACTIVE_STATUSES = new Set(['running', 'paused', 'queued']);

/**
 * Redis state adapter for squad-engine state management.
 * Provides get/set/delete/exists operations with metrics tracking.
 */
class RedisStateAdapter {
  /**
   * @param {Object} [options]
   * @param {Object} [options.client] - Pre-configured ioredis client (for testing)
   * @param {Object} [options.connection] - Redis connection options override
   */
  constructor(options = {}) {
    this._client = options.client || null;
    this._connectionOptions = options.connection || null;
    this._metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalLatency: 0,
      operationCount: 0,
      fsFallbackCount: 0,
    };
  }

  /**
   * Lazy-initialize Redis client
   * @returns {Redis} ioredis client instance
   * @private
   */
  _getClient() {
    if (!this._client) {
      const conn = this._connectionOptions || getSharedConnection();
      this._client = new Redis(conn);
      this._client.on('error', () => {
        // Suppress unhandled error events — errors are handled per-operation
      });
    }
    return this._client;
  }

  /**
   * Build Redis key from runId
   * @param {string} runId
   * @returns {string} Redis key (e.g., 'run:squad-copy-abc123')
   * @private
   */
  _key(runId) {
    return `${KEY_PREFIX}${runId}`;
  }

  /**
   * Get state from Redis
   *
   * @param {string} runId - Run identifier
   * @returns {Promise<Object|null>} Deserialized state or null if not found
   * @throws {Error} If Redis operation fails
   */
  async get(runId) {
    const start = Date.now();
    try {
      const client = this._getClient();
      const data = await client.get(this._key(runId));
      const latency = Date.now() - start;
      this._trackLatency(latency);

      if (data === null) {
        this._metrics.misses++;
        return null;
      }

      this._metrics.hits++;
      return JSON.parse(data);
    } catch (error) {
      this._metrics.errors++;
      throw error;
    }
  }

  /**
   * Set state in Redis with optional TTL
   *
   * @param {string} runId - Run identifier
   * @param {Object} state - State object to serialize as JSON
   * @param {number} [ttl] - TTL in seconds. If omitted, determines from state.status
   * @returns {Promise<void>}
   * @throws {Error} If Redis operation fails
   */
  async set(runId, state, ttl) {
    const start = Date.now();
    try {
      const client = this._getClient();
      const data = JSON.stringify(state);
      const effectiveTtl = ttl ?? this._getTtlForStatus(state.status);

      if (effectiveTtl) {
        await client.set(this._key(runId), data, 'EX', effectiveTtl);
      } else {
        await client.set(this._key(runId), data);
      }

      const latency = Date.now() - start;
      this._trackLatency(latency);
    } catch (error) {
      this._metrics.errors++;
      throw error;
    }
  }

  /**
   * Delete state from Redis
   *
   * @param {string} runId - Run identifier
   * @returns {Promise<boolean>} true if key was deleted
   * @throws {Error} If Redis operation fails
   */
  async delete(runId) {
    try {
      const client = this._getClient();
      const result = await client.del(this._key(runId));
      return result === 1;
    } catch (error) {
      this._metrics.errors++;
      throw error;
    }
  }

  /**
   * Check if state exists in Redis
   *
   * @param {string} runId - Run identifier
   * @returns {Promise<boolean>} true if key exists
   * @throws {Error} If Redis operation fails
   */
  async exists(runId) {
    try {
      const client = this._getClient();
      const result = await client.exists(this._key(runId));
      return result === 1;
    } catch (error) {
      this._metrics.errors++;
      throw error;
    }
  }

  /**
   * Check Redis connectivity
   *
   * @returns {Promise<boolean>} true if Redis responds to PING
   */
  async ping() {
    try {
      const client = this._getClient();
      const result = await client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Determine TTL based on run status
   * @param {string} status - Run status
   * @returns {number} TTL in seconds
   * @private
   */
  _getTtlForStatus(status) {
    return ACTIVE_STATUSES.has(status) ? TTL.ACTIVE : TTL.COMPLETED;
  }

  /**
   * Track operation latency
   * @param {number} latencyMs
   * @private
   */
  _trackLatency(latencyMs) {
    this._metrics.totalLatency += latencyMs;
    this._metrics.operationCount++;
  }

  /**
   * Increment File System fallback counter
   */
  incrementFsFallback() {
    this._metrics.fsFallbackCount++;
  }

  /**
   * Get current metrics snapshot
   * @returns {Object} Metrics with avgLatency computed
   */
  getMetrics() {
    return {
      ...this._metrics,
      avgLatency: this._metrics.operationCount > 0
        ? Math.round(this._metrics.totalLatency / this._metrics.operationCount * 100) / 100
        : 0,
    };
  }

  /**
   * Reset all metrics counters
   */
  resetMetrics() {
    this._metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalLatency: 0,
      operationCount: 0,
      fsFallbackCount: 0,
    };
  }

  /**
   * Close Redis connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this._client) {
      await this._client.quit();
      this._client = null;
    }
  }
}

module.exports = { RedisStateAdapter, KEY_PREFIX, TTL, ACTIVE_STATUSES };
