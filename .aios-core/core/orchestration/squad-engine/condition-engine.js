/**
 * Condition Engine - Story 1.3
 *
 * Validates pre-conditions and post-conditions for task execution
 *
 * Features (7 ACs):
 * - AC1: validate() method receives array of conditions + context
 * - AC2: Resolves source in context ({{path}})
 * - AC3: Validates validation expressions
 * - AC4: Returns { all, blockersFailed, failures }
 * - AC5: Blocker=true → throws error
 * - AC6: Post-conditions validated after task execution
 * - AC7: Registers failures in event log
 *
 * @module core/orchestration/squad-engine/condition-engine
 * @version 1.0.0
 */

class ConditionEngine {
  /**
   * Validates array of conditions against context (AC1)
   * @param {Array} conditions - Array of condition objects
   * @param {Object} context - Accumulated context from previous steps
   * @returns {Promise<Object>} Validation result { all, blockersFailed, failures }
   */
  async validate(conditions, context) {
    if (!conditions || conditions.length === 0) {
      return { all: true, blockersFailed: false, failures: [] };
    }

    const failures = [];

    for (const condition of conditions) {
      const result = await this.validateCondition(condition, context);
      if (!result.passed) {
        failures.push({
          condition: condition.condition,
          source: condition.source,
          validation: condition.validation,
          blocker: condition.blocker || false,
          message: result.message,
        });
      }
    }

    const all = failures.length === 0;
    const blockersFailed = failures.some((f) => f.blocker);

    return { all, blockersFailed, failures };
  }

  /**
   * Validates a single condition
   * @param {Object} condition - Condition object
   * @param {Object} context - Accumulated context
   * @returns {Object} { passed, message }
   */
  async validateCondition(condition, context) {
    // AC2: Resolve source in context
    const value = this.resolveSource(condition.source, context);

    // AC3: Validate validation expression
    const { passed, message } = this.evaluateValidation(
      condition.validation,
      value,
      condition.source
    );

    return { passed, message };
  }

  /**
   * Resolves source path in context (AC2)
   * Supports: {{step.output.field}}, {{step.output.nested.deep}}
   * @param {String} source - Source path (e.g., "{{step.output.field}}")
   * @param {Object} context - Context object
   * @returns {*} Resolved value or undefined
   */
  resolveSource(source, context) {
    // Remove {{ }} wrapper
    const path = source.replace(/^\{\{/, '').replace(/\}\}$/, '').trim();

    // Split path by dots
    const parts = path.split('.');

    // Traverse context
    let current = context;
    for (const part of parts) {
      // Handle array index (e.g., items[0])
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayName, index] = arrayMatch;
        current = current?.[arrayName]?.[parseInt(index, 10)];
      } else {
        current = current?.[part];
      }

      if (current === undefined || current === null) {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Evaluates validation expression (AC3)
   * Supported: "presente", ">= value", "<= value", "== value", ".length >= value"
   * @param {String} validation - Validation expression
   * @param {*} value - Resolved value
   * @param {String} source - Source path (for error messages)
   * @returns {Object} { passed, message }
   */
  evaluateValidation(validation, value, source) {
    // "presente" validation
    if (validation.includes('presente')) {
      const passed = value !== undefined && value !== null;
      return {
        passed,
        message: passed
          ? `Value present at ${source}`
          : `Value missing at ${source} (expected: presente)`,
      };
    }

    // ".length >= value" validation (MUST check BEFORE ">= value" to avoid false matches)
    const lengthGteMatch = validation.match(/\.length\s*>=\s*(\d+)/);
    if (lengthGteMatch) {
      const threshold = parseInt(lengthGteMatch[1], 10);
      const length = Array.isArray(value) ? value.length : 0;
      const passed = length >= threshold;
      return {
        passed,
        message: passed
          ? `Array length ${length} >= ${threshold}`
          : `Array length ${length} < ${threshold} (expected >= ${threshold})`,
      };
    }

    // ">= value" validation
    const gteMatch = validation.match(/>=\s*(\d+)/);
    if (gteMatch) {
      const threshold = parseInt(gteMatch[1], 10);
      const passed = typeof value === 'number' && value >= threshold;
      return {
        passed,
        message: passed
          ? `Value ${value} >= ${threshold}`
          : `Value ${value} < ${threshold} (expected >= ${threshold})`,
      };
    }

    // "<= value" validation
    const lteMatch = validation.match(/<=\s*(\d+)/);
    if (lteMatch) {
      const threshold = parseInt(lteMatch[1], 10);
      const passed = typeof value === 'number' && value <= threshold;
      return {
        passed,
        message: passed
          ? `Value ${value} <= ${threshold}`
          : `Value ${value} > ${threshold} (expected <= ${threshold})`,
      };
    }

    // "== value" validation
    const eqMatch = validation.match(/==\s*(.+)/);
    if (eqMatch) {
      const expected = eqMatch[1].trim().replace(/['"]/g, '');
      const passed = String(value) === expected;
      return {
        passed,
        message: passed
          ? `Value equals ${expected}`
          : `Value ${value} != ${expected} (expected == ${expected})`,
      };
    }

    // Unknown validation
    return {
      passed: false,
      message: `Unknown validation expression: ${validation}`,
    };
  }
}

/**
 * PreConditionError - Thrown when blocker pre-condition fails (AC5)
 */
class PreConditionError extends Error {
  constructor(failures) {
    super(
      `Pre-conditions failed: ${failures.map((f) => f.condition).join(', ')}`
    );
    this.name = 'PreConditionError';
    this.failures = failures;
  }
}

/**
 * PostConditionError - Thrown when blocker post-condition fails (AC6)
 */
class PostConditionError extends Error {
  constructor(failures) {
    super(
      `Post-conditions failed: ${failures.map((f) => f.condition).join(', ')}`
    );
    this.name = 'PostConditionError';
    this.failures = failures;
  }
}

module.exports = { ConditionEngine, PreConditionError, PostConditionError };
