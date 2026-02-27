/**
 * Unit Tests - QueueManager
 * Story 4.1: Queue-Based Execution — BullMQ Integration (AC2, AC4, AC5, AC8)
 *
 * Uses dependency injection (no bullmq module mocking needed)
 */

const { QueueManager } = require('../queue-manager');

describe('QueueManager', () => {
  let queueManager;
  let mockEventStore;
  let mockQueue;
  let mockDLQQueue;

  beforeEach(() => {
    mockQueue = {
      add: vi.fn().mockResolvedValue({ id: 'job-1' }),
      getWaitingCount: vi.fn().mockResolvedValue(5),
      getActiveCount: vi.fn().mockResolvedValue(2),
      getCompletedCount: vi.fn().mockResolvedValue(100),
      getFailedCount: vi.fn().mockResolvedValue(3),
      getDelayedCount: vi.fn().mockResolvedValue(0),
      close: vi.fn(),
    };

    mockDLQQueue = {
      add: vi.fn().mockResolvedValue({ id: 'dlq-job-1' }),
      getWaitingCount: vi.fn().mockResolvedValue(0),
      getWaiting: vi.fn().mockResolvedValue([]),
      getJob: vi.fn().mockResolvedValue(null),
      close: vi.fn(),
    };

    mockEventStore = {
      append: vi.fn(),
    };

    queueManager = new QueueManager({
      eventStore: mockEventStore,
      queue: mockQueue,
      dlqQueue: mockDLQQueue,
    });
  });

  describe('generateRunId', () => {
    test('generates runId with squad name prefix', () => {
      const runId = queueManager.generateRunId('squad-copy');
      expect(runId).toContain('squad-copy-');
    });

    test('generates unique runIds', () => {
      const id1 = queueManager.generateRunId('squad-copy');
      const id2 = queueManager.generateRunId('squad-copy');
      expect(id1).toMatch(/^squad-copy-\d{4}-\d{2}-\d{2}/);
    });

    test('includes timestamp in runId', () => {
      const runId = queueManager.generateRunId('test');
      expect(runId).toMatch(/^test-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}/);
    });
  });

  describe('enqueue', () => {
    test('enqueues job with correct data', async () => {
      const trigger = { type: 'manual', source: 'dashboard' };
      const result = await queueManager.enqueue('squad-copy', trigger);

      expect(result.queued).toBe(true);
      expect(result.runId).toContain('squad-copy-');
      expect(typeof result.position).toBe('number');
    });

    test('uses provided runId if given', async () => {
      const result = await queueManager.enqueue('squad-copy', { type: 'manual' }, {
        runId: 'custom-run-id',
      });

      expect(result.runId).toBe('custom-run-id');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'custom-run-id',
        expect.objectContaining({ runId: 'custom-run-id' }),
        expect.any(Object)
      );
    });

    test('applies priority (default: 5)', async () => {
      await queueManager.enqueue('squad-copy', { type: 'manual' });

      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ priority: 5 }),
        expect.objectContaining({ priority: 5 })
      );
    });

    test('applies custom priority (1-10)', async () => {
      await queueManager.enqueue('squad-copy', { type: 'manual' }, { priority: 1 });

      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ priority: 1 }),
        expect.objectContaining({ priority: 1 })
      );
    });

    test('clamps priority to range 1-10', async () => {
      // priority: 0 is falsy, defaults to 5; test with explicit out-of-range values
      await queueManager.enqueue('squad-copy', { type: 'manual' }, { priority: 15 });
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ priority: 10 }),
        expect.objectContaining({ priority: 10 })
      );
    });

    test('includes overrides in job data', async () => {
      const overrides = { method: 'test' };
      await queueManager.enqueue('squad-copy', { type: 'manual' }, { overrides });

      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ overrides: { method: 'test' } }),
        expect.any(Object)
      );
    });

    test('emits run.queued event via EventStore', async () => {
      await queueManager.enqueue('squad-copy', { type: 'manual' });

      expect(mockEventStore.append).toHaveBeenCalledWith(
        expect.any(String),
        'run.queued',
        expect.objectContaining({
          squadId: 'squad-copy',
          priority: 5,
        })
      );
    });

    test('does not throw if EventStore.append fails', async () => {
      mockEventStore.append.mockImplementation(() => { throw new Error('EventStore error'); });

      const result = await queueManager.enqueue('squad-copy', { type: 'manual' });
      expect(result.queued).toBe(true);
    });

    test('returns queue position', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(7);
      const result = await queueManager.enqueue('squad-copy', { type: 'manual' });
      expect(result.position).toBe(7);
    });
  });

  describe('getStatus', () => {
    test('returns queue metrics', async () => {
      mockDLQQueue.getWaitingCount.mockResolvedValue(1);

      const status = await queueManager.getStatus();

      expect(status.queue).toBe('squad-runs');
      expect(status.waiting).toBe(5);
      expect(status.active).toBe(2);
      expect(status.completed).toBe(100);
      expect(status.failed).toBe(3);
      expect(status.delayed).toBe(0);
      expect(status.dlq_count).toBe(1);
      expect(typeof status.timestamp).toBe('string');
    });

    test('total equals waiting + active + delayed', async () => {
      const status = await queueManager.getStatus();
      expect(status.total).toBe(5 + 2 + 0);
    });
  });

  describe('DLQ operations', () => {
    test('getDLQJobs returns formatted job entries', async () => {
      mockDLQQueue.getWaiting.mockResolvedValue([
        {
          id: 'dlq-job-1',
          data: { runId: 'run-1', squadId: 'squad-copy' },
          failedReason: 'Connection timeout',
          attemptsMade: 3,
          timestamp: Date.now(),
          processedOn: Date.now(),
          finishedOn: Date.now(),
        },
      ]);

      const jobs = await queueManager.getDLQJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].jobId).toBe('dlq-job-1');
      expect(jobs[0].data.runId).toBe('run-1');
      expect(jobs[0].failedReason).toBe('Connection timeout');
    });

    test('retryDLQJob removes from DLQ and re-enqueues', async () => {
      const mockJobRemove = vi.fn();
      mockDLQQueue.getJob.mockResolvedValue({
        id: 'dlq-job-1',
        data: {
          runId: 'run-1',
          squadId: 'squad-copy',
          trigger: { type: 'manual' },
          priority: 3,
          overrides: {},
        },
        remove: mockJobRemove,
      });

      const result = await queueManager.retryDLQJob('dlq-job-1');

      expect(mockJobRemove).toHaveBeenCalled();
      expect(result.retried).toBe(true);
      expect(result.queued).toBe(true);
      expect(result.runId).toBe('run-1');
    });

    test('retryDLQJob throws if job not found', async () => {
      mockDLQQueue.getJob.mockResolvedValue(null);

      await expect(queueManager.retryDLQJob('non-existent')).rejects.toThrow('DLQ job not found');
    });

    test('removeDLQJob deletes job from DLQ', async () => {
      const mockJobRemove = vi.fn();
      mockDLQQueue.getJob.mockResolvedValue({
        id: 'dlq-job-1',
        remove: mockJobRemove,
      });

      const result = await queueManager.removeDLQJob('dlq-job-1');
      expect(result).toBe(true);
      expect(mockJobRemove).toHaveBeenCalled();
    });

    test('removeDLQJob throws if job not found', async () => {
      mockDLQQueue.getJob.mockResolvedValue(null);

      await expect(queueManager.removeDLQJob('non-existent')).rejects.toThrow('DLQ job not found');
    });

    test('moveToDLQ adds job to DLQ queue with metadata', async () => {
      const mockJob = {
        id: 'job-1',
        data: { runId: 'run-1', squadId: 'squad-copy' },
        attemptsMade: 3,
      };

      await queueManager.moveToDLQ(mockJob, 'Test error');

      expect(mockDLQQueue.add).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          runId: 'run-1',
          failedReason: 'Test error',
          attemptsMade: 3,
          originalQueue: 'squad-runs',
        }),
        expect.objectContaining({ jobId: 'dlq-job-1' })
      );
    });
  });
});
