/**
 * Gate Evaluator
 *
 * Processes review gates with verdict routing and review round tracking.
 * Supports APPROVED, REVISION_NEEDED, and REJECTED verdicts with
 * configurable max rounds and escalation.
 *
 * Story 2.1: Gate Evaluator — Review Gates com Loops
 *
 * @module GateEvaluator
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const VALID_VERDICTS = ['APPROVED', 'REVISION_NEEDED', 'REJECTED'];
const MAX_ROUNDS_HARD_CAP = 10;
const DEFAULT_MAX_ROUNDS = 3;

/**
 * Error thrown when a gate reaches max review rounds without approval
 */
class GateEscalationError extends Error {
  /**
   * @param {string} gateId - ID of the gate that escalated
   * @param {number} round - Current round number
   * @param {string} reason - Reason for escalation
   */
  constructor(gateId, round, reason = 'max_rounds_reached') {
    super(`Gate "${gateId}" escalated at round ${round}: ${reason}`);
    this.name = 'GateEscalationError';
    this.gateId = gateId;
    this.round = round;
    this.reason = reason;
  }
}

/**
 * Evaluates review gates in the pipeline, processing verdicts and
 * managing review round loops with escalation.
 */
class GateEvaluator {
  /**
   * Validates gate config schema
   * Required fields: id, type, reviewer, on_verdict
   * on_verdict must have APPROVED, REVISION_NEEDED, REJECTED keys
   *
   * @param {Object} gateConfig - Gate configuration from playbook
   * @throws {Error} If required fields are missing
   */
  static validateGateConfig(gateConfig) {
    if (!gateConfig || typeof gateConfig !== 'object') {
      throw new Error('Gate config is required and must be an object');
    }

    const requiredFields = ['id', 'type', 'reviewer', 'on_verdict'];
    const missing = requiredFields.filter(f => !gateConfig[f]);
    if (missing.length > 0) {
      throw new Error(`Gate config missing required fields: ${missing.join(', ')}`);
    }

    if (gateConfig.type !== 'review_gate') {
      throw new Error(`Gate type must be "review_gate", got "${gateConfig.type}"`);
    }

    if (typeof gateConfig.on_verdict !== 'object') {
      throw new Error('on_verdict must be an object');
    }

    const requiredVerdicts = ['APPROVED', 'REVISION_NEEDED', 'REJECTED'];
    const missingVerdicts = requiredVerdicts.filter(v => !gateConfig.on_verdict[v]);
    if (missingVerdicts.length > 0) {
      throw new Error(`on_verdict missing required verdicts: ${missingVerdicts.join(', ')}`);
    }

    // Validate max_rounds if provided
    if (gateConfig.max_rounds !== undefined) {
      if (typeof gateConfig.max_rounds !== 'number' || gateConfig.max_rounds < 1) {
        throw new Error('max_rounds must be a positive number');
      }
      if (gateConfig.max_rounds > MAX_ROUNDS_HARD_CAP) {
        throw new Error(`max_rounds cannot exceed ${MAX_ROUNDS_HARD_CAP}`);
      }
    }
  }

  /**
   * Evaluates a review gate and returns the next step based on verdict
   *
   * @param {Object} gateConfig - Gate configuration from playbook step
   * @param {Object} context - Execution context (mutable, will store gate rounds)
   * @param {Object} eventStore - EventStore instance for logging
   * @param {string} runId - Current run ID
   * @param {string} verdict - The review verdict: APPROVED | REVISION_NEEDED | REJECTED
   * @returns {{ verdict: string, nextStep: string }} Verdict result with next step ID
   * @throws {GateEscalationError} When max rounds reached on REVISION_NEEDED
   * @throws {Error} On invalid config or verdict
   */
  static evaluateReviewGate(gateConfig, context, eventStore, runId, verdict) {
    // Validate config
    GateEvaluator.validateGateConfig(gateConfig);

    // Validate verdict
    if (!VALID_VERDICTS.includes(verdict)) {
      throw new Error(`Invalid verdict "${verdict}". Must be one of: ${VALID_VERDICTS.join(', ')}`);
    }

    const gateId = gateConfig.id;
    const maxRounds = Math.min(
      gateConfig.max_rounds || DEFAULT_MAX_ROUNDS,
      MAX_ROUNDS_HARD_CAP
    );

    // Initialize gate tracking in context if not present
    if (!context.gates) {
      context.gates = {};
    }
    if (!context.gates[gateId]) {
      context.gates[gateId] = { rounds: 0 };
    }

    const gateState = context.gates[gateId];

    // Process verdict
    if (verdict === 'REVISION_NEEDED') {
      // Increment rounds counter
      gateState.rounds += 1;

      // Check escalation before allowing loop
      if (gateState.rounds >= maxRounds) {
        // Emit escalation event (fire-and-forget)
        GateEvaluator._emitEvent(eventStore, runId, 'gate.escalated', {
          gateId,
          round: gateState.rounds,
          reason: 'max_rounds_reached',
        });

        throw new GateEscalationError(gateId, gateState.rounds);
      }
    }

    // Emit gate.evaluated event (fire-and-forget)
    GateEvaluator._emitEvent(eventStore, runId, 'gate.evaluated', {
      gateId,
      verdict,
      round: gateState.rounds,
      max_rounds: maxRounds,
      reviewer: gateConfig.reviewer,
    });

    // Route to next step based on verdict
    const nextStep = gateConfig.on_verdict[verdict];

    return {
      verdict,
      nextStep,
    };
  }

  /**
   * Emits event using fire-and-forget pattern (consistent with Story 1.7)
   * @param {Object} eventStore - EventStore instance
   * @param {string} runId - Run ID
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   * @private
   */
  static _emitEvent(eventStore, runId, eventType, data) {
    try {
      if (eventStore && typeof eventStore.append === 'function') {
        eventStore.append(runId, eventType, data);
      }
    } catch {
      // Fire-and-forget — event write failure does NOT block gate processing
    }
  }
}

module.exports = {
  GateEvaluator,
  GateEscalationError,
  VALID_VERDICTS,
  DEFAULT_MAX_ROUNDS,
  MAX_ROUNDS_HARD_CAP,
};
