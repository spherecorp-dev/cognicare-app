/**
 * Queue Manager
 *
 * Handles enqueue, priority, queue status, and DLQ operations.
 * Uses BullMQ Queue backed by Redis for squad-runs.
 *
 * Story 4.1: Queue-Based Execution — BullMQ Integration
 *
 * @module QueueManager
 */

const { getQueue, getDLQQueue, QUEUE_NAMES } = require('./queue-config');

/**
 * Manages the squad-runs queue: enqueue, status, DLQ operations
 */
class QueueManager {
  /**
   * @param {Object} [options]
   * @param {Object} [options.eventStore] - EventStore instance for emitting queue events
   * @param {Object} [options.queueLogger] - QueueLogger instance for logging queue events
   * @param {Object} [options.queue] - Override main queue instance (for testing)
   * @param {Object} [options.dlqQueue] - Override DLQ queue instance (for testing)
   */
  constructor(options = {}) {
    this.eventStore = options.eventStore || null;
    this.queueLogger = options.queueLogger || null;
    this._queue = options.queue || null;
    this._dlqQueue = options.dlqQueue || null;
  }

  /** @private Get the main queue (injected or from queue-config) */
  _getQueue() {
    return this._queue || getQueue();
  }

  /** @private Get the DLQ queue (injected or from queue-config) */
  _getDLQQueue() {
    return this._dlqQueue || getDLQQueue();
  }

  /**
   * Generate a unique runId
   * @param {string} squadId - Squad identifier
   * @returns {string} Unique run ID in format {squad}-{timestamp}
   */
  generateRunId(squadId) {
    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, '-').replace('T', '-').replace('Z', '');
    return `${squadId}-${ts}`;
  }

  /**
   * Enqueue a new squad run job
   *
   * @param {string} squadId - The squad to execute
   * @param {Object} trigger - Trigger metadata (type, source, offer, etc.)
   * @param {Object} [options]
   * @param {number} [options.priority=5] - Priority 1-10 (1=highest)
   * @param {Object} [options.overrides] - Runtime overrides
   * @param {string} [options.runId] - Pre-generated runId (if state already initialized)
   * @returns {Promise<{runId: string, queued: boolean, position: number}>}
   */
  async enqueue(squadId, trigger, options = {}) {
    const priority = Math.max(1, Math.min(10, options.priority ?? 5));
    const runId = options.runId || this.generateRunId(squadId);

    const jobData = {
      runId,
      squadId,
      trigger,
      overrides: options.overrides || {},
      priority,
      enqueuedAt: new Date().toISOString(),
    };

    const queue = this._getQueue();
    const job = await queue.add(runId, jobData, {
      priority,
      jobId: runId,
    });

    // Emit run.queued event if EventStore available
    if (this.eventStore) {
      try {
        this.eventStore.append(runId, 'run.queued', {
          squadId,
          trigger,
          priority,
          jobId: job.id,
        });
      } catch {
        // Non-blocking: event emission failure shouldn't break enqueue
      }
    }

    // Log queue event
    if (this.queueLogger) {
      try {
        await this.queueLogger.log('job.added', {
          runId,
          squadId,
          priority,
          jobId: job.id,
        });
      } catch {
        // Non-blocking
      }
    }

    // Get position in queue
    const waiting = await queue.getWaitingCount();

    return {
      runId,
      queued: true,
      position: waiting,
    };
  }

  /**
   * Get queue status metrics
   * @returns {Promise<Object>} Queue metrics
   */
  async getStatus() {
    const queue = this._getQueue();
    const dlqQueue = this._getDLQQueue();

    const [waiting, active, completed, failed, delayed, dlqWaiting] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      dlqQueue.getWaitingCount(),
    ]);

    return {
      queue: QUEUE_NAMES.SQUAD_RUNS,
      waiting,
      active,
      completed,
      failed,
      delayed,
      dlq_count: dlqWaiting,
      total: waiting + active + delayed,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get DLQ jobs (paginated)
   * @param {Object} [options]
   * @param {number} [options.start=0] - Start index
   * @param {number} [options.end=19] - End index
   * @returns {Promise<Array>} DLQ job entries
   */
  async getDLQJobs(options = {}) {
    const { start = 0, end = 19 } = options;
    const dlqQueue = this._getDLQQueue();
    const jobs = await dlqQueue.getWaiting(start, end);

    return jobs.map(job => ({
      jobId: job.id,
      data: job.data,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    }));
  }

  /**
   * Retry a job from the DLQ by re-enqueueing it
   * @param {string} jobId - DLQ job ID to retry
   * @returns {Promise<{runId: string, queued: boolean, retried: boolean}>}
   */
  async retryDLQJob(jobId) {
    const dlqQueue = this._getDLQQueue();
    const job = await dlqQueue.getJob(jobId);

    if (!job) {
      throw new Error(`DLQ job not found: ${jobId}`);
    }

    const { squadId, trigger, priority, overrides } = job.data;
    const runId = job.data.runId;

    // Remove from DLQ
    await job.remove();

    // Re-enqueue in main queue
    const result = await this.enqueue(squadId, trigger, {
      priority,
      overrides,
      runId,
    });

    return {
      ...result,
      retried: true,
    };
  }

  /**
   * Remove a job from the DLQ
   * @param {string} jobId - DLQ job ID to remove
   * @returns {Promise<boolean>} true if removed
   */
  async removeDLQJob(jobId) {
    const dlqQueue = this._getDLQQueue();
    const job = await dlqQueue.getJob(jobId);

    if (!job) {
      throw new Error(`DLQ job not found: ${jobId}`);
    }

    await job.remove();
    return true;
  }

  /**
   * Move a failed job to the DLQ
   * @param {Object} job - BullMQ job instance
   * @param {string} error - Error message
   * @returns {Promise<void>}
   */
  async moveToDLQ(job, error) {
    const dlqQueue = this._getDLQQueue();
    await dlqQueue.add(job.id, {
      ...job.data,
      failedReason: error,
      attemptsMade: job.attemptsMade,
      failedAt: new Date().toISOString(),
      originalQueue: QUEUE_NAMES.SQUAD_RUNS,
    }, {
      jobId: `dlq-${job.id}`,
    });

    if (this.queueLogger) {
      try {
        await this.queueLogger.log('job.moved_to_dlq', {
          runId: job.data.runId,
          jobId: job.id,
          failedReason: error,
          attemptsMade: job.attemptsMade,
        });
      } catch {
        // Non-blocking
      }
    }
  }
}

module.exports = { QueueManager };
