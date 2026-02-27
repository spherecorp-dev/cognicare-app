/**
 * API Error Logger
 *
 * Shared error logger for all integration clients.
 * Logs to `.aios/squad-runs/{runId}/logs/api-errors.jsonl` in append-only JSONL format.
 *
 * Story 2.5: External API Integrations
 *
 * @module api-error-logger
 */

const fs = require('fs');
const path = require('path');

class APIErrorLogger {
  /**
   * @param {string} [baseDir] - Base directory for logs (default: process.cwd())
   */
  constructor(baseDir) {
    this.baseDir = baseDir || process.cwd();
  }

  /**
   * Logs an API error to the run-specific log file.
   *
   * @param {string} runId - Run ID for the current execution
   * @param {Object} entry - Error log entry
   * @param {string} entry.provider - Provider name (e.g., 'dall-e', 'whisper')
   * @param {string} entry.error_type - Error classification (e.g., 'rate_limit', 'timeout', 'content_policy')
   * @param {number|string} [entry.status_code] - HTTP status code or error code
   * @param {string} entry.message - Error message
   * @param {number} [entry.retry_attempt] - Current retry attempt number
   */
  log(runId, entry) {
    try {
      const logDir = path.join(this.baseDir, '.aios', 'squad-runs', runId, 'logs');
      fs.mkdirSync(logDir, { recursive: true });

      const logPath = path.join(logDir, 'api-errors.jsonl');
      const logEntry = JSON.stringify({
        timestamp: new Date().toISOString(),
        provider: entry.provider,
        error_type: entry.error_type,
        status_code: entry.status_code || null,
        message: entry.message,
        retry_attempt: entry.retry_attempt || null,
      });

      fs.appendFileSync(logPath, logEntry + '\n', 'utf8');
    } catch {
      // Fire-and-forget — logging failure should not block execution
    }
  }

  /**
   * Reads all error log entries for a run.
   *
   * @param {string} runId - Run ID
   * @returns {Array<Object>} Parsed log entries
   */
  read(runId) {
    try {
      const logPath = path.join(this.baseDir, '.aios', 'squad-runs', runId, 'logs', 'api-errors.jsonl');
      const content = fs.readFileSync(logPath, 'utf8').trim();
      if (!content) return [];
      return content.split('\n').map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }
}

module.exports = { APIErrorLogger };
