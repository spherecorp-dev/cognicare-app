/**
 * Unit Tests - QueueLogger
 * Story 4.1: Queue-Based Execution — BullMQ Integration (AC8)
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const os = require('os');
const { QueueLogger } = require('../queue-logger');

describe('QueueLogger', () => {
  let logger;
  let logDir;

  beforeEach(async () => {
    logDir = path.join(os.tmpdir(), `queue-logger-test-${Date.now()}`);
    logger = new QueueLogger(logDir);
  });

  afterEach(async () => {
    // Cleanup
    try {
      const files = await fsPromises.readdir(logDir);
      for (const file of files) {
        await fsPromises.unlink(path.join(logDir, file));
      }
      await fsPromises.rmdir(logDir);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('log', () => {
    test('writes event to log.jsonl', async () => {
      await logger.log('job.added', { runId: 'run-1', squadId: 'squad-copy' });

      const content = await fsPromises.readFile(path.join(logDir, 'log.jsonl'), 'utf8');
      const entry = JSON.parse(content.trim());

      expect(entry.event).toBe('job.added');
      expect(entry.data.runId).toBe('run-1');
      expect(entry.data.squadId).toBe('squad-copy');
      expect(entry.timestamp).toBeDefined();
    });

    test('appends multiple events', async () => {
      await logger.log('job.added', { runId: 'run-1' });
      await logger.log('job.active', { runId: 'run-1' });
      await logger.log('job.completed', { runId: 'run-1' });

      const content = await fsPromises.readFile(path.join(logDir, 'log.jsonl'), 'utf8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(3);
      expect(JSON.parse(lines[0]).event).toBe('job.added');
      expect(JSON.parse(lines[1]).event).toBe('job.active');
      expect(JSON.parse(lines[2]).event).toBe('job.completed');
    });

    test('creates log directory if not exists', async () => {
      const newDir = path.join(os.tmpdir(), `queue-logger-new-${Date.now()}`);
      const newLogger = new QueueLogger(newDir);

      await newLogger.log('test.event', { test: true });

      const content = await fsPromises.readFile(path.join(newDir, 'log.jsonl'), 'utf8');
      expect(content).toContain('test.event');

      // Cleanup
      await fsPromises.unlink(path.join(newDir, 'log.jsonl'));
      await fsPromises.rmdir(newDir);
    });
  });

  describe('logSync', () => {
    test('writes event synchronously', () => {
      logger.logSync('job.stalled', { jobId: 'job-1' });

      const content = fs.readFileSync(path.join(logDir, 'log.jsonl'), 'utf8');
      const entry = JSON.parse(content.trim());

      expect(entry.event).toBe('job.stalled');
      expect(entry.data.jobId).toBe('job-1');
    });
  });

  describe('getRecentLogs', () => {
    test('returns recent log entries', async () => {
      await logger.log('job.added', { runId: 'run-1' });
      await logger.log('job.active', { runId: 'run-1' });

      const entries = await logger.getRecentLogs();

      expect(entries).toHaveLength(2);
      expect(entries[0].event).toBe('job.added');
      expect(entries[1].event).toBe('job.active');
    });

    test('limits entries', async () => {
      for (let i = 0; i < 10; i++) {
        await logger.log('job.added', { index: i });
      }

      const entries = await logger.getRecentLogs({ limit: 3 });
      expect(entries).toHaveLength(3);
    });

    test('filters by event type', async () => {
      await logger.log('job.added', { runId: 'run-1' });
      await logger.log('job.completed', { runId: 'run-1' });
      await logger.log('job.added', { runId: 'run-2' });

      const entries = await logger.getRecentLogs({ eventType: 'job.added' });
      expect(entries).toHaveLength(2);
      expect(entries.every(e => e.event === 'job.added')).toBe(true);
    });

    test('returns empty array if no log file', async () => {
      const emptyLogger = new QueueLogger(path.join(os.tmpdir(), `empty-${Date.now()}`));
      const entries = await emptyLogger.getRecentLogs();
      expect(entries).toEqual([]);
    });
  });
});
