/**
 * Squad Engine Errors
 * Story 3.2: Inter-Squad Communication — Squad-to-Squad Calls
 * Story 3.3: Override System — Runtime Parameter Overrides
 *
 * AC2: InterSquadTimeoutError — thrown when waitForCompletion exceeds timeout
 * AC2: InterSquadRunError — thrown when callee run fails or aborts
 * AC6: OverrideValidationError — thrown when override validation fails
 */

class InterSquadTimeoutError extends Error {
  /**
   * @param {string} runId - The run that timed out
   * @param {number} timeoutMs - The timeout duration in milliseconds
   */
  constructor(runId, timeoutMs) {
    super(`Inter-squad call timed out after ${timeoutMs}ms for run ${runId}`);
    this.name = 'InterSquadTimeoutError';
    this.runId = runId;
    this.timeoutMs = timeoutMs;
  }
}

class InterSquadRunError extends Error {
  /**
   * @param {string} runId - The run that failed
   * @param {string} status - Final status ('failed' | 'aborted' | 'not_found')
   * @param {string} [error] - Original error message
   */
  constructor(runId, status, error) {
    super(`Inter-squad run ${runId} ${status}${error ? `: ${error}` : ''}`);
    this.name = 'InterSquadRunError';
    this.runId = runId;
    this.status = status;
    this.originalError = error || null;
  }
}

// Re-export OverrideValidationError from override-validator (Story 3.3)
const { OverrideValidationError } = require('./override-validator');

module.exports = {
  InterSquadTimeoutError,
  InterSquadRunError,
  OverrideValidationError,
};
