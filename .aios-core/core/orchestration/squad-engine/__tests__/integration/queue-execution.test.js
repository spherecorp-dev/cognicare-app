/**
 * Integration Tests - Queue-Based Execution
 * Story 4.1: Queue-Based Execution — BullMQ Integration
 *
 * Tests full queue lifecycle: enqueue → worker process → complete
 * Uses dependency injection (no real Redis required)
 */

const { QueueManager } = require('../../queue-manager');
const { QueueWorkerPool } = require('../../queue-worker');
const { QueueLogger } = require('../../queue-logger');
const { EventStore } = require('../../event-store');
const path = require('path');
const os = require('os');

/**
 * Creates a mock queue that stores jobs in-memory
 */
function createMockQueue() {
  const jobs = [];
  return {
    jobs,
    add: vi.fn().mockImplementation(async (name, data, opts) => {
      const job = {
        id: opts?.jobId || `job-${jobs.length + 1}`,
        name,
        data,
        opts,
        attemptsMade: 0,
        failedReason: null,
        timestamp: Date.now(),
        processedOn: null,
        finishedOn: null,
        remove: vi.fn(),
      };
      jobs.push(job);
      return job;
    }),
    getWaitingCount: vi.fn().mockImplementation(() => Promise.resolve(jobs.length)),
    getActiveCount: vi.fn().mockResolvedValue(0),
    getCompletedCount: vi.fn().mockResolvedValue(0),
    getFailedCount: vi.fn().mockResolvedValue(0),
    getDelayedCount: vi.fn().mockResolvedValue(0),
    getWaiting: vi.fn().mockImplementation(async () => jobs),
    getJob: vi.fn().mockImplementation(async (id) => jobs.find(j => j.id === id) || null),
    close: vi.fn(),
  };
}

describe('Queue-Based Execution Integration', () => {
  let queueManager;
  let workerPool;
  let mockOrchestrator;
  let eventStore;
  let queueLogger;
  let mockQueue;
  let mockDLQQueue;
  let mockWorkerInstance;

  beforeEach(() => {
    mockQueue = createMockQueue();
    mockDLQQueue = createMockQueue();

    mockWorkerInstance = {
      on: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
      id: 'test-worker',
    };

    const tmpDir = path.join(os.tmpdir(), `queue-int-${Date.now()}`);
    eventStore = new EventStore(tmpDir);
    queueLogger = new QueueLogger(path.join(tmpDir, 'queue'));

    queueManager = new QueueManager({
      eventStore,
      queueLogger,
      queue: mockQueue,
      dlqQueue: mockDLQQueue,
    });

    mockOrchestrator = {
      execute: vi.fn().mockResolvedValue({
        runId: 'run-1',
        status: 'completed',
        squadId: 'squad-copy',
      }),
    };

    workerPool = new QueueWorkerPool({
      orchestrator: mockOrchestrator,
      eventStore,
      queueLogger,
      createWorkerFn: vi.fn(() => mockWorkerInstance),
      queue: mockQueue,
      dlqQueue: mockDLQQueue,
    });
  });

  test('enqueue → process → complete lifecycle', async () => {
    // 1. Enqueue a job
    const result = await queueManager.enqueue('squad-copy', {
      type: 'webhook',
      source: 'n8n',
      offer: 'MEMFR02',
    }, { priority: 3 });

    expect(result.queued).toBe(true);
    expect(result.runId).toContain('squad-copy-');
    expect(mockQueue.jobs).toHaveLength(1);

    // 2. Start worker
    workerPool.start();

    // 3. Simulate worker processing the job
    const job = mockQueue.jobs[0];
    const processResult = await workerPool.processJob(job);

    expect(mockOrchestrator.execute).toHaveBeenCalledWith(
      'squad-copy',
      'default',
      expect.objectContaining({
        type: 'webhook',
        source: 'n8n',
        offer: 'MEMFR02',
      })
    );
    expect(processResult.status).toBe('completed');

    // 4. Cleanup
    await workerPool.stop();
  });

  test('priority ordering — higher priority enqueued first', async () => {
    await queueManager.enqueue('squad-a', { type: 'manual' }, { priority: 10 });
    await queueManager.enqueue('squad-b', { type: 'manual' }, { priority: 1 });
    await queueManager.enqueue('squad-c', { type: 'manual' }, { priority: 5 });

    expect(mockQueue.jobs).toHaveLength(3);

    // Verify priorities set correctly in job data
    expect(mockQueue.jobs[0].data.priority).toBe(10);
    expect(mockQueue.jobs[1].data.priority).toBe(1);
    expect(mockQueue.jobs[2].data.priority).toBe(5);

    // Verify priorities set in job options
    expect(mockQueue.jobs[0].opts.priority).toBe(10);
    expect(mockQueue.jobs[1].opts.priority).toBe(1);
    expect(mockQueue.jobs[2].opts.priority).toBe(5);
  });

  test('queue status reflects enqueued jobs', async () => {
    await queueManager.enqueue('squad-a', { type: 'manual' });
    await queueManager.enqueue('squad-b', { type: 'manual' });

    const status = await queueManager.getStatus();

    expect(status.queue).toBe('squad-runs');
    expect(typeof status.waiting).toBe('number');
    expect(typeof status.active).toBe('number');
    expect(typeof status.timestamp).toBe('string');
  });

  test('DLQ operations — move and list', async () => {
    // Enqueue original job
    await queueManager.enqueue('squad-copy', {
      type: 'webhook',
    }, { priority: 2, runId: 'run-retry-test' });

    const originalJob = mockQueue.jobs[0];
    expect(originalJob).toBeDefined();

    // Move to DLQ
    await queueManager.moveToDLQ(originalJob, 'Test failure');

    // DLQ job should be added
    expect(mockDLQQueue.jobs.length).toBeGreaterThan(0);
  });

  test('multiple concurrent enqueues', async () => {
    const promises = Array.from({ length: 20 }, (_, i) =>
      queueManager.enqueue(`squad-${i}`, { type: 'manual', index: i }, { priority: (i % 10) + 1 })
    );

    const results = await Promise.all(promises);

    expect(results).toHaveLength(20);
    expect(results.every(r => r.queued === true)).toBe(true);
    expect(mockQueue.jobs).toHaveLength(20);
  });

  test('worker processes multiple jobs sequentially', async () => {
    for (let i = 0; i < 5; i++) {
      await queueManager.enqueue('squad-copy', { type: 'manual', index: i });
    }

    workerPool.start();

    for (const job of mockQueue.jobs) {
      await workerPool.processJob(job);
    }

    expect(mockOrchestrator.execute).toHaveBeenCalledTimes(5);
    await workerPool.stop();
  });

  test('overrides propagated through queue to orchestrator', async () => {
    const overrides = {
      method: 'variacao_de_winner',
      geos: ['fr', 'es'],
      skip_phases: ['review'],
    };

    await queueManager.enqueue('squad-copy', {
      type: 'webhook',
      source: 'n8n',
    }, { overrides });

    const job = mockQueue.jobs[0];
    workerPool.start();
    await workerPool.processJob(job);

    expect(mockOrchestrator.execute).toHaveBeenCalledWith(
      'squad-copy',
      'default',
      expect.objectContaining({
        overrides,
      })
    );

    await workerPool.stop();
  });
});
