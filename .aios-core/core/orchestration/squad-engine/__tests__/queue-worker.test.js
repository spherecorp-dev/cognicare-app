/**
 * Unit Tests - QueueWorkerPool
 * Story 4.1: Queue-Based Execution — BullMQ Integration (AC3, AC7)
 *
 * Uses dependency injection (no bullmq module mocking needed)
 */

const { QueueWorkerPool } = require('../queue-worker');

describe('QueueWorkerPool', () => {
  let workerPool;
  let mockOrchestrator;
  let mockEventStore;
  let mockWorkerInstance;
  let mockCreateWorkerFn;
  let mockQueue;
  let mockDLQQueue;

  beforeEach(() => {
    mockWorkerInstance = {
      on: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
      id: 'worker-1',
    };

    mockCreateWorkerFn = vi.fn((processor, opts) => {
      mockWorkerInstance._processor = processor;
      return mockWorkerInstance;
    });

    mockQueue = {
      add: vi.fn().mockResolvedValue({ id: 'job-1' }),
      getWaitingCount: vi.fn().mockResolvedValue(0),
      close: vi.fn(),
    };

    mockDLQQueue = {
      add: vi.fn().mockResolvedValue({ id: 'dlq-1' }),
      getWaitingCount: vi.fn().mockResolvedValue(0),
      close: vi.fn(),
    };

    mockOrchestrator = {
      execute: vi.fn().mockResolvedValue({
        runId: 'run-1',
        status: 'completed',
      }),
    };

    mockEventStore = {
      append: vi.fn(),
    };

    workerPool = new QueueWorkerPool({
      orchestrator: mockOrchestrator,
      eventStore: mockEventStore,
      createWorkerFn: mockCreateWorkerFn,
      queue: mockQueue,
      dlqQueue: mockDLQQueue,
    });
  });

  afterEach(async () => {
    if (workerPool.isRunning()) {
      await workerPool.stop();
    }
  });

  describe('processJob', () => {
    test('calls SquadOrchestrator.execute with correct params', async () => {
      workerPool.worker = mockWorkerInstance;

      const job = {
        id: 'job-1',
        data: {
          runId: 'run-1',
          squadId: 'squad-copy',
          trigger: { type: 'webhook', source: 'n8n' },
          overrides: { method: 'test' },
        },
      };

      const result = await workerPool.processJob(job);

      expect(mockOrchestrator.execute).toHaveBeenCalledWith(
        'squad-copy',
        'default',
        expect.objectContaining({
          type: 'webhook',
          source: 'n8n',
          overrides: { method: 'test' },
        })
      );
      expect(result.status).toBe('completed');
    });

    test('emits run.dequeued event', async () => {
      workerPool.worker = mockWorkerInstance;

      const job = {
        id: 'job-1',
        data: {
          runId: 'run-1',
          squadId: 'squad-copy',
          trigger: { type: 'manual' },
          overrides: {},
        },
      };

      await workerPool.processJob(job);

      expect(mockEventStore.append).toHaveBeenCalledWith(
        'run-1',
        'run.dequeued',
        expect.objectContaining({
          squadId: 'squad-copy',
          jobId: 'job-1',
        })
      );
    });

    test('does not throw if EventStore.append fails', async () => {
      mockEventStore.append.mockImplementation(() => { throw new Error('EventStore error'); });
      workerPool.worker = mockWorkerInstance;

      const job = {
        id: 'job-1',
        data: {
          runId: 'run-1',
          squadId: 'squad-copy',
          trigger: { type: 'manual' },
          overrides: {},
        },
      };

      const result = await workerPool.processJob(job);
      expect(result.status).toBe('completed');
    });

    test('propagates orchestrator errors', async () => {
      mockOrchestrator.execute.mockRejectedValue(new Error('Pipeline failed'));
      workerPool.worker = mockWorkerInstance;

      const job = {
        id: 'job-1',
        data: {
          runId: 'run-1',
          squadId: 'squad-copy',
          trigger: { type: 'manual' },
          overrides: {},
        },
      };

      await expect(workerPool.processJob(job)).rejects.toThrow('Pipeline failed');
    });
  });

  describe('start', () => {
    test('creates worker via factory', () => {
      workerPool.start();

      expect(mockCreateWorkerFn).toHaveBeenCalled();
      expect(workerPool.isRunning()).toBe(true);
    });

    test('throws if already started', () => {
      workerPool.start();

      expect(() => workerPool.start()).toThrow('Worker pool already started');
    });

    test('registers event handlers on worker', () => {
      workerPool.start();

      const eventNames = mockWorkerInstance.on.mock.calls.map(c => c[0]);
      expect(eventNames).toContain('failed');
      expect(eventNames).toContain('stalled');
      expect(eventNames).toContain('error');
    });
  });

  describe('stop', () => {
    test('closes worker gracefully', async () => {
      workerPool.start();
      await workerPool.stop();

      expect(mockWorkerInstance.close).toHaveBeenCalled();
      expect(workerPool.isRunning()).toBe(false);
    });

    test('handles stop when not started', async () => {
      await expect(workerPool.stop()).resolves.not.toThrow();
    });
  });

  describe('isRunning', () => {
    test('returns false when not started', () => {
      expect(workerPool.isRunning()).toBe(false);
    });

    test('returns true when started', () => {
      workerPool.start();
      expect(workerPool.isRunning()).toBe(true);
    });

    test('returns false after stop', async () => {
      workerPool.start();
      await workerPool.stop();
      expect(workerPool.isRunning()).toBe(false);
    });
  });
});
