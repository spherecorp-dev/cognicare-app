/**
 * Idempotency Cache
 *
 * LRU cache for caching task execution results to prevent duplicate execution.
 * Uses SHA256 hashes of (runId, stepId, input) as idempotency keys.
 *
 * Story 2.2: Idempotency Keys — Evitar Execução Duplicada
 *
 * @module IdempotencyCache
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const crypto = require('crypto');

const DEFAULT_MAX_ENTRIES = 1000;
const DEFAULT_TTL_MS = 86400000; // 24 hours in ms

class IdempotencyCache {
  /**
   * @param {number} [maxEntries=1000] - Maximum number of cache entries
   * @param {number} [defaultTTL=86400000] - Default TTL in milliseconds (24h)
   */
  constructor(maxEntries = DEFAULT_MAX_ENTRIES, defaultTTL = DEFAULT_TTL_MS) {
    this.cache = new Map(); // Map preserves insertion order for LRU
    this.maxEntries = maxEntries;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Gets a cached result by key. Returns null if not found or expired.
   * Moves accessed entry to end (most recently used) on hit.
   *
   * @param {string} key - Idempotency key
   * @returns {any|null} Cached result or null
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL expiry
    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used) for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.result;
  }

  /**
   * Stores a result in cache with TTL. Evicts LRU entry if at capacity.
   *
   * @param {string} key - Idempotency key
   * @param {any} result - Task execution result to cache
   * @param {number} [ttl] - TTL in milliseconds (defaults to constructor defaultTTL)
   */
  set(key, result, ttl) {
    const effectiveTTL = ttl !== undefined ? ttl : this.defaultTTL;

    // Evict LRU (first entry in Map) if at capacity and key is new
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }

    // If key already exists, delete first to move to end
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    const now = Date.now();
    this.cache.set(key, {
      result,
      cachedAt: now,
      expiresAt: now + effectiveTTL,
    });
  }

  /**
   * Checks if a non-expired entry exists for the given key.
   *
   * @param {string} key - Idempotency key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Returns the number of entries currently in cache.
   * @returns {number}
   */
  get size() {
    return this.cache.size;
  }

  /**
   * Clears all entries from cache.
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Returns metadata for a cached entry (without moving it in LRU order).
   *
   * @param {string} key - Idempotency key
   * @returns {{ cachedAt: number, expiresAt: number }|null}
   */
  getMetadata(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return {
      cachedAt: entry.cachedAt,
      expiresAt: entry.expiresAt,
    };
  }

  /**
   * Serializes cache state for persistence (pause/resume).
   * Returns JSON-serializable object with all non-expired entries.
   *
   * @returns {Object} Serialized cache state
   */
  serialize() {
    const now = Date.now();
    const entries = [];

    for (const [key, entry] of this.cache) {
      // Skip expired entries during serialization
      if (now >= entry.expiresAt) continue;

      entries.push({
        key,
        result: entry.result,
        cachedAt: entry.cachedAt,
        expiresAt: entry.expiresAt,
      });
    }

    return {
      maxEntries: this.maxEntries,
      defaultTTL: this.defaultTTL,
      entries,
    };
  }

  /**
   * Restores cache from serialized data. Discards expired entries.
   *
   * @param {Object} data - Serialized cache data from serialize()
   * @returns {IdempotencyCache} Restored cache instance
   */
  static restore(data) {
    if (!data || typeof data !== 'object') {
      return new IdempotencyCache();
    }

    const cache = new IdempotencyCache(
      data.maxEntries || DEFAULT_MAX_ENTRIES,
      data.defaultTTL || DEFAULT_TTL_MS
    );

    const now = Date.now();
    const entries = data.entries || [];

    for (const entry of entries) {
      // Discard expired entries during restore
      if (now >= entry.expiresAt) continue;

      cache.cache.set(entry.key, {
        result: entry.result,
        cachedAt: entry.cachedAt,
        expiresAt: entry.expiresAt,
      });
    }

    return cache;
  }

  /**
   * Generates a SHA256 idempotency key from run/step/input.
   *
   * @param {string} runId - Run ID
   * @param {string} stepId - Step ID
   * @param {any} input - Step input (will be JSON stringified)
   * @returns {string} SHA256 hex hash
   */
  static generateKey(runId, stepId, input) {
    const payload = JSON.stringify({
      runId: runId || '',
      stepId: stepId || '',
      input: input !== undefined && input !== null ? input : {},
    });

    return crypto.createHash('sha256').update(payload).digest('hex');
  }
}

module.exports = {
  IdempotencyCache,
  DEFAULT_MAX_ENTRIES,
  DEFAULT_TTL_MS,
};
