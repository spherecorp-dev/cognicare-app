/**
 * Unit Tests - QueueConfig
 * Story 4.1: Queue-Based Execution — BullMQ Integration (AC1)
 */

const { parseRedisUrl, QUEUE_NAMES, DEFAULT_JOB_OPTIONS, DEFAULT_WORKER_OPTIONS } = require('../queue-config');

describe('QueueConfig', () => {
  describe('parseRedisUrl', () => {
    test('parses standard redis URL', () => {
      const opts = parseRedisUrl('redis://localhost:6379');
      expect(opts.host).toBe('localhost');
      expect(opts.port).toBe(6379);
    });

    test('parses redis URL with password', () => {
      const opts = parseRedisUrl('redis://:secret@myhost:6380');
      expect(opts.host).toBe('myhost');
      expect(opts.port).toBe(6380);
      expect(opts.password).toBe('secret');
    });

    test('parses redis URL with username and password', () => {
      const opts = parseRedisUrl('redis://user:pass@host:6379');
      expect(opts.host).toBe('host');
      expect(opts.port).toBe(6379);
      expect(opts.username).toBe('user');
      expect(opts.password).toBe('pass');
    });

    test('parses rediss:// URL with TLS', () => {
      const opts = parseRedisUrl('rediss://host:6380');
      expect(opts.host).toBe('host');
      expect(opts.port).toBe(6380);
      expect(opts.tls).toEqual({});
    });

    test('defaults to localhost:6379 on invalid URL', () => {
      const opts = parseRedisUrl('not-a-url');
      expect(opts.host).toBe('localhost');
      expect(opts.port).toBe(6379);
    });

    test('defaults port to 6379 if not specified', () => {
      const opts = parseRedisUrl('redis://myhost');
      expect(opts.host).toBe('myhost');
      expect(opts.port).toBe(6379);
    });

    test('ignores default username', () => {
      const opts = parseRedisUrl('redis://default:pass@host:6379');
      expect(opts.username).toBeUndefined();
      expect(opts.password).toBe('pass');
    });

    test('decodes URL-encoded password', () => {
      const opts = parseRedisUrl('redis://:p%40ss%23word@host:6379');
      expect(opts.password).toBe('p@ss#word');
    });
  });

  describe('Constants', () => {
    test('QUEUE_NAMES has expected queue names', () => {
      expect(QUEUE_NAMES.SQUAD_RUNS).toBe('squad-runs');
      expect(QUEUE_NAMES.SQUAD_RUNS_DLQ).toBe('squad-runs-dlq');
    });

    test('DEFAULT_JOB_OPTIONS has correct retry config', () => {
      expect(DEFAULT_JOB_OPTIONS.attempts).toBe(3);
      expect(DEFAULT_JOB_OPTIONS.backoff.type).toBe('exponential');
      expect(DEFAULT_JOB_OPTIONS.backoff.delay).toBe(5000);
    });

    test('DEFAULT_JOB_OPTIONS keeps failed jobs for DLQ', () => {
      expect(DEFAULT_JOB_OPTIONS.removeOnFail).toBe(false);
    });

    test('DEFAULT_JOB_OPTIONS removes completed jobs after 24h', () => {
      expect(DEFAULT_JOB_OPTIONS.removeOnComplete.age).toBe(86400);
      expect(DEFAULT_JOB_OPTIONS.removeOnComplete.count).toBe(1000);
    });

    test('DEFAULT_WORKER_OPTIONS has correct concurrency', () => {
      expect(DEFAULT_WORKER_OPTIONS.concurrency).toBe(10);
    });

    test('DEFAULT_WORKER_OPTIONS has 30min lock duration', () => {
      expect(DEFAULT_WORKER_OPTIONS.lockDuration).toBe(1800000);
    });

    test('DEFAULT_WORKER_OPTIONS has 30s stall interval', () => {
      expect(DEFAULT_WORKER_OPTIONS.stalledInterval).toBe(30000);
    });
  });
});
