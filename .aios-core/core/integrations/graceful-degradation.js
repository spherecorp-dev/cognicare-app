/**
 * Graceful Degradation — Skip step on total API failure instead of failing pipeline.
 *
 * When all retries and fallbacks are exhausted, marks step as `skipped` (not `failed`)
 * and allows pipeline to continue. Emits `step.skipped` event.
 *
 * Story 2.5: External API Integrations (AC9)
 *
 * @module graceful-degradation
 */

/**
 * Wraps an async function with graceful degradation.
 * If the function throws after all retries/fallbacks, returns a skip result
 * instead of propagating the error.
 *
 * @param {Function} fn - Async function to execute
 * @param {Object} options
 * @param {string} options.stepId - Step ID for logging
 * @param {Object} [options.eventStore] - EventStore for emitting step.skipped
 * @param {string} [options.runId] - Run ID for events
 * @param {boolean} [options.enabled=true] - Whether graceful degradation is enabled
 * @returns {Promise<Object>} Result or skip marker
 */
async function withGracefulDegradation(fn, options = {}) {
  const { stepId, eventStore, runId, enabled = true } = options;

  try {
    return await fn();
  } catch (error) {
    if (!enabled) {
      throw error;
    }

    // Emit step.skipped event
    if (eventStore && runId) {
      try {
        eventStore.append(runId, 'step.skipped', {
          stepId,
          reason: 'all_retries_exhausted',
          error_type: error.name || 'Error',
          error_message: error.message,
          providers: error.providers || null,
        });
      } catch {
        // fire-and-forget
      }
    }

    // Return skip marker instead of throwing
    return {
      __skipped: true,
      stepId,
      reason: 'all_retries_exhausted',
      error: error.message,
    };
  }
}

/**
 * Checks if a result is a skip marker from graceful degradation.
 *
 * @param {*} result - Result to check
 * @returns {boolean}
 */
function isSkippedResult(result) {
  return result && result.__skipped === true;
}

module.exports = { withGracefulDegradation, isSkippedResult };
