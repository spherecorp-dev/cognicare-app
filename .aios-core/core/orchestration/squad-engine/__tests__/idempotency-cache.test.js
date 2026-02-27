/**
 * IdempotencyCache - Unit Tests
 * Story 2.2: Idempotency Keys — Evitar Execução Duplicada
 */

const { IdempotencyCache, DEFAULT_MAX_ENTRIES, DEFAULT_TTL_MS } = require('../idempotency-cache');

describe('IdempotencyCache', () => {
  describe('constructor', () => {
    test('should create cache with default values', () => {
      const cache = new IdempotencyCache();
      expect(cache.maxEntries).toBe(1000);
      expect(cache.defaultTTL).toBe(86400000);
      expect(cache.size).toBe(0);
    });

    test('should accept custom maxEntries and defaultTTL', () => {
      const cache = new IdempotencyCache(500, 3600000);
      expect(cache.maxEntries).toBe(500);
      expect(cache.defaultTTL).toBe(3600000);
    });
  });

  describe('get()', () => {
    test('should return null for non-existent key', () => {
      const cache = new IdempotencyCache();
      expect(cache.get('non-existent')).toBeNull();
    });

    test('should return cached result for existing key', () => {
      const cache = new IdempotencyCache();
      cache.set('key1', { data: 'test' });
      expect(cache.get('key1')).toEqual({ data: 'test' });
    });

    test('should return null for expired entry', () => {
      const cache = new IdempotencyCache();
      cache.set('key1', { data: 'test' }, 0); // TTL of 0ms = immediately expired
      // Need a small delay for Date.now() to advance
      expect(cache.get('key1')).toBeNull();
    });

    test('should delete expired entry on access', () => {
      const cache = new IdempotencyCache();
      cache.set('key1', 'value', 0);
      cache.get('key1'); // Triggers cleanup
      expect(cache.size).toBe(0);
    });

    test('should move accessed entry to end (LRU)', () => {
      const cache = new IdempotencyCache();
      cache.set('key1', 'val1');
      cache.set('key2', 'val2');
      cache.set('key3', 'val3');

      // Access key1, moving it to end
      cache.get('key1');

      // key2 should now be the oldest (first in Map)
      const keys = [...cache.cache.keys()];
      expect(keys[0]).toBe('key2');
      expect(keys[keys.length - 1]).toBe('key1');
    });
  });

  describe('set()', () => {
    test('should store result with default TTL', () => {
      const cache = new IdempotencyCache();
      const before = Date.now();
      cache.set('key1', { output: 'result' });
      const after = Date.now();

      const entry = cache.cache.get('key1');
      expect(entry.result).toEqual({ output: 'result' });
      expect(entry.cachedAt).toBeGreaterThanOrEqual(before);
      expect(entry.cachedAt).toBeLessThanOrEqual(after);
      expect(entry.expiresAt).toBeGreaterThan(entry.cachedAt);
    });

    test('should store result with custom TTL', () => {
      const cache = new IdempotencyCache();
      cache.set('key1', 'value', 5000);

      const entry = cache.cache.get('key1');
      expect(entry.expiresAt - entry.cachedAt).toBe(5000);
    });

    test('should update existing entry', () => {
      const cache = new IdempotencyCache();
      cache.set('key1', 'old');
      cache.set('key1', 'new');

      expect(cache.get('key1')).toBe('new');
      expect(cache.size).toBe(1);
    });

    test('should evict LRU entry when at capacity', () => {
      const cache = new IdempotencyCache(3);
      cache.set('key1', 'val1');
      cache.set('key2', 'val2');
      cache.set('key3', 'val3');

      // Cache is full, adding key4 should evict key1 (oldest)
      cache.set('key4', 'val4');

      expect(cache.size).toBe(3);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('val2');
      expect(cache.get('key4')).toBe('val4');
    });

    test('should not evict when updating existing key at capacity', () => {
      const cache = new IdempotencyCache(3);
      cache.set('key1', 'val1');
      cache.set('key2', 'val2');
      cache.set('key3', 'val3');

      // Updating existing key should NOT evict
      cache.set('key1', 'updated');

      expect(cache.size).toBe(3);
      expect(cache.get('key1')).toBe('updated');
      expect(cache.get('key2')).toBe('val2');
      expect(cache.get('key3')).toBe('val3');
    });
  });

  describe('has()', () => {
    test('should return false for non-existent key', () => {
      const cache = new IdempotencyCache();
      expect(cache.has('nope')).toBe(false);
    });

    test('should return true for existing non-expired key', () => {
      const cache = new IdempotencyCache();
      cache.set('key1', 'val');
      expect(cache.has('key1')).toBe(true);
    });

    test('should return false for expired key', () => {
      const cache = new IdempotencyCache();
      cache.set('key1', 'val', 0);
      expect(cache.has('key1')).toBe(false);
    });

    test('should clean up expired entry', () => {
      const cache = new IdempotencyCache();
      cache.set('key1', 'val', 0);
      cache.has('key1');
      expect(cache.size).toBe(0);
    });
  });

  describe('clear()', () => {
    test('should remove all entries', () => {
      const cache = new IdempotencyCache();
      cache.set('key1', 'val1');
      cache.set('key2', 'val2');
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe('getMetadata()', () => {
    test('should return metadata for existing entry', () => {
      const cache = new IdempotencyCache();
      cache.set('key1', 'val');

      const meta = cache.getMetadata('key1');
      expect(meta).not.toBeNull();
      expect(meta.cachedAt).toBeDefined();
      expect(meta.expiresAt).toBeDefined();
      expect(meta.expiresAt).toBeGreaterThan(meta.cachedAt);
    });

    test('should return null for non-existent key', () => {
      const cache = new IdempotencyCache();
      expect(cache.getMetadata('nope')).toBeNull();
    });

    test('should return null for expired key', () => {
      const cache = new IdempotencyCache();
      cache.set('key1', 'val', 0);
      expect(cache.getMetadata('key1')).toBeNull();
    });
  });

  describe('LRU eviction (1001st entry)', () => {
    test('should evict oldest entry when exceeding maxEntries', () => {
      const cache = new IdempotencyCache(1000);

      // Fill cache to capacity
      for (let i = 0; i < 1000; i++) {
        cache.set(`key-${i}`, `val-${i}`);
      }
      expect(cache.size).toBe(1000);

      // 1001st entry should evict key-0
      cache.set('key-1000', 'val-1000');
      expect(cache.size).toBe(1000);
      expect(cache.get('key-0')).toBeNull();
      expect(cache.get('key-1000')).toBe('val-1000');
    });
  });

  describe('serialize()', () => {
    test('should serialize all non-expired entries', () => {
      const cache = new IdempotencyCache(100, 86400000);
      cache.set('key1', { data: 'test1' });
      cache.set('key2', { data: 'test2' });

      const serialized = cache.serialize();

      expect(serialized.maxEntries).toBe(100);
      expect(serialized.defaultTTL).toBe(86400000);
      expect(serialized.entries).toHaveLength(2);
      expect(serialized.entries[0].key).toBe('key1');
      expect(serialized.entries[0].result).toEqual({ data: 'test1' });
      expect(serialized.entries[1].key).toBe('key2');
    });

    test('should skip expired entries during serialization', () => {
      const cache = new IdempotencyCache();
      cache.set('alive', 'yes', 86400000);
      cache.set('expired', 'no', 0);

      const serialized = cache.serialize();
      expect(serialized.entries).toHaveLength(1);
      expect(serialized.entries[0].key).toBe('alive');
    });

    test('should return empty entries for empty cache', () => {
      const cache = new IdempotencyCache();
      const serialized = cache.serialize();
      expect(serialized.entries).toHaveLength(0);
    });
  });

  describe('restore()', () => {
    test('should restore cache from serialized data', () => {
      const original = new IdempotencyCache(500, 3600000);
      original.set('key1', { data: 'test1' });
      original.set('key2', { data: 'test2' });

      const serialized = original.serialize();
      const restored = IdempotencyCache.restore(serialized);

      expect(restored.maxEntries).toBe(500);
      expect(restored.defaultTTL).toBe(3600000);
      expect(restored.get('key1')).toEqual({ data: 'test1' });
      expect(restored.get('key2')).toEqual({ data: 'test2' });
    });

    test('should discard expired entries during restore', () => {
      const serialized = {
        maxEntries: 1000,
        defaultTTL: 86400000,
        entries: [
          { key: 'alive', result: 'yes', cachedAt: Date.now(), expiresAt: Date.now() + 86400000 },
          { key: 'expired', result: 'no', cachedAt: Date.now() - 100000, expiresAt: Date.now() - 1 },
        ],
      };

      const restored = IdempotencyCache.restore(serialized);
      expect(restored.size).toBe(1);
      expect(restored.get('alive')).toBe('yes');
      expect(restored.get('expired')).toBeNull();
    });

    test('should return empty cache for null data', () => {
      const restored = IdempotencyCache.restore(null);
      expect(restored.size).toBe(0);
      expect(restored.maxEntries).toBe(DEFAULT_MAX_ENTRIES);
    });

    test('should return empty cache for undefined data', () => {
      const restored = IdempotencyCache.restore(undefined);
      expect(restored.size).toBe(0);
    });

    test('should handle missing entries array', () => {
      const restored = IdempotencyCache.restore({ maxEntries: 500 });
      expect(restored.size).toBe(0);
      expect(restored.maxEntries).toBe(500);
    });
  });

  describe('generateKey()', () => {
    test('should generate consistent SHA256 hash for same inputs', () => {
      const key1 = IdempotencyCache.generateKey('run-1', 'step-1', { a: 1 });
      const key2 = IdempotencyCache.generateKey('run-1', 'step-1', { a: 1 });
      expect(key1).toBe(key2);
    });

    test('should generate different hash for different runId', () => {
      const key1 = IdempotencyCache.generateKey('run-1', 'step-1', { a: 1 });
      const key2 = IdempotencyCache.generateKey('run-2', 'step-1', { a: 1 });
      expect(key1).not.toBe(key2);
    });

    test('should generate different hash for different stepId', () => {
      const key1 = IdempotencyCache.generateKey('run-1', 'step-1', { a: 1 });
      const key2 = IdempotencyCache.generateKey('run-1', 'step-2', { a: 1 });
      expect(key1).not.toBe(key2);
    });

    test('should generate different hash for different input', () => {
      const key1 = IdempotencyCache.generateKey('run-1', 'step-1', { a: 1 });
      const key2 = IdempotencyCache.generateKey('run-1', 'step-1', { a: 2 });
      expect(key1).not.toBe(key2);
    });

    test('should return 64-char hex string (SHA256)', () => {
      const key = IdempotencyCache.generateKey('run-1', 'step-1', {});
      expect(key).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should handle null input gracefully', () => {
      const key = IdempotencyCache.generateKey('run-1', 'step-1', null);
      expect(key).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should handle undefined input gracefully', () => {
      const key = IdempotencyCache.generateKey('run-1', 'step-1', undefined);
      expect(key).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should handle null runId and stepId', () => {
      const key = IdempotencyCache.generateKey(null, null, {});
      expect(key).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('constants', () => {
    test('DEFAULT_MAX_ENTRIES should be 1000', () => {
      expect(DEFAULT_MAX_ENTRIES).toBe(1000);
    });

    test('DEFAULT_TTL_MS should be 24 hours', () => {
      expect(DEFAULT_TTL_MS).toBe(86400000);
    });
  });
});
