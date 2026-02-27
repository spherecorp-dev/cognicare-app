/**
 * State Manager
 *
 * Gerencia pause/resume de execuções do Squad Orchestrator com persistência de estado.
 * Implementa validação de integridade via SHA256 checksum.
 *
 * Story 1.4: State Manager — Base implementation (File System)
 * Story 4.2: Redis State Cache — Dual write, cache-first read, graceful degradation
 * Story 4.3: MongoDB Historical Storage — Auto-archive on completion
 *
 * @module StateManager
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');
const { EventStore } = require('./event-store');
const { FINAL_STATUSES } = require('./mongo-run-archive');

/**
 * Erro lançado quando o estado está corrompido (checksum inválido)
 */
class StateCorruptionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StateCorruptionError';
  }
}

/**
 * Erro lançado quando o estado é inválido (campos obrigatórios ausentes)
 */
class InvalidStateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidStateError';
  }
}

/**
 * Circuit breaker states for Redis graceful degradation (Story 4.2 AC5)
 */
const CB_CLOSED = 'CLOSED';
const CB_OPEN = 'OPEN';
const CB_HALF_OPEN = 'HALF_OPEN';

/**
 * Gerencia pause/resume de execuções do Squad Orchestrator.
 *
 * Story 4.2 additions:
 * - Dual write: Redis (primary) + File System (backup)
 * - Cache-first read: Redis → File System fallback
 * - TTL management: 24h active, 1h completed
 * - Graceful degradation: circuit breaker for Redis
 */
class StateManager {
  /**
   * @param {string} stateDir - Diretório onde os estados são salvos
   * @param {Object} [options] - Opções adicionais
   * @param {EventStore} [options.eventStore] - EventStore para recovery fallback (Story 1.7)
   * @param {import('./redis-state-adapter').RedisStateAdapter} [options.redisAdapter] - Redis adapter (Story 4.2)
   * @param {import('./mongo-run-archive').MongoRunArchive} [options.mongoArchive] - MongoDB archive (Story 4.3)
   * @param {Object} [options.circuitBreaker] - Circuit breaker config
   * @param {number} [options.circuitBreaker.failureThreshold=3] - Failures before opening
   * @param {number} [options.circuitBreaker.resetTimeout=30000] - ms before OPEN → HALF_OPEN
   */
  constructor(stateDir = '.aios-core/.state', options = {}) {
    this.stateDir = stateDir;
    this.eventStore = options.eventStore || null;

    // Story 4.2: Redis integration
    this.redisAdapter = options.redisAdapter || null;

    // Story 4.3: MongoDB archive integration
    this.mongoArchive = options.mongoArchive || null;

    // Story 4.2 AC5: Circuit breaker for Redis graceful degradation
    const cbConfig = options.circuitBreaker || {};
    this._cb = {
      state: CB_CLOSED,
      failures: 0,
      failureThreshold: cbConfig.failureThreshold ?? 3,
      resetTimeout: cbConfig.resetTimeout ?? 30000,
      lastFailure: null,
      openedAt: null,
      timer: null,
    };
  }

  /**
   * Check if Redis is available (adapter configured + circuit not open)
   * @returns {boolean}
   * @private
   */
  _isRedisAvailable() {
    return this.redisAdapter !== null && this._cb.state !== CB_OPEN;
  }

  /**
   * Record Redis success — resets circuit breaker if in HALF_OPEN
   * @private
   */
  _onRedisSuccess() {
    if (this._cb.state === CB_HALF_OPEN) {
      this._cbTransition(CB_CLOSED);
    }
    this._cb.failures = 0;
  }

  /**
   * Record Redis failure — may open circuit breaker
   * @param {Error} error
   * @private
   */
  _onRedisFailure(error) {
    this._cb.failures++;
    this._cb.lastFailure = Date.now();

    if (this._cb.state === CB_HALF_OPEN) {
      this._cbTransition(CB_OPEN);
      return;
    }

    if (this._cb.state === CB_CLOSED && this._cb.failures >= this._cb.failureThreshold) {
      this._cbTransition(CB_OPEN);
    }
  }

  /**
   * Circuit breaker state transition
   * @param {string} newState
   * @private
   */
  _cbTransition(newState) {
    const oldState = this._cb.state;
    this._cb.state = newState;

    if (newState === CB_OPEN) {
      this._cb.openedAt = Date.now();
      this._cbScheduleHalfOpen();
      console.warn(`[StateManager] Redis degradation mode: ACTIVE (${this._cb.failures} failures)`);
    } else if (newState === CB_HALF_OPEN) {
      console.info('[StateManager] Redis circuit half-open: testing recovery...');
    } else if (newState === CB_CLOSED) {
      this._cb.failures = 0;
      this._cb.openedAt = null;
      this._cbClearTimer();
      console.info('[StateManager] Redis recovery: OK');
    }
  }

  /**
   * Schedule OPEN → HALF_OPEN transition
   * @private
   */
  _cbScheduleHalfOpen() {
    this._cbClearTimer();
    this._cb.timer = setTimeout(() => {
      if (this._cb.state === CB_OPEN) {
        this._cbTransition(CB_HALF_OPEN);
      }
    }, this._cb.resetTimeout);
    if (this._cb.timer.unref) {
      this._cb.timer.unref();
    }
  }

  /**
   * Clear circuit breaker timer
   * @private
   */
  _cbClearTimer() {
    if (this._cb.timer) {
      clearTimeout(this._cb.timer);
      this._cb.timer = null;
    }
  }

  /**
   * Get circuit breaker status for health endpoints
   * @returns {Object}
   */
  getCircuitBreakerStatus() {
    return {
      state: this._cb.state,
      failures: this._cb.failures,
      failureThreshold: this._cb.failureThreshold,
      resetTimeout: this._cb.resetTimeout,
      lastFailure: this._cb.lastFailure,
      redisAvailable: this._isRedisAvailable(),
    };
  }

  /**
   * Pausa uma execução de forma graceful (aguarda task atual terminar)
   *
   * @param {string} runId - ID da execução a ser pausada
   * @param {Object} currentState - Estado atual da execução
   * @param {string} currentState.squadId - ID do squad sendo executado
   * @param {string} currentState.currentTask - Task atual em execução
   * @param {number} currentState.currentTaskIndex - Índice da task atual
   * @param {Array<string>} currentState.completedTasks - Lista de tasks completadas
   * @param {Array<string>} currentState.pendingTasks - Lista de tasks pendentes
   * @param {Object} currentState.context - Contexto da execução
   * @param {number} currentState.timestamp - Timestamp do pause
   * @returns {Promise<void>}
   * @throws {InvalidStateError} Se campos obrigatórios estiverem ausentes
   */
  async pause(runId, currentState) {
    // Validação dos campos obrigatórios
    const requiredFields = ['squadId', 'currentTask', 'currentTaskIndex', 'completedTasks', 'pendingTasks', 'context'];
    for (const field of requiredFields) {
      if (!(field in currentState)) {
        throw new InvalidStateError(`Campo obrigatório ausente: ${field}`);
      }
    }

    // Adiciona timestamp se não existir
    const state = {
      ...currentState,
      timestamp: currentState.timestamp || Date.now(),
      status: 'paused'
    };

    await this.saveState(runId, state);
  }

  /**
   * Salva o estado com dual write strategy (Story 4.2 AC2):
   * 1. Redis write (sync, primary) — with circuit breaker protection
   * 2. File System write (backup) — always attempted
   *
   * If Redis write fails, continues with File System only + warning log.
   *
   * @param {string} runId - ID da execução
   * @param {Object} state - Estado a ser salvo
   * @returns {Promise<void>}
   */
  async saveState(runId, state) {
    // Story 4.2 AC2: Dual write — Redis + File System
    const redisPromise = this._saveToRedis(runId, state);
    const fsPromise = this._saveToFileSystem(runId, state);

    // Redis write is awaited (primary), FS is also awaited for safety
    await Promise.all([redisPromise, fsPromise]);

    // Story 4.3: Auto-archive to MongoDB when run reaches final status
    if (this.mongoArchive && FINAL_STATUSES.has(state.status)) {
      this._archiveToMongo(runId, state).catch(() => {
        // Fire-and-forget — MongoDB failure doesn't block state persistence
      });
    }
  }

  /**
   * Archive completed run to MongoDB (Story 4.3 AC2)
   * @param {string} runId
   * @param {Object} state
   * @returns {Promise<void>}
   * @private
   */
  async _archiveToMongo(runId, state) {
    try {
      // Count events from EventStore if available
      let eventsCount = 0;
      if (this.eventStore) {
        try {
          const events = await this.eventStore.getEvents(runId);
          eventsCount = events.length;
        } catch {
          // Events unavailable — archive with count 0
        }
      }

      const archived = await this.mongoArchive.archive(runId, state, { events_count: eventsCount });

      if (archived && this.eventStore) {
        try {
          this.eventStore.append(runId, 'run.archived', {
            archived_at: new Date().toISOString(),
            target: 'mongodb',
          });
        } catch {
          // Fire-and-forget event logging
        }
      }
    } catch (error) {
      console.warn(`[StateManager] MongoDB archive failed for ${runId}: ${error.message}. State persists in File System.`);
    }
  }

  /**
   * Save state to Redis with circuit breaker protection
   * @param {string} runId
   * @param {Object} state
   * @returns {Promise<void>}
   * @private
   */
  async _saveToRedis(runId, state) {
    if (!this._isRedisAvailable()) return;

    try {
      await this.redisAdapter.set(runId, state);
      this._onRedisSuccess();
    } catch (error) {
      this._onRedisFailure(error);
      console.warn(`[StateManager] Redis save failed for ${runId}: ${error.message}. Using File System only.`);
    }
  }

  /**
   * Save state to File System with checksum (original behavior preserved)
   * @param {string} runId
   * @param {Object} state
   * @returns {Promise<void>}
   * @private
   */
  async _saveToFileSystem(runId, state) {
    // Garante que o diretório existe
    await fs.mkdir(this.stateDir, { recursive: true });

    // Serializa o estado
    const stateYaml = yaml.dump(state);

    // Computa checksum
    const checksum = this.computeChecksum(stateYaml);

    // Adiciona checksum ao YAML
    const stateWithChecksum = yaml.dump({
      ...state,
      checksum
    });

    // Salva no arquivo
    const stateFile = path.join(this.stateDir, `${runId}.state.yaml`);
    await fs.writeFile(stateFile, stateWithChecksum, 'utf8');
  }

  /**
   * Carrega o estado com cache-first read strategy (Story 4.2 AC3):
   * 1. Try Redis (cache hit → return immediately)
   * 2. Redis miss → load from File System → populate Redis cache
   * 3. Redis error → fallback to File System
   * 4. File System also fails → recovery via EventStore or throw
   *
   * @param {string} runId - ID da execução
   * @returns {Promise<Object>} Estado carregado
   * @throws {Error} Se o estado não for encontrado em nenhum store
   * @throws {StateCorruptionError} Se o checksum for inválido
   * @throws {InvalidStateError} Se campos obrigatórios estiverem ausentes
   */
  async loadState(runId) {
    // Story 4.2 AC3: Try Redis first (cache-first read)
    if (this._isRedisAvailable()) {
      try {
        const redisState = await this.redisAdapter.get(runId);
        if (redisState !== null) {
          // Cache hit
          this._onRedisSuccess();
          return redisState;
        }
        // Cache miss — fall through to File System
        this._onRedisSuccess();
      } catch (error) {
        // Redis error — increment fallback, continue to File System
        this._onRedisFailure(error);
        if (this.redisAdapter) {
          this.redisAdapter.incrementFsFallback();
        }
        console.warn(`[StateManager] Redis load failed for ${runId}: ${error.message}. Falling back to File System.`);
      }
    }

    // Load from File System (original behavior)
    const state = await this._loadFromFileSystem(runId);

    // Story 4.2 AC3: Populate Redis cache on cache miss
    if (this._isRedisAvailable() && state) {
      try {
        await this.redisAdapter.set(runId, state);
        this._onRedisSuccess();
      } catch {
        // Fire-and-forget cache population
      }
    }

    return state;
  }

  /**
   * Load state from File System with checksum validation (original loadState logic)
   * @param {string} runId
   * @returns {Promise<Object>}
   * @private
   */
  async _loadFromFileSystem(runId) {
    const stateFile = path.join(this.stateDir, `${runId}.state.yaml`);

    // Verifica se o arquivo existe
    let stateFileExists = true;
    try {
      await fs.access(stateFile);
    } catch (error) {
      stateFileExists = false;
    }

    if (!stateFileExists) {
      // Story 1.7 AC6: Tenta recovery via EventStore se disponível
      if (this.eventStore) {
        return this._recoverFromEvents(runId);
      }
      throw new Error(`Estado não encontrado para runId: ${runId}`);
    }

    // Lê o arquivo
    const stateYaml = await fs.readFile(stateFile, 'utf8');

    // Story 1.7 AC6: Detecta YAML inválido
    let state;
    try {
      state = yaml.load(stateYaml);
      if (!state || typeof state !== 'object') {
        throw new Error('YAML não resultou em objeto válido');
      }
    } catch (error) {
      if (this.eventStore) {
        return this._recoverFromEvents(runId);
      }
      throw new StateCorruptionError(`YAML inválido em state.yaml: ${(error).message}`);
    }

    // Valida integridade
    try {
      await this.validateState(state, stateYaml);
    } catch (error) {
      // Story 1.7 AC6: Checksum mismatch → tenta recovery via EventStore
      if (error instanceof StateCorruptionError && this.eventStore) {
        return this._recoverFromEvents(runId);
      }
      throw error;
    }

    // Remove checksum antes de retornar
    const { checksum, ...stateWithoutChecksum } = state;

    return stateWithoutChecksum;
  }

  /**
   * Recupera estado via EventStore.replay() quando state.yaml está corrompido (AC6)
   *
   * @param {string} runId - ID da execução
   * @returns {Promise<Object>} Estado reconstruído via replay
   * @throws {Error} Se events.jsonl também não estiver disponível
   * @private
   */
  async _recoverFromEvents(runId) {
    const state = await this.eventStore.replay(runId);

    if (!state || state.status === 'unknown') {
      throw new Error(`Recovery falhou: nem state.yaml nem events.jsonl disponíveis para runId: ${runId}`);
    }

    // Loga evento de recovery (fire-and-forget)
    try {
      this.eventStore.append(runId, 'state.recovered', {
        recovered_at: new Date().toISOString(),
        method: 'event_replay',
      });
    } catch {
      // Fire-and-forget — não bloqueia
    }

    return state;
  }

  /**
   * Resume uma execução pausada após validar integridade
   *
   * @param {string} runId - ID da execução a ser resumida
   * @returns {Promise<Object>} Estado validado pronto para resumir
   * @throws {StateCorruptionError} Se o estado estiver corrompido
   * @throws {InvalidStateError} Se campos obrigatórios estiverem ausentes
   */
  async resume(runId) {
    const state = await this.loadState(runId);

    // Verifica se está realmente pausado
    if (state.status !== 'paused') {
      throw new InvalidStateError(`Execução ${runId} não está pausada (status: ${state.status})`);
    }

    return state;
  }

  /**
   * Valida integridade do estado via checksum
   *
   * @param {Object} state - Estado a ser validado
   * @param {string} stateYaml - YAML original do estado
   * @returns {Promise<void>}
   * @throws {StateCorruptionError} Se o checksum for inválido
   * @throws {InvalidStateError} Se campos obrigatórios estiverem ausentes
   */
  async validateState(state, stateYaml) {
    // Valida campos obrigatórios
    const requiredFields = ['squadId', 'currentTask', 'currentTaskIndex', 'completedTasks', 'pendingTasks', 'context', 'timestamp', 'status', 'checksum'];
    for (const field of requiredFields) {
      if (!(field in state)) {
        throw new InvalidStateError(`Campo obrigatório ausente: ${field}`);
      }
    }

    // Extrai checksum do estado
    const { checksum: storedChecksum, ...stateWithoutChecksum } = state;

    // Recomputa checksum
    const stateWithoutChecksumYaml = yaml.dump(stateWithoutChecksum);
    const computedChecksum = this.computeChecksum(stateWithoutChecksumYaml);

    // Compara checksums
    if (storedChecksum !== computedChecksum) {
      throw new StateCorruptionError('Checksum inválido - estado corrompido');
    }
  }

  /**
   * Computa checksum SHA256 de uma string
   *
   * @param {string} data - Dados para computar checksum
   * @returns {string} Checksum em formato hexadecimal
   */
  computeChecksum(data) {
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
  }

  /**
   * Remove estado (Redis + File System)
   *
   * @param {string} runId - ID da execução
   * @returns {Promise<void>}
   */
  async clearState(runId) {
    // Story 4.2: Delete from Redis
    if (this._isRedisAvailable()) {
      try {
        await this.redisAdapter.delete(runId);
        this._onRedisSuccess();
      } catch (error) {
        this._onRedisFailure(error);
      }
    }

    // Delete from File System (original behavior)
    const stateFile = path.join(this.stateDir, `${runId}.state.yaml`);

    try {
      await fs.unlink(stateFile);
    } catch (error) {
      // Ignora se o arquivo não existir
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Lista todas as execuções pausadas
   *
   * @returns {Promise<Array<string>>} Lista de runIds pausados
   */
  async listPausedExecutions() {
    try {
      const files = await fs.readdir(this.stateDir);
      return files
        .filter(file => file.endsWith('.state.yaml'))
        .map(file => file.replace('.state.yaml', ''));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Cleanup — clear circuit breaker timer
   */
  destroy() {
    this._cbClearTimer();
  }
}

module.exports = {
  StateManager,
  StateCorruptionError,
  InvalidStateError
};
