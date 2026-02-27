/**
 * Event Store
 *
 * Gerencia o append-only event log para execuções do Squad Orchestrator.
 * Implementa append, replay e getEvents para audit trail completo.
 *
 * Story 1.7: Event Sourcing — Audit Trail com events.jsonl
 *
 * @module EventStore
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

/**
 * Tipos de eventos válidos emitidos pelo engine
 */
const EVENT_TYPES = [
  'run.started',
  'phase.started',
  'phase.completed',
  'step.started',
  'step.completed',
  'gate.evaluated',
  'run.paused',
  'run.resumed',
  'run.completed',
  'run.failed',
  'run.aborted',
  'state.recovered',
  // Story 3.2: Inter-squad communication events
  'inter_squad.call',
  'inter_squad.completed',
  'inter_squad.timeout',
  'inter_squad.error',
  // Story 4.1: Queue-based execution events
  'run.queued',
  'run.dequeued',
  // Story 4.4: Parallel execution events
  'parallel_group.started',
  'parallel_group.completed',
  'step.failed',
  'step.aborted',
];

/**
 * Erro lançado quando o evento é inválido (campos obrigatórios ausentes)
 */
class InvalidEventError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidEventError';
  }
}

/**
 * Erro lançado quando a recuperação de estado falha
 */
class StateRecoveryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StateRecoveryError';
  }
}

/**
 * Gerencia o event log append-only para execuções de squads
 */
class EventStore {
  /**
   * @param {string} runsDir - Diretório base dos squad runs (padrão: .aios/squad-runs)
   */
  constructor(runsDir = '.aios/squad-runs') {
    this.runsDir = runsDir;
  }

  /**
   * Retorna o caminho do arquivo events.jsonl para um runId
   * @param {string} runId
   * @returns {string}
   */
  getEventsFilePath(runId) {
    return path.join(this.runsDir, runId, 'events.jsonl');
  }

  /**
   * Append de um evento ao log (AC1, AC2, AC4)
   * Usa fs.appendFileSync para atomicidade (<5ms target)
   *
   * @param {string} runId - ID da execução
   * @param {string} eventType - Tipo do evento (ex: 'run.started')
   * @param {Object} data - Dados do evento
   * @returns {void}
   */
  append(runId, eventType, data = {}) {
    // Validação do evento
    if (!runId || typeof runId !== 'string') {
      throw new InvalidEventError('runId é obrigatório e deve ser string');
    }
    if (!eventType || typeof eventType !== 'string') {
      throw new InvalidEventError('eventType é obrigatório e deve ser string');
    }

    const event = {
      event: eventType,
      timestamp: new Date().toISOString(),
      runId,
      data,
    };

    const eventsFile = this.getEventsFilePath(runId);
    const eventLine = JSON.stringify(event) + '\n';

    // Cria diretório se não existir
    const dir = path.dirname(eventsFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Append atômico (<5ms target — AC9)
    fs.appendFileSync(eventsFile, eventLine, 'utf8');
  }

  /**
   * Lê todos os eventos de um run com filtros opcionais (AC1)
   *
   * @param {string} runId - ID da execução
   * @param {Object} [options] - Opções de filtro
   * @param {string} [options.eventType] - Filtrar por tipo de evento
   * @param {string} [options.after] - Filtrar eventos após timestamp (ISO 8601)
   * @param {number} [options.limit] - Limitar número de eventos retornados
   * @returns {Promise<Array<Object>>} Lista de eventos
   */
  async getEvents(runId, options = {}) {
    const eventsFile = this.getEventsFilePath(runId);

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
   * Replay de eventos para reconstruir estado (AC5)
   * Processa todos os eventos e reconstrói o estado compatível com StateManager
   *
   * @param {string} runId - ID da execução
   * @returns {Promise<Object>} Estado reconstruído
   */
  async replay(runId) {
    const events = await this.getEvents(runId);

    if (events.length === 0) {
      return {
        runId,
        squadId: null,
        pipelineName: null,
        status: 'unknown',
        current_phase: null,
        current_step: null,
        context: {},
        phases_completed: [],
        steps_completed: [],
        started_at: null,
        updated_at: null,
      };
    }

    // Estado inicial
    const state = {
      runId,
      squadId: null,
      pipelineName: null,
      status: 'unknown',
      current_phase: null,
      current_step: null,
      context: {},
      phases_completed: [],
      steps_completed: [],
      started_at: null,
      updated_at: null,
    };

    // Processa cada evento como reducer
    for (const event of events) {
      state.updated_at = event.timestamp;

      switch (event.event) {
        case 'run.started':
          state.squadId = event.data.squadId || null;
          state.pipelineName = event.data.playbook || null;
          state.status = 'running';
          state.started_at = event.timestamp;
          if (event.data.trigger) {
            state.trigger = event.data.trigger;
          }
          break;

        case 'phase.started':
          state.current_phase = event.data.phaseName || null;
          break;

        case 'phase.completed':
          if (event.data.phaseName && !state.phases_completed.includes(event.data.phaseName)) {
            state.phases_completed.push(event.data.phaseName);
          }
          state.current_phase = null;
          break;

        case 'step.started':
          state.current_step = event.data.stepId || null;
          break;

        case 'step.completed':
          if (event.data.stepId && !state.steps_completed.includes(event.data.stepId)) {
            state.steps_completed.push(event.data.stepId);
          }
          if (event.data.stepId && event.data.output !== undefined) {
            state.context[event.data.stepId] = { output: event.data.output };
          }
          state.current_step = null;
          break;

        case 'gate.evaluated':
          // Informacional — não muda status
          break;

        case 'run.paused':
          state.status = 'paused';
          state.paused_at = event.timestamp;
          break;

        case 'run.resumed':
          state.status = 'running';
          state.current_step = event.data.resumed_at_step || null;
          break;

        case 'run.completed':
          state.status = 'completed';
          state.completed_at = event.timestamp;
          if (event.data.total_duration_ms !== undefined) {
            state.total_duration_ms = event.data.total_duration_ms;
          }
          break;

        case 'run.failed':
          state.status = 'failed';
          state.error = event.data.error || null;
          state.failed_step = event.data.failed_step || null;
          break;

        case 'run.aborted':
          state.status = 'aborted';
          state.aborted_at = event.timestamp;
          break;

        case 'state.recovered':
          // Log-only — estado já foi reconstruído
          break;

        default:
          // Evento desconhecido — ignora
          break;
      }
    }

    return state;
  }
}

module.exports = {
  EventStore,
  InvalidEventError,
  StateRecoveryError,
  EVENT_TYPES,
};
