/**
 * Circuit Breaker
 *
 * Proteção de APIs externas com padrão circuit breaker (CLOSED/OPEN/HALF_OPEN).
 * Previne cascading failures e desperdício de retries quando API está down.
 *
 * Story 2.3: Circuit Breaker — Proteção de APIs Externas
 *
 * @module CircuitBreaker
 */

// States
const CLOSED = 'CLOSED';
const OPEN = 'OPEN';
const HALF_OPEN = 'HALF_OPEN';

/**
 * Erro lançado quando o circuito está OPEN — fail-fast sem chamar a API
 */
class CircuitBreakerOpenError extends Error {
  /**
   * @param {string} provider - Nome do provider (ex: 'dall-e')
   * @param {string} state - Estado atual do circuito
   * @param {number} retryAfter - Tempo em ms até próxima tentativa
   */
  constructor(provider, state, retryAfter) {
    super(`Circuit breaker OPEN for provider '${provider}'. Retry after ${retryAfter}ms`);
    this.name = 'CircuitBreakerOpenError';
    this.provider = provider;
    this.state = state;
    this.retryAfter = retryAfter;
  }
}

/**
 * Circuit breaker para uma API externa individual.
 *
 * Estados:
 * - CLOSED: Normal, calls passam. Falhas incrementam contador.
 * - OPEN: Bloqueado, calls falham imediatamente com CircuitBreakerOpenError.
 * - HALF_OPEN: Testando, próximo call decide: sucesso→CLOSED, falha→OPEN.
 */
class APICircuitBreaker {
  /**
   * @param {Object} options
   * @param {string} options.name - Nome do provider (ex: 'dall-e', 'whisper')
   * @param {number} [options.failureThreshold=5] - Falhas consecutivas para abrir
   * @param {number} [options.resetTimeout=60000] - Tempo em ms para tentar HALF_OPEN
   * @param {Object} [options.eventStore] - EventStore opcional para logging de transições
   * @param {string} [options.runId] - RunId para contexto de eventos
   */
  constructor({ name, failureThreshold = 5, resetTimeout = 60000, eventStore = null, runId = null } = {}) {
    if (!name) throw new Error('Circuit breaker name is required');

    this.name = name;
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.eventStore = eventStore;
    this.runId = runId;

    this.state = CLOSED;
    this.failures = 0;
    this.lastFailure = null;
    this.lastSuccess = null;
    this.lastError = null;
    this._resetTimer = null;
    this._openedAt = null;
  }

  /**
   * Wraps uma async function com circuit breaker logic.
   * @param {Function} fn - Async function a executar
   * @returns {Promise<*>} Resultado da function
   * @throws {CircuitBreakerOpenError} Se circuito está OPEN
   */
  async call(fn) {
    if (this.state === OPEN) {
      const elapsed = Date.now() - this._openedAt;
      const retryAfter = Math.max(0, this.resetTimeout - elapsed);
      throw new CircuitBreakerOpenError(this.name, this.state, retryAfter);
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure(error);
      throw error;
    }
  }

  /**
   * Registra sucesso — reseta contador, HALF_OPEN → CLOSED
   */
  _onSuccess() {
    this.lastSuccess = Date.now();

    if (this.state === HALF_OPEN) {
      this._transitionTo(CLOSED);
    }

    this.failures = 0;
    this.lastError = null;
  }

  /**
   * Registra falha — incrementa contador, pode abrir circuito
   * @param {Error} error
   */
  _onFailure(error) {
    this.failures++;
    this.lastFailure = Date.now();
    this.lastError = error.message;

    if (this.state === HALF_OPEN) {
      this._transitionTo(OPEN);
      return;
    }

    if (this.state === CLOSED && this.failures >= this.failureThreshold) {
      this._transitionTo(OPEN);
    }
  }

  /**
   * Transição de estado com event logging
   * @param {string} newState
   */
  _transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;

    if (newState === OPEN) {
      this._openedAt = Date.now();
      this._scheduleHalfOpen();
      this._emitEvent('circuit.opened', {
        provider: this.name,
        failures: this.failures,
        threshold: this.failureThreshold,
      });
    } else if (newState === HALF_OPEN) {
      this._emitEvent('circuit.half_opened', {
        provider: this.name,
        timeout_ms: this.resetTimeout,
      });
    } else if (newState === CLOSED) {
      this.failures = 0;
      this._openedAt = null;
      this._clearTimer();
      this._emitEvent('circuit.closed', {
        provider: this.name,
        recovered: true,
      });
    }
  }

  /**
   * Agenda transição OPEN → HALF_OPEN após resetTimeout
   */
  _scheduleHalfOpen() {
    this._clearTimer();
    this._resetTimer = setTimeout(() => {
      if (this.state === OPEN) {
        this._transitionTo(HALF_OPEN);
      }
    }, this.resetTimeout);
    // Não manter o processo vivo apenas pelo timer
    if (this._resetTimer.unref) {
      this._resetTimer.unref();
    }
  }

  /**
   * Limpa timer de reset
   */
  _clearTimer() {
    if (this._resetTimer) {
      clearTimeout(this._resetTimer);
      this._resetTimer = null;
    }
  }

  /**
   * Emite evento via EventStore (fire-and-forget)
   * @param {string} eventType
   * @param {Object} data
   */
  _emitEvent(eventType, data) {
    if (!this.eventStore) return;

    try {
      const runId = this.runId || '__system__';
      this.eventStore.append(runId, eventType, data).catch(() => {
        // fire-and-forget — não bloqueia o circuit breaker
      });
    } catch (_) {
      // fire-and-forget
    }
  }

  /**
   * Retorna status atual do breaker
   * @returns {Object}
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      failureThreshold: this.failureThreshold,
      resetTimeout: this.resetTimeout,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      lastError: this.lastError,
    };
  }

  /**
   * Reset manual para CLOSED
   */
  reset() {
    this._clearTimer();
    this.state = CLOSED;
    this.failures = 0;
    this.lastError = null;
    this._openedAt = null;
  }

  /**
   * Cleanup — limpa timers
   */
  destroy() {
    this._clearTimer();
  }
}

/**
 * Registry de circuit breakers — um por provider.
 * Singleton pattern para manter estado global.
 */
class CircuitBreakerRegistry {
  constructor() {
    this._breakers = new Map();
    this._defaultOptions = {};
  }

  /**
   * Retorna breaker existente ou cria novo
   * @param {string} name - Nome do provider
   * @param {Object} [options] - Opções para novo breaker
   * @returns {APICircuitBreaker}
   */
  getOrCreate(name, options = {}) {
    if (this._breakers.has(name)) {
      return this._breakers.get(name);
    }

    const breaker = new APICircuitBreaker({
      name,
      ...this._defaultOptions,
      ...options,
    });
    this._breakers.set(name, breaker);
    return breaker;
  }

  /**
   * Retorna status de todos os breakers
   * @returns {Object} Mapa { [name]: status }
   */
  getStatus() {
    const status = {};
    for (const [name, breaker] of this._breakers) {
      status[name] = breaker.getStatus();
    }
    return status;
  }

  /**
   * Reset manual de um breaker específico
   * @param {string} name
   * @returns {boolean} true se breaker existia
   */
  reset(name) {
    const breaker = this._breakers.get(name);
    if (breaker) {
      breaker.reset();
      return true;
    }
    return false;
  }

  /**
   * Reset de todos os breakers
   */
  resetAll() {
    for (const breaker of this._breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Cleanup — destroy todos os breakers
   */
  destroy() {
    for (const breaker of this._breakers.values()) {
      breaker.destroy();
    }
    this._breakers.clear();
  }
}

module.exports = {
  APICircuitBreaker,
  CircuitBreakerRegistry,
  CircuitBreakerOpenError,
  CLOSED,
  OPEN,
  HALF_OPEN,
};
