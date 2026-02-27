/**
 * Retry Handler & Compensation Executor
 *
 * RetryHandler: Retry logic com exponential/linear/fixed backoff e transient error detection.
 * CompensationExecutor: Execução LIFO de compensating transactions (best-effort).
 *
 * Story 2.4: Error Handling — Retry Logic e Compensating Transactions
 *
 * @module retry-handler
 */

const { CircuitBreakerOpenError } = require('./circuit-breaker');

// Default transient HTTP status codes and error codes
const DEFAULT_TRANSIENT_ERRORS = [429, 502, 503, 504, 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'];
const NON_TRANSIENT_STATUS_CODES = [400, 401, 403, 404];

// Default retry configuration
const DEFAULT_RETRY_CONFIG = {
  max_attempts: 3,
  base_delay_ms: 2000,
  strategy: 'exponential',
  transient_errors: DEFAULT_TRANSIENT_ERRORS,
};

/**
 * Erro lançado quando todos os retries são esgotados
 */
class RetryExhaustedError extends Error {
  /**
   * @param {string} stepId - ID do step
   * @param {number} totalAttempts - Total de tentativas feitas
   * @param {Error} finalError - Último erro que causou a falha
   */
  constructor(stepId, totalAttempts, finalError) {
    super(`Retry exhausted for step '${stepId}' after ${totalAttempts} attempts: ${finalError.message}`);
    this.name = 'RetryExhaustedError';
    this.stepId = stepId;
    this.totalAttempts = totalAttempts;
    this.finalError = finalError;
  }
}

/**
 * Calcula delay baseado na estratégia de backoff.
 *
 * @param {string} strategy - 'exponential' | 'linear' | 'fixed'
 * @param {number} baseDelay - Delay base em ms
 * @param {number} attempt - Número da tentativa (1-based)
 * @returns {number} Delay em ms
 */
function calculateDelay(strategy, baseDelay, attempt) {
  switch (strategy) {
    case 'exponential':
      return baseDelay * Math.pow(2, attempt - 1);
    case 'linear':
      return baseDelay * attempt;
    case 'fixed':
      return baseDelay;
    default:
      return baseDelay * Math.pow(2, attempt - 1);
  }
}

/**
 * Classifica se um erro é transiente (retryable) ou não.
 *
 * @param {Error} error - Erro a classificar
 * @param {Array} transientErrors - Lista de status codes/error codes transientes
 * @returns {boolean} true se o erro é transiente
 */
function isTransientError(error, transientErrors = DEFAULT_TRANSIENT_ERRORS) {
  // CircuitBreakerOpenError → always non-transient (fail-fast)
  if (error instanceof CircuitBreakerOpenError) {
    return false;
  }

  // Check HTTP status code
  const statusCode = error.statusCode || error.status || error.code;
  if (typeof statusCode === 'number') {
    if (NON_TRANSIENT_STATUS_CODES.includes(statusCode)) {
      return false;
    }
    if (transientErrors.includes(statusCode)) {
      return true;
    }
  }

  // Check error code (ETIMEDOUT, ECONNRESET, etc.)
  if (error.code && typeof error.code === 'string') {
    if (transientErrors.includes(error.code)) {
      return true;
    }
  }

  return false;
}

/**
 * RetryHandler — wraps async functions com retry logic e backoff.
 *
 * Integração com CircuitBreaker (Story 2.3):
 * - CircuitBreakerOpenError → fail immediately (no retry)
 * - Retry failures contam para o circuit breaker
 *
 * Execution flow:
 *   RetryHandler.retryWithBackoff(
 *     attempt => CircuitBreaker.call(() => actualTask(input))
 *   )
 */
class RetryHandler {
  /**
   * @param {Object} [options]
   * @param {Object} [options.eventStore] - EventStore para logging de retries
   * @param {Function} [options.delayFn] - Override de delay para testes (default: setTimeout)
   */
  constructor(options = {}) {
    this.eventStore = options.eventStore || null;
    this.delayFn = options.delayFn || ((ms) => new Promise(resolve => setTimeout(resolve, ms)));
  }

  /**
   * Wraps uma async function com retry logic.
   *
   * @param {Function} fn - Async function a executar. Recebe (attempt) como argumento.
   * @param {Object} [config] - Retry configuration (override defaults)
   * @param {number} [config.max_attempts] - Máximo de tentativas (default: 3)
   * @param {number} [config.base_delay_ms] - Delay base em ms (default: 2000)
   * @param {string} [config.strategy] - 'exponential' | 'linear' | 'fixed' (default: 'exponential')
   * @param {Array} [config.transient_errors] - Lista de status codes/error codes transientes
   * @param {string} [config.stepId] - ID do step (para eventos)
   * @param {string} [config.runId] - Run ID (para eventos)
   * @returns {Promise<*>} Resultado da function
   * @throws {RetryExhaustedError} Se todos os retries falharem
   */
  async retryWithBackoff(fn, config = {}) {
    const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    const { max_attempts, base_delay_ms, strategy, transient_errors, stepId, runId } = mergedConfig;

    let lastError;

    for (let attempt = 1; attempt <= max_attempts; attempt++) {
      try {
        const result = await fn(attempt);
        return result;
      } catch (error) {
        lastError = error;

        // CircuitBreakerOpenError → fail immediately
        if (error instanceof CircuitBreakerOpenError) {
          throw error;
        }

        // Non-transient error → fail immediately
        if (!isTransientError(error, transient_errors)) {
          throw error;
        }

        // Last attempt → don't wait, throw
        if (attempt >= max_attempts) {
          break;
        }

        // Calculate delay and wait
        const delay = calculateDelay(strategy, base_delay_ms, attempt);

        // Emit step.retry event
        this._emitRetryEvent(runId, stepId, attempt, max_attempts, delay, error);

        await this.delayFn(delay);
      }
    }

    // All retries exhausted
    this._emitRetryExhaustedEvent(runId, stepId, max_attempts, lastError);
    throw new RetryExhaustedError(stepId || 'unknown', max_attempts, lastError);
  }

  /**
   * Emite evento step.retry (fire-and-forget)
   * @private
   */
  _emitRetryEvent(runId, stepId, attempt, maxAttempts, delayMs, error) {
    if (!this.eventStore || !runId) return;
    try {
      this.eventStore.append(runId, 'step.retry', {
        stepId: stepId || 'unknown',
        attempt,
        maxAttempts,
        delay_ms: delayMs,
        error_type: error.name || 'Error',
        error_message: error.message,
      });
    } catch {
      // fire-and-forget
    }
  }

  /**
   * Emite evento step.retry_exhausted (fire-and-forget)
   * @private
   */
  _emitRetryExhaustedEvent(runId, stepId, totalAttempts, error) {
    if (!this.eventStore || !runId) return;
    try {
      this.eventStore.append(runId, 'step.retry_exhausted', {
        stepId: stepId || 'unknown',
        totalAttempts,
        final_error: error.message,
      });
    } catch {
      // fire-and-forget
    }
  }
}

/**
 * CompensationExecutor — executa compensating transactions em ordem LIFO (best-effort).
 *
 * Quando uma fase falha, as compensações dos steps completados são executadas
 * em ordem reversa para cleanup de recursos.
 */
class CompensationExecutor {
  /**
   * @param {Object} [options]
   * @param {Object} [options.eventStore] - EventStore para logging de compensações
   */
  constructor(options = {}) {
    this.eventStore = options.eventStore || null;
  }

  /**
   * Executa compensações em ordem LIFO (reversa).
   *
   * @param {Array<Object>} compensations - Lista de compensações em ordem de execução (serão revertidas)
   *   Cada compensação: { stepId, task, type?, input? }
   * @param {Object} context - Contexto da execução
   * @param {Object} taskExecutor - TaskExecutor para executar as tasks de compensação
   * @param {string} squadName - Nome do squad
   * @param {string} [runId] - Run ID para eventos
   * @returns {Promise<Object>} Summary: { executed, succeeded, failed, errors }
   */
  async executeCompensations(compensations, context, taskExecutor, squadName, runId) {
    if (!compensations || compensations.length === 0) {
      return { executed: 0, succeeded: 0, failed: 0, errors: [] };
    }

    // LIFO — reverse order
    const reversed = [...compensations].reverse();

    // Emit phase.compensating event
    this._emitCompensatingEvent(runId, reversed);

    let succeeded = 0;
    let failed = 0;
    const errors = [];

    for (const comp of reversed) {
      try {
        const step = {
          id: `compensate-${comp.stepId}`,
          task: comp.task,
          type: comp.type || 'task_pura',
          input: comp.input || {},
          force_execute: true, // bypass idempotency cache
        };

        await taskExecutor.executeTask(step, context, squadName, runId);
        succeeded++;
      } catch (error) {
        // Best-effort: log failure but continue
        failed++;
        errors.push({
          stepId: comp.stepId,
          task: comp.task,
          error: error.message,
        });
      }
    }

    return {
      executed: reversed.length,
      succeeded,
      failed,
      errors,
    };
  }

  /**
   * Emite evento phase.compensating (fire-and-forget)
   * @private
   */
  _emitCompensatingEvent(runId, compensations) {
    if (!this.eventStore || !runId) return;
    try {
      this.eventStore.append(runId, 'phase.compensating', {
        phaseName: compensations[0]?.phaseName || 'unknown',
        compensations: compensations.map(c => ({
          stepId: c.stepId,
          task: c.task,
        })),
      });
    } catch {
      // fire-and-forget
    }
  }
}

module.exports = {
  RetryHandler,
  CompensationExecutor,
  RetryExhaustedError,
  isTransientError,
  calculateDelay,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_TRANSIENT_ERRORS,
  NON_TRANSIENT_STATUS_CODES,
};
