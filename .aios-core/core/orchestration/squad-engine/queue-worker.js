/**
 * Queue Worker
 *
 * Worker pool that processes squad-run jobs from the BullMQ queue.
 * Each worker invokes SquadOrchestrator.execute() with job parameters.
 * Supports graceful shutdown via SIGTERM/SIGINT handlers.
 *
 * Story 4.1: Queue-Based Execution — BullMQ Integration
 *
 * @module QueueWorker
 */

const { createWorker } = require('./queue-config');
const { QueueManager } = require('./queue-manager');

/**
 * Creates and manages the worker pool for processing squad runs
 */
class QueueWorkerPool {
  /**
   * @param {Object} options
   * @param {Object} options.orchestrator - SquadOrchestrator instance
   * @param {Object} [options.eventStore] - EventStore instance
   * @param {Object} [options.queueLogger] - QueueLogger instance
   * @param {Object} [options.workerOptions] - BullMQ Worker options override
   * @param {Function} [options.createWorkerFn] - Override worker factory (for testing)
   * @param {Object} [options.queue] - Override main queue instance (for testing)
   * @param {Object} [options.dlqQueue] - Override DLQ queue instance (for testing)
   */
  constructor(options = {}) {
    this.orchestrator = options.orchestrator;
    this.eventStore = options.eventStore || null;
    this.queueLogger = options.queueLogger || null;
    this._createWorkerFn = options.createWorkerFn || createWorker;
    this.queueManager = new QueueManager({
      eventStore: this.eventStore,
      queueLogger: this.queueLogger,
      queue: options.queue,
      dlqQueue: options.dlqQueue,
    });
    this.worker = null;
    this.isShuttingDown = false;
    this._shutdownHandlers = [];
  }

  /**
   * Process a single job from the queue
   * @param {Object} job - BullMQ job instance
   * @returns {Promise<Object>} Execution result
   */
  async processJob(job) {
    const { runId, squadId, trigger, overrides } = job.data;

    // Emit run.dequeued event
    if (this.eventStore) {
      try {
        this.eventStore.append(runId, 'run.dequeued', {
          squadId,
          jobId: job.id,
          workerId: this.worker?.id || 'unknown',
          dequeuedAt: new Date().toISOString(),
        });
      } catch {
        // Non-blocking
      }
    }

    // Log queue event
    if (this.queueLogger) {
      try {
        await this.queueLogger.log('job.active', {
          runId,
          squadId,
          jobId: job.id,
        });
      } catch {
        // Non-blocking
      }
    }

    // Execute the squad pipeline
    const triggerWithOverrides = {
      ...trigger,
      overrides: overrides || {},
    };

    const result = await this.orchestrator.execute(squadId, 'default', triggerWithOverrides);

    // Log completion
    if (this.queueLogger) {
      try {
        await this.queueLogger.log('job.completed', {
          runId,
          squadId,
          jobId: job.id,
          status: result.status,
        });
      } catch {
        // Non-blocking
      }
    }

    return result;
  }

  /**
   * Start the worker pool
   * @returns {Worker} The BullMQ worker instance
   */
  start(workerOptions = {}) {
    if (this.worker) {
      throw new Error('Worker pool already started');
    }

    this.worker = this._createWorkerFn(
      async (job) => this.processJob(job),
      workerOptions
    );

    // Handle job failures — move to DLQ after max attempts
    this.worker.on('failed', async (job, err) => {
      if (this.queueLogger) {
        try {
          await this.queueLogger.log('job.failed', {
            runId: job?.data?.runId,
            jobId: job?.id,
            error: err.message,
            attemptsMade: job?.attemptsMade,
          });
        } catch {
          // Non-blocking
        }
      }

      // Move to DLQ after all retries exhausted
      if (job && job.attemptsMade >= (job.opts?.attempts || 3)) {
        try {
          await this.queueManager.moveToDLQ(job, err.message);
        } catch {
          // Non-blocking: DLQ move failure shouldn't crash worker
        }
      }
    });

    // Handle stalled jobs
    this.worker.on('stalled', async (jobId) => {
      if (this.queueLogger) {
        try {
          await this.queueLogger.log('job.stalled', { jobId });
        } catch {
          // Non-blocking
        }
      }
    });

    // Handle worker errors
    this.worker.on('error', (err) => {
      console.error('[QueueWorker] Worker error:', err.message);
    });

    // Setup graceful shutdown handlers
    this._setupGracefulShutdown();

    return this.worker;
  }

  /**
   * Setup SIGTERM/SIGINT handlers for graceful shutdown
   * @private
   */
  _setupGracefulShutdown() {
    const handler = async (signal) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      console.log(`[QueueWorker] Received ${signal}, shutting down gracefully...`);

      try {
        await this.stop();
        console.log('[QueueWorker] Graceful shutdown complete');
      } catch (err) {
        console.error('[QueueWorker] Error during shutdown:', err.message);
      }
    };

    const sigtermHandler = () => handler('SIGTERM');
    const sigintHandler = () => handler('SIGINT');

    process.on('SIGTERM', sigtermHandler);
    process.on('SIGINT', sigintHandler);

    this._shutdownHandlers = [
      { signal: 'SIGTERM', handler: sigtermHandler },
      { signal: 'SIGINT', handler: sigintHandler },
    ];
  }

  /**
   * Stop the worker pool gracefully (completes current jobs)
   * @returns {Promise<void>}
   */
  async stop() {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }

    // Remove signal handlers
    for (const { signal, handler } of this._shutdownHandlers) {
      process.removeListener(signal, handler);
    }
    this._shutdownHandlers = [];
    this.isShuttingDown = false;
  }

  /**
   * Check if the worker is running
   * @returns {boolean}
   */
  isRunning() {
    return this.worker !== null && !this.isShuttingDown;
  }
}

module.exports = { QueueWorkerPool };
