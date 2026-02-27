/**
 * Queue Configuration
 *
 * Redis connection and BullMQ queue settings for squad-runs queue.
 * Supports REDIS_URL env var for Upstash, Railway, or local Redis.
 *
 * Story 4.1: Queue-Based Execution — BullMQ Integration
 *
 * @module QueueConfig
 */

const { Queue, Worker } = require('bullmq');

/**
 * Parse Redis URL into IORedis-compatible connection options
 * @param {string} url - Redis URL (redis://host:port or rediss://...)
 * @returns {Object} Connection options
 */
function parseRedisUrl(url) {
  try {
    const parsed = new URL(url);
    const opts = {
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || 6379,
    };
    if (parsed.password) {
      opts.password = decodeURIComponent(parsed.password);
    }
    if (parsed.username && parsed.username !== 'default') {
      opts.username = parsed.username;
    }
    if (parsed.protocol === 'rediss:') {
      opts.tls = {};
    }
    return opts;
  } catch {
    return { host: 'localhost', port: 6379 };
  }
}

/**
 * Get Redis connection options from environment
 * @returns {Object} IORedis connection options
 */
function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  return parseRedisUrl(redisUrl);
}

/**
 * Queue name constants
 */
const QUEUE_NAMES = {
  SQUAD_RUNS: 'squad-runs',
  SQUAD_RUNS_DLQ: 'squad-runs-dlq',
};

/**
 * Default job options for the squad-runs queue
 */
const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000, // 5s, 10s, 20s
  },
  removeOnComplete: {
    age: 86400, // 24h
    count: 1000,
  },
  removeOnFail: false, // Keep failed jobs for DLQ inspection
};

/**
 * Default worker options
 */
const DEFAULT_WORKER_OPTIONS = {
  concurrency: parseInt(process.env.MAX_QUEUE_WORKERS || '10', 10),
  lockDuration: 1800000, // 30min (max pipeline duration)
  stalledInterval: 30000, // 30s stall check
};

/**
 * Shared instances (lazy-initialized)
 */
let _queue = null;
let _dlqQueue = null;
let _connection = null;
let _redisClient = null;

/**
 * Get or create the shared Redis connection options
 * @returns {Object} Connection options
 */
function getSharedConnection() {
  if (!_connection) {
    _connection = getRedisConnection();
  }
  return _connection;
}

/**
 * Get or create the squad-runs queue
 * @returns {Queue} BullMQ Queue instance
 */
function getQueue() {
  if (!_queue) {
    _queue = new Queue(QUEUE_NAMES.SQUAD_RUNS, {
      connection: getSharedConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }
  return _queue;
}

/**
 * Get or create the DLQ queue
 * @returns {Queue} BullMQ Queue instance for dead letters
 */
function getDLQQueue() {
  if (!_dlqQueue) {
    _dlqQueue = new Queue(QUEUE_NAMES.SQUAD_RUNS_DLQ, {
      connection: getSharedConnection(),
    });
  }
  return _dlqQueue;
}

/**
 * Create a new Worker for the squad-runs queue
 * @param {Function} processor - Job processor function
 * @param {Object} [options] - Worker options override
 * @returns {Worker} BullMQ Worker instance
 */
function createWorker(processor, options = {}) {
  return new Worker(QUEUE_NAMES.SQUAD_RUNS, processor, {
    connection: getSharedConnection(),
    ...DEFAULT_WORKER_OPTIONS,
    ...options,
  });
}

/**
 * Get or create a shared raw ioredis client.
 * Used by RedisStateAdapter (Story 4.2) for direct Redis operations.
 * @returns {import('ioredis').Redis} ioredis client instance
 */
function getRedisClient() {
  if (!_redisClient) {
    const Redis = require('ioredis');
    _redisClient = new Redis(getSharedConnection());
    _redisClient.on('error', () => {
      // Suppress unhandled error events — errors handled per-operation
    });
  }
  return _redisClient;
}

/**
 * Close all shared connections (for graceful shutdown)
 * @returns {Promise<void>}
 */
async function closeAll() {
  const promises = [];
  if (_queue) {
    promises.push(_queue.close());
    _queue = null;
  }
  if (_dlqQueue) {
    promises.push(_dlqQueue.close());
    _dlqQueue = null;
  }
  if (_redisClient) {
    promises.push(_redisClient.quit());
    _redisClient = null;
  }
  _connection = null;
  await Promise.all(promises);
}

/**
 * Check Redis health by pinging the queue connection
 * @returns {Promise<boolean>} true if Redis is reachable
 */
async function healthCheck() {
  try {
    const queue = getQueue();
    await queue.client;
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  getRedisConnection,
  getSharedConnection,
  getRedisClient,
  getQueue,
  getDLQQueue,
  createWorker,
  closeAll,
  healthCheck,
  parseRedisUrl,
  QUEUE_NAMES,
  DEFAULT_JOB_OPTIONS,
  DEFAULT_WORKER_OPTIONS,
};
