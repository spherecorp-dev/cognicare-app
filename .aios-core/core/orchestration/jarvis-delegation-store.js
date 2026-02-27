/**
 * Jarvis Delegation Store
 *
 * Gerencia o append-only event log para delegações do Jarvis (CEO's AI Chief of Staff).
 * Adaptado do padrão EventStore (squad-engine/event-store.js) para tracking de delegações.
 *
 * Implementa append, replay, getEvents e métodos de consulta para audit trail completo.
 *
 * @module JarvisDelegationStore
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

/**
 * Tipos de eventos válidos para delegações
 */
const DELEGATION_EVENTS = [
  'delegation.created',     // Jarvis creates a delegation
  'delegation.accepted',    // Agent acknowledges
  'delegation.in_progress', // Agent starts working
  'delegation.completed',   // Agent finishes successfully
  'delegation.failed',      // Agent failed
  'delegation.escalated',   // Escalated to CEO or another agent
  'delegation.cancelled',   // CEO cancelled
  'delegation.feedback',    // CEO provides feedback on outcome
];

/**
 * Estados terminais — delegações nestes estados não aparecem em getActiveDelegations
 */
const TERMINAL_STATES = ['completed', 'failed', 'cancelled'];

/**
 * Erro lançado quando o evento de delegação é inválido (campos obrigatórios ausentes)
 */
class InvalidDelegationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidDelegationError';
  }
}

/**
 * Erro lançado quando a recuperação de estado de delegação falha
 */
class DelegationStateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DelegationStateError';
  }
}

/**
 * Gera um delegationId único no formato del-{timestamp36}-{random}
 * @returns {string}
 */
function generateDelegationId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `del-${timestamp}-${random}`;
}

/**
 * Gerencia o event log append-only para delegações do Jarvis
 */
class JarvisDelegationStore {
  /**
   * @param {string} storeDir - Diretório base das delegações (padrão: .aios/jarvis/delegations)
   */
  constructor(storeDir = '.aios/jarvis/delegations') {
    this.storeDir = storeDir;
  }

  /**
   * Retorna o caminho do arquivo JSONL para um delegationId
   * @param {string} delegationId
   * @returns {string}
   */
  getEventsFilePath(delegationId) {
    return path.join(this.storeDir, `${delegationId}.jsonl`);
  }

  /**
   * Retorna o caminho do arquivo de índice
   * @returns {string}
   */
  getIndexFilePath() {
    return path.join(this.storeDir, 'index.json');
  }

  // ---------------------------------------------------------------------------
  // Core operations (mesmo padrão do EventStore)
  // ---------------------------------------------------------------------------

  /**
   * Append de um evento ao log da delegação
   * Usa fs.appendFileSync para atomicidade (<5ms target)
   *
   * @param {string} delegationId - ID da delegação
   * @param {string} eventType - Tipo do evento (DELEGATION_EVENTS)
   * @param {Object} data - Dados do evento
   * @returns {void}
   */
  append(delegationId, eventType, data = {}) {
    // Validação do evento
    if (!delegationId || typeof delegationId !== 'string') {
      throw new InvalidDelegationError('delegationId é obrigatório e deve ser string');
    }
    if (!eventType || typeof eventType !== 'string') {
      throw new InvalidDelegationError('eventType é obrigatório e deve ser string');
    }
    if (!DELEGATION_EVENTS.includes(eventType)) {
      throw new InvalidDelegationError(`eventType inválido: ${eventType}. Válidos: ${DELEGATION_EVENTS.join(', ')}`);
    }

    const event = {
      event: eventType,
      timestamp: new Date().toISOString(),
      delegationId,
      data,
    };

    const eventsFile = this.getEventsFilePath(delegationId);
    const eventLine = JSON.stringify(event) + '\n';

    // Cria diretório se não existir
    const dir = path.dirname(eventsFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Append atômico (<5ms target)
    fs.appendFileSync(eventsFile, eventLine, 'utf8');
  }

  /**
   * Lê todos os eventos de uma delegação com filtros opcionais
   *
   * @param {string} delegationId - ID da delegação
   * @param {Object} [options] - Opções de filtro
   * @param {string} [options.eventType] - Filtrar por tipo de evento
   * @param {string} [options.after] - Filtrar eventos após timestamp (ISO 8601)
   * @param {number} [options.limit] - Limitar número de eventos retornados
   * @returns {Promise<Array<Object>>} Lista de eventos
   */
  async getEvents(delegationId, options = {}) {
    const eventsFile = this.getEventsFilePath(delegationId);

    try {
      await fsPromises.access(eventsFile);
    } catch {
      return [];
    }

    const content = await fsPromises.readFile(eventsFile, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());

    let events = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(event => event !== null);

    // Filtro por tipo de evento
    if (options.eventType) {
      events = events.filter(e => e.event === options.eventType);
    }

    // Filtro por timestamp (após)
    if (options.after) {
      events = events.filter(e => e.timestamp > options.after);
    }

    // Limitar resultados
    if (options.limit && options.limit > 0) {
      events = events.slice(-options.limit);
    }

    return events;
  }

  /**
   * Replay de eventos para reconstruir estado da delegação
   * Processa todos os eventos e reconstrói o estado completo
   *
   * @param {string} delegationId - ID da delegação
   * @returns {Promise<Object>} Estado reconstruído
   */
  async replay(delegationId) {
    const events = await this.getEvents(delegationId);

    if (events.length === 0) {
      return {
        delegationId,
        delegatedTo: null,
        delegatedBy: null,
        task: null,
        businessContext: null,
        priority: null,
        status: 'unknown',
        created_at: null,
        completed_at: null,
        duration_ms: null,
        outcome: null,
        feedback: null,
        events_count: 0,
      };
    }

    // Estado inicial
    const state = {
      delegationId,
      delegatedTo: null,
      delegatedBy: null,
      task: null,
      businessContext: null,
      priority: null,
      status: 'unknown',
      created_at: null,
      completed_at: null,
      duration_ms: null,
      outcome: null,
      feedback: null,
      events_count: events.length,
    };

    // Processa cada evento como reducer
    for (const event of events) {
      switch (event.event) {
        case 'delegation.created':
          state.delegatedTo = event.data.delegatedTo;
          state.delegatedBy = event.data.delegatedBy;
          state.task = event.data.task;
          state.businessContext = event.data.businessContext;
          state.priority = event.data.priority;
          state.status = 'created';
          state.created_at = event.timestamp;
          break;

        case 'delegation.accepted':
          state.status = 'accepted';
          break;

        case 'delegation.in_progress':
          state.status = 'in_progress';
          break;

        case 'delegation.completed':
          state.status = 'completed';
          state.completed_at = event.timestamp;
          state.outcome = event.data.outcome;
          state.duration_ms = event.data.duration_ms;
          break;

        case 'delegation.failed':
          state.status = 'failed';
          state.outcome = event.data.outcome;
          break;

        case 'delegation.escalated':
          state.status = 'escalated';
          break;

        case 'delegation.cancelled':
          state.status = 'cancelled';
          break;

        case 'delegation.feedback':
          state.feedback = event.data.outcome;
          break;

        default:
          // Evento desconhecido — ignora
          break;
      }
    }

    return state;
  }

  // ---------------------------------------------------------------------------
  // Delegation-specific methods
  // ---------------------------------------------------------------------------

  /**
   * Cria uma nova delegação e retorna o delegationId
   * Appends 'delegation.created' event e atualiza o índice
   *
   * @param {string} task - Descrição da tarefa delegada
   * @param {string} delegatedTo - Agent ID (e.g., '@dev', '@qa')
   * @param {string} businessContext - Razão de negócio
   * @param {'critical'|'high'|'medium'|'low'} priority - Prioridade
   * @param {Object} [metadata] - Contexto adicional
   * @returns {string} delegationId gerado
   */
  createDelegation(task, delegatedTo, businessContext, priority = 'medium', metadata = {}) {
    if (!task || typeof task !== 'string') {
      throw new InvalidDelegationError('task é obrigatório e deve ser string');
    }
    if (!delegatedTo || typeof delegatedTo !== 'string') {
      throw new InvalidDelegationError('delegatedTo é obrigatório e deve ser string');
    }

    const delegationId = generateDelegationId();

    this.append(delegationId, 'delegation.created', {
      delegatedTo,
      delegatedBy: 'jarvis',
      task,
      businessContext: businessContext || '',
      priority,
      outcome: null,
      duration_ms: null,
      metadata,
    });

    // Atualiza índice de forma síncrona para consistência
    this._updateIndexSync(delegationId, {
      delegatedTo,
      task,
      status: 'created',
      priority,
      createdAt: new Date().toISOString(),
      completedAt: null,
      duration_ms: null,
    });

    return delegationId;
  }

  /**
   * Atualiza o status de uma delegação existente
   *
   * @param {string} delegationId - ID da delegação
   * @param {string} status - Novo status (deve ser um DELEGATION_EVENTS suffix)
   * @param {Object} [data] - Dados adicionais do evento
   * @returns {Promise<void>}
   */
  async updateStatus(delegationId, status, data = {}) {
    const eventType = `delegation.${status}`;
    if (!DELEGATION_EVENTS.includes(eventType)) {
      throw new InvalidDelegationError(`Status inválido: ${status}. Eventos válidos: ${DELEGATION_EVENTS.map(e => e.replace('delegation.', '')).join(', ')}`);
    }

    this.append(delegationId, eventType, data);

    // Atualiza índice
    const indexUpdate = { status };
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      indexUpdate.completedAt = new Date().toISOString();
      if (data.duration_ms) {
        indexUpdate.duration_ms = data.duration_ms;
      }
    }

    await this._updateIndex(delegationId, indexUpdate);
  }

  /**
   * Retorna o estado completo de uma delegação via replay
   *
   * @param {string} delegationId - ID da delegação
   * @returns {Promise<Object>} Estado reconstruído
   */
  async getDelegation(delegationId) {
    return this.replay(delegationId);
  }

  /**
   * Retorna todas as delegações que NÃO estão em estado terminal
   * (completed, failed, cancelled)
   *
   * @returns {Promise<Array<Object>>} Lista de delegações ativas
   */
  async getActiveDelegations() {
    const index = await this._loadIndex();
    const activeDelegations = [];

    for (const [delegationId, summary] of Object.entries(index.delegations)) {
      if (!TERMINAL_STATES.includes(summary.status)) {
        activeDelegations.push({
          delegationId,
          ...summary,
        });
      }
    }

    return activeDelegations;
  }

  /**
   * Retorna métricas de performance de um agente específico
   *
   * @param {string} agentId - ID do agente (e.g., '@dev')
   * @returns {Promise<Object>} { totalDelegations, completed, failed, avgDuration_ms, successRate }
   */
  async getAgentPerformance(agentId) {
    const index = await this._loadIndex();

    const agentDelegations = Object.values(index.delegations)
      .filter(d => d.delegatedTo === agentId);

    const completed = agentDelegations.filter(d => d.status === 'completed');
    const failed = agentDelegations.filter(d => d.status === 'failed');

    const durations = completed
      .filter(d => d.duration_ms != null)
      .map(d => d.duration_ms);

    const avgDuration_ms = durations.length > 0
      ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
      : null;

    const totalTerminal = completed.length + failed.length;
    const successRate = totalTerminal > 0
      ? Math.round((completed.length / totalTerminal) * 100) / 100
      : null;

    return {
      totalDelegations: agentDelegations.length,
      completed: completed.length,
      failed: failed.length,
      avgDuration_ms,
      successRate,
    };
  }

  /**
   * Retorna histórico filtrado de delegações a partir do índice
   *
   * @param {Object} [options] - Opções de filtro
   * @param {string} [options.agentId] - Filtrar por agente
   * @param {string} [options.status] - Filtrar por status
   * @param {string} [options.after] - Delegações criadas após timestamp (ISO 8601)
   * @param {string} [options.before] - Delegações criadas antes de timestamp (ISO 8601)
   * @param {number} [options.limit] - Limitar número de resultados
   * @returns {Promise<Array<Object>>} Lista filtrada de delegações
   */
  async getDelegationHistory(options = {}) {
    const index = await this._loadIndex();

    let delegations = Object.entries(index.delegations).map(([delegationId, summary]) => ({
      delegationId,
      ...summary,
    }));

    // Filtro por agente
    if (options.agentId) {
      delegations = delegations.filter(d => d.delegatedTo === options.agentId);
    }

    // Filtro por status
    if (options.status) {
      delegations = delegations.filter(d => d.status === options.status);
    }

    // Filtro por timestamp (após)
    if (options.after) {
      delegations = delegations.filter(d => d.createdAt > options.after);
    }

    // Filtro por timestamp (antes)
    if (options.before) {
      delegations = delegations.filter(d => d.createdAt < options.before);
    }

    // Ordenar por data de criação (mais recente primeiro)
    delegations.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    // Limitar resultados
    if (options.limit && options.limit > 0) {
      delegations = delegations.slice(0, options.limit);
    }

    return delegations;
  }

  // ---------------------------------------------------------------------------
  // Index management
  // ---------------------------------------------------------------------------

  /**
   * Carrega o índice de delegações do disco
   * @returns {Promise<Object>} Índice carregado ou estrutura vazia
   */
  async _loadIndex() {
    const indexFile = this.getIndexFilePath();

    try {
      await fsPromises.access(indexFile);
      const content = await fsPromises.readFile(indexFile, 'utf8');
      return JSON.parse(content);
    } catch {
      return {
        version: '1.0',
        lastUpdated: null,
        delegations: {},
      };
    }
  }

  /**
   * Carrega o índice de delegações do disco (síncrono)
   * @returns {Object} Índice carregado ou estrutura vazia
   */
  _loadIndexSync() {
    const indexFile = this.getIndexFilePath();

    try {
      if (fs.existsSync(indexFile)) {
        const content = fs.readFileSync(indexFile, 'utf8');
        return JSON.parse(content);
      }
    } catch {
      // Retorna índice vazio em caso de erro
    }

    return {
      version: '1.0',
      lastUpdated: null,
      delegations: {},
    };
  }

  /**
   * Salva o índice de delegações no disco (async)
   * @param {Object} index - Índice a salvar
   * @returns {Promise<void>}
   */
  async _saveIndex(index) {
    const indexFile = this.getIndexFilePath();

    // Cria diretório se não existir
    const dir = path.dirname(indexFile);
    try {
      await fsPromises.access(dir);
    } catch {
      await fsPromises.mkdir(dir, { recursive: true });
    }

    index.lastUpdated = new Date().toISOString();
    await fsPromises.writeFile(indexFile, JSON.stringify(index, null, 2) + '\n', 'utf8');
  }

  /**
   * Salva o índice de delegações no disco (síncrono)
   * @param {Object} index - Índice a salvar
   * @returns {void}
   */
  _saveIndexSync(index) {
    const indexFile = this.getIndexFilePath();

    // Cria diretório se não existir
    const dir = path.dirname(indexFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    index.lastUpdated = new Date().toISOString();
    fs.writeFileSync(indexFile, JSON.stringify(index, null, 2) + '\n', 'utf8');
  }

  /**
   * Atualiza uma entrada no índice (async)
   * @param {string} delegationId - ID da delegação
   * @param {Object} summary - Campos a atualizar/adicionar
   * @returns {Promise<void>}
   */
  async _updateIndex(delegationId, summary) {
    const index = await this._loadIndex();

    if (!index.delegations[delegationId]) {
      index.delegations[delegationId] = {};
    }
    Object.assign(index.delegations[delegationId], summary);

    await this._saveIndex(index);
  }

  /**
   * Atualiza uma entrada no índice (síncrono — usado por createDelegation)
   * @param {string} delegationId - ID da delegação
   * @param {Object} summary - Campos a atualizar/adicionar
   * @returns {void}
   */
  _updateIndexSync(delegationId, summary) {
    const index = this._loadIndexSync();

    if (!index.delegations[delegationId]) {
      index.delegations[delegationId] = {};
    }
    Object.assign(index.delegations[delegationId], summary);

    this._saveIndexSync(index);
  }
}

module.exports = {
  JarvisDelegationStore,
  InvalidDelegationError,
  DelegationStateError,
  DELEGATION_EVENTS,
  TERMINAL_STATES,
  generateDelegationId,
};
