/**
 * Semaphore — Concurrency control for async operations.
 *
 * Limits the number of simultaneously running async tasks.
 *
 * Story 2.5: External API Integrations (AC6)
 *
 * @module semaphore
 */

class Semaphore {
  /**
   * @param {number} [maxConcurrent=5] - Maximum simultaneous tasks
   */
  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
  }

  /**
   * Acquire a slot. Resolves immediately if a slot is available,
   * otherwise queues until one is released.
   *
   * @returns {Promise<void>}
   */
  async acquire() {
    if (this.running < this.maxConcurrent) {
      this.running++;
      return;
    }
    return new Promise(resolve => this.queue.push(resolve));
  }

  /**
   * Release a slot. If tasks are queued, the next one starts immediately.
   */
  release() {
    this.running--;
    if (this.queue.length > 0) {
      this.running++;
      this.queue.shift()();
    }
  }

  /**
   * Current number of running tasks.
   * @returns {number}
   */
  get active() {
    return this.running;
  }

  /**
   * Current number of queued tasks.
   * @returns {number}
   */
  get pending() {
    return this.queue.length;
  }
}

module.exports = { Semaphore };
