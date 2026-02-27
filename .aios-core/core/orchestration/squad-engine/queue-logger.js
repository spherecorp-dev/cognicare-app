/**
 * Queue Logger
 *
 * Logs queue events to .aios/queue/log.jsonl with log rotation.
 * Tracks: job.added, job.active, job.completed, job.failed, job.stalled,
 * job.moved_to_dlq events.
 *
 * Story 4.1: Queue-Based Execution — BullMQ Integration (AC8)
 *
 * @module QueueLogger
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROTATED_FILES = 5;

/**
 * Logs queue lifecycle events to .aios/queue/log.jsonl
 */
class QueueLogger {
  /**
   * @param {string} [logDir='.aios/queue'] - Directory for queue log files
   */
  constructor(logDir = '.aios/queue') {
    this.logDir = logDir;
    this.logFile = path.join(logDir, 'log.jsonl');
    this._ensureDir();
  }

  /**
   * Ensure the log directory exists
   * @private
   */
  _ensureDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Log a queue event
   * @param {string} eventType - Event type (e.g., 'job.added', 'job.completed')
   * @param {Object} data - Event data
   * @returns {Promise<void>}
   */
  async log(eventType, data = {}) {
    const entry = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    const line = JSON.stringify(entry) + '\n';

    // Check rotation before write
    await this._rotateIfNeeded();

    await fsPromises.appendFile(this.logFile, line, 'utf8');
  }

  /**
   * Synchronous log (for use in event handlers)
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   */
  logSync(eventType, data = {}) {
    const entry = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    const line = JSON.stringify(entry) + '\n';

    try {
      // Quick size check
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        if (stats.size >= MAX_LOG_SIZE) {
          this._rotateSync();
        }
      }
      fs.appendFileSync(this.logFile, line, 'utf8');
    } catch {
      // Non-blocking: logging failures shouldn't crash the system
    }
  }

  /**
   * Rotate log file if it exceeds MAX_LOG_SIZE
   * @private
   * @returns {Promise<void>}
   */
  async _rotateIfNeeded() {
    try {
      const stats = await fsPromises.stat(this.logFile);
      if (stats.size >= MAX_LOG_SIZE) {
        await this._rotate();
      }
    } catch {
      // File doesn't exist yet — no rotation needed
    }
  }

  /**
   * Perform log rotation: log.jsonl → log.1.jsonl, etc.
   * @private
   * @returns {Promise<void>}
   */
  async _rotate() {
    // Remove oldest rotated file
    const oldest = path.join(this.logDir, `log.${MAX_ROTATED_FILES}.jsonl`);
    try {
      await fsPromises.unlink(oldest);
    } catch {
      // File may not exist
    }

    // Shift existing rotated files
    for (let i = MAX_ROTATED_FILES - 1; i >= 1; i--) {
      const from = path.join(this.logDir, `log.${i}.jsonl`);
      const to = path.join(this.logDir, `log.${i + 1}.jsonl`);
      try {
        await fsPromises.rename(from, to);
      } catch {
        // File may not exist
      }
    }

    // Rotate current log to log.1.jsonl
    const first = path.join(this.logDir, 'log.1.jsonl');
    try {
      await fsPromises.rename(this.logFile, first);
    } catch {
      // File may not exist
    }
  }

  /**
   * Synchronous rotation for use in sync log
   * @private
   */
  _rotateSync() {
    try {
      const oldest = path.join(this.logDir, `log.${MAX_ROTATED_FILES}.jsonl`);
      try { fs.unlinkSync(oldest); } catch { /* ignore */ }

      for (let i = MAX_ROTATED_FILES - 1; i >= 1; i--) {
        const from = path.join(this.logDir, `log.${i}.jsonl`);
        const to = path.join(this.logDir, `log.${i + 1}.jsonl`);
        try { fs.renameSync(from, to); } catch { /* ignore */ }
      }

      const first = path.join(this.logDir, 'log.1.jsonl');
      try { fs.renameSync(this.logFile, first); } catch { /* ignore */ }
    } catch {
      // Non-blocking
    }
  }

  /**
   * Read recent log entries
   * @param {Object} [options]
   * @param {number} [options.limit=50] - Max entries to return
   * @param {string} [options.eventType] - Filter by event type
   * @returns {Promise<Array>} Log entries
   */
  async getRecentLogs(options = {}) {
    const { limit = 50, eventType } = options;

    try {
      const content = await fsPromises.readFile(this.logFile, 'utf8');
      let entries = content.trim().split('\n')
        .filter(line => line.trim())
        .map(line => {
          try { return JSON.parse(line); } catch { return null; }
        })
        .filter(e => e !== null);

      if (eventType) {
        entries = entries.filter(e => e.event === eventType);
      }

      return entries.slice(-limit);
    } catch {
      return [];
    }
  }
}

module.exports = { QueueLogger };
