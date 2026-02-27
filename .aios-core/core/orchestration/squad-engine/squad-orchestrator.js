/**
 * Squad Orchestration Engine - Core
 * Loads and validates squad playbooks (squad.yaml + pipeline.yaml)
 *
 * Story: 1.1 Squad Orchestrator Core
 * Story: 3.1 Webhook API (execute, getRunState, completeRun)
 * Story: 3.2 Inter-Squad Communication (resolveSquadPath, executeSquad, waitForCompletion, getOutputs, executeAndWait)
 */

const yaml = require('js-yaml');
const fs = require('fs').promises;
const path = require('path');
const { validateSquadSchema } = require('./schemas/squad-schema');
const { validatePipelineSchema } = require('./schemas/pipeline-schema');
const { StateManager } = require('./state-manager');
const { EventStore } = require('./event-store');
const { GateEvaluator } = require('./gate-evaluator');
const { CompensationExecutor } = require('./retry-handler');
const { InterSquadTimeoutError, InterSquadRunError, OverrideValidationError } = require('./errors');
const { validateOverrides } = require('./override-validator');
const { ParallelExecutor } = require('./parallel-executor');
const { ConditionEngine } = require('./condition-engine');
const { resolveProjectRoot } = require('../../utils/resolve-project-root');
const { NotionSync } = require('../notion-sync');

class SquadOrchestrator {
  /**
   * Inicializa o SquadOrchestrator com StateManager
   * @param {string} stateDir - Diretório para armazenar estados (padrão: .aios-core/.state)
   * @param {Object} [options]
   * @param {Object} [options.eventStore] - EventStore para emissão de eventos
   * @param {Object} [options.compensationExecutor] - CompensationExecutor para compensating transactions (Story 2.4)
   * @param {Object} [options.notionSync] - NotionSync instance (or true to auto-create)
   */
  constructor(stateDir = '.aios-core/.state', options = {}) {
    this.eventStore = options.eventStore || new EventStore();
    this.stateManager = new StateManager(stateDir, { eventStore: this.eventStore });
    this.compensationExecutor = options.compensationExecutor || new CompensationExecutor({ eventStore: this.eventStore });
    this.conditionEngine = options.conditionEngine || new ConditionEngine();

    // NotionSync: auto-create if NOTION_API_KEY is configured, unless explicitly disabled
    if (options.notionSync === false) {
      this.notionSync = null;
    } else if (options.notionSync instanceof NotionSync) {
      this.notionSync = options.notionSync;
    } else if (process.env.NOTION_API_KEY && process.env.NOTION_DATABASE_ID) {
      this.notionSync = new NotionSync({ enabled: true });
    } else {
      this.notionSync = null;
    }
  }

  /**
   * Emite evento de forma fire-and-forget (AC8 — non-blocking)
   * @param {string} runId
   * @param {string} eventType
   * @param {Object} data
   * @private
   */
  _emitEvent(runId, eventType, data = {}) {
    try {
      this.eventStore.append(runId, eventType, data);
    } catch {
      // Fire-and-forget — event write failure does NOT stop pipeline (AC8)
    }

    // Notify Notion (fire-and-forget — never blocks pipeline)
    if (this.notionSync) {
      this.notionSync.dispatch(eventType, runId, data).catch(() => {});
    }
  }

  /**
   * Story 3.2 AC7: Resolves squad directory path with fallback.
   * Searches in order:
   *   1. {cwd}/squads/{squadId}/
   *   2. {cwd}/../squads/{squadId}/     (when running from dashboard subdir)
   *   3. {cwd}/.aios-core/squads/{squadId}/
   *   4. {cwd}/../.aios-core/squads/{squadId}/ (when running from dashboard subdir)
   *
   * @param {string} squadName - Name of squad (e.g., 'squad-copy')
   * @returns {Promise<string>} Resolved absolute path to squad directory
   * @throws {Error} If squad not found in any location
   */
  async resolveSquadPath(squadName) {
    const root = resolveProjectRoot();

    const searchPaths = [
      path.join(root, 'squads', squadName),
      path.join(root, '.aios-core', 'squads', squadName),
    ];

    for (const candidatePath of searchPaths) {
      try {
        await fs.access(path.join(candidatePath, 'squad.yaml'));
        return candidatePath;
      } catch {
        // Try next
      }
    }

    throw new Error(
      `Squad not found: ${squadName}. Searched in: ${searchPaths.map(p => p).join(', ')}`
    );
  }

  /**
   * Loads squad and pipeline YAML files
   * @param {string} squadName - Name of squad (e.g., 'squad-copy')
   * @param {string} pipelineName - Name of pipeline (e.g., 'creative-pipeline')
   * @param {Object} [triggerData={}] - Trigger data for initial context interpolation
   * @returns {Promise<Object>} Run object with runId, squadId, pipeline
   */
  async loadSquad(squadName, pipelineName, triggerData = {}) {
    // Story 3.2 AC7: Resolve squad path with fallback
    const squadDir = await this.resolveSquadPath(squadName);

    // 1. Load squad.yaml
    const squadPath = path.join(squadDir, 'squad.yaml');

    let squadContent;
    try {
      squadContent = await fs.readFile(squadPath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to load squad.yaml: ${squadPath} - ${error.message}`);
    }

    let squadYaml;
    try {
      squadYaml = yaml.load(squadContent);
    } catch (error) {
      throw new Error(`Invalid YAML syntax in squad.yaml: ${error.message}`);
    }

    // 2. Validate squad schema
    const squadValidation = validateSquadSchema(squadYaml);
    if (!squadValidation.isValid) {
      throw new Error(`Invalid squad.yaml: ${squadValidation.errors.join(', ')}`);
    }

    // 3. Load pipeline.yaml
    const pipelinePath = path.join(squadDir, 'workflows', `${pipelineName}.yaml`);

    let pipelineContent;
    try {
      pipelineContent = await fs.readFile(pipelinePath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to load pipeline.yaml: ${pipelinePath} - ${error.message}`);
    }

    let pipelineYaml;
    try {
      pipelineYaml = yaml.load(pipelineContent);
    } catch (error) {
      throw new Error(`Invalid YAML syntax in pipeline.yaml: ${error.message}`);
    }

    // 4. Validate pipeline schema
    const pipelineValidation = validatePipelineSchema(pipelineYaml);
    if (!pipelineValidation.isValid) {
      throw new Error(`Invalid pipeline.yaml: ${pipelineValidation.errors.join(', ')}`);
    }

    // 5. Generate runId
    const runId = this.generateRunId(squadName);

    // 6. Load initial context (pass trigger data for {{trigger.offer}} interpolation)
    const context = await this.loadInitialContext(pipelineYaml, triggerData);

    // 7. Initialize state
    await this.initializeState(runId, squadName, pipelineName, pipelineYaml, context);

    // Story 1.7: Emit run.started event
    this._emitEvent(runId, 'run.started', {
      squadId: squadName,
      playbook: pipelineName,
      trigger: { type: 'manual' },
    });

    return {
      runId,
      squadId: squadName,
      pipelineName,
      pipeline: pipelineYaml,
      context,
      phases: pipelineYaml.phases,
    };
  }

  /**
   * Generates unique runId
   * @param {string} squadName
   * @returns {string} runId format: {squad}-{timestamp}
   */
  generateRunId(squadName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `${squadName}-${timestamp}`;
  }

  /**
   * Loads initial context from pipeline definition
   * @param {Object} pipeline - Pipeline YAML object
   * @param {Object} trigger - Trigger data (e.g., { offerId: 'MEMFR02' })
   * @returns {Promise<Object>} Initial context object
   */
  async loadInitialContext(pipeline, trigger) {
    const context = { ...trigger };

    // Apply trigger input defaults from pipeline schema
    // e.g. quantity: { default: 3 } → if trigger.quantity is undefined, set it to 3
    if (pipeline.trigger?.input && context.trigger) {
      for (const [key, schema] of Object.entries(pipeline.trigger.input)) {
        if (context.trigger[key] === undefined && schema && schema.default !== undefined) {
          context.trigger[key] = schema.default;
        }
      }
    }

    if (!pipeline.context || !pipeline.context.load_on_start) {
      return context;
    }

    for (const item of pipeline.context.load_on_start) {
      try {
        // Support both formats:
        // 1. String: "data/file.yaml" → loads as file.yaml
        // 2. Object: {source: "data/file.yaml", as: "custom_name"}
        const sourcePath = typeof item === 'string' ? item : item.source;
        const contextKey = typeof item === 'string'
          ? path.basename(sourcePath, path.extname(sourcePath))
          : item.as;

        // Interpolate trigger data in source path
        const interpolatedPath = this.interpolate(sourcePath, trigger);
        const fullPath = path.join(resolveProjectRoot(), interpolatedPath);
        const content = await fs.readFile(fullPath, 'utf8');

        // Load as YAML or raw text
        if (interpolatedPath.endsWith('.yaml') || interpolatedPath.endsWith('.yml')) {
          context[contextKey] = yaml.load(content);
        } else {
          context[contextKey] = content;
        }
      } catch (error) {
        const itemKey = typeof item === 'string' ? item : item.as;
        console.warn(`Failed to load context item ${itemKey}: ${error.message}`);
        // Continue loading other context items
      }
    }

    return context;
  }

  /**
   * Initializes state file for run
   * @param {string} runId
   * @param {string} squadId
   * @param {string} pipelineName
   * @param {Object} pipeline
   * @param {Object} context
   */
  async initializeState(runId, squadId, pipelineName, pipeline, context) {
    const stateDir = path.join(resolveProjectRoot(), '.aios', 'squad-runs', runId);
    await fs.mkdir(stateDir, { recursive: true });

    const state = {
      runId,
      squadId,
      pipelineName,
      status: 'initialized',
      current_phase: null,
      current_step: null,
      context,
      phases_completed: [],
      steps_completed: [],
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await fs.writeFile(
      path.join(stateDir, 'state.yaml'),
      yaml.dump(state),
      'utf8'
    );
  }

  /**
   * Interpolates variables in string
   * @param {string} str - String with {{var}} placeholders
   * @param {Object} data - Data object
   * @returns {string} Interpolated string
   */
  interpolate(str, data) {
    return str.replace(/\{\{([^}]+)\}\}/g, (match, keyPath) => {
      const value = this._resolveNestedPath(keyPath.trim(), data);
      return value !== undefined ? value : match;
    });
  }

  /**
   * Resolve a dot-notation path in an object (e.g., "trigger.offer" → data.trigger.offer)
   * @private
   */
  _resolveNestedPath(dotPath, data) {
    const parts = dotPath.split('.');
    let current = data;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }

  /**
   * Pausa uma execução de forma graceful (aguarda task atual terminar)
   * @param {string} runId - ID da execução a ser pausada
   * @param {Object} currentState - Estado atual da execução
   * @returns {Promise<void>}
   */
  async pause(runId, currentState) {
    const result = await this.stateManager.pause(runId, currentState);

    // Story 1.7: Emit run.paused event
    this._emitEvent(runId, 'run.paused', {
      reason: 'user-request',
      current_step: currentState.currentTask || null,
    });

    return result;
  }

  /**
   * Resume uma execução pausada
   * @param {string} runId - ID da execução a ser resumida
   * @returns {Promise<Object>} Estado validado pronto para resumir
   */
  async resume(runId) {
    const state = await this.stateManager.resume(runId);

    // Story 1.7: Emit run.resumed event
    this._emitEvent(runId, 'run.resumed', {
      resumed_at_step: state.currentTask || null,
    });

    return state;
  }

  /**
   * Checks if a step is a parallel group
   * Story 4.4: Parallel Groups
   *
   * @param {Object} step - Pipeline step object
   * @returns {boolean}
   */
  isParallelGroup(step) {
    return !!(step && step.type === 'parallel_group');
  }

  /**
   * Executes a parallel group step via ParallelExecutor
   * Story 4.4: Parallel Groups (AC1, AC2, AC5)
   *
   * @param {Object} step - Pipeline step with parallel group config
   * @param {Object} context - Current execution context
   * @param {Function} taskExecutorFn - Function to execute a single task: (task, ctx) => Promise<result>
   * @param {string} runId - Current run ID
   * @returns {Promise<{ results: Object, summary: Object }>} Parallel group results
   */
  async executeParallelGroup(step, context, taskExecutorFn, runId) {
    const parallelExecutor = new ParallelExecutor({
      eventStore: this.eventStore,
      conditionEngine: this.conditionEngine,
    });

    const result = await parallelExecutor.execute(step, context, taskExecutorFn, runId);

    // AC5: Merge parallel results into context
    if (!context.parallel_results) {
      context.parallel_results = {};
    }
    context.parallel_results[step.id] = {};
    for (const [taskId, taskResult] of Object.entries(result.results)) {
      context.parallel_results[step.id][taskId] = {
        status: taskResult.status,
        output: taskResult.output,
        error: taskResult.error,
        duration_ms: taskResult.duration_ms,
      };
    }

    return result;
  }

  /**
   * Checks if a step is a review gate
   * @param {Object} step - Pipeline step object
   * @returns {boolean}
   */
  isReviewGate(step) {
    return !!(step && step.type === 'review_gate');
  }

  /**
   * Executes a review gate step via GateEvaluator
   * Story 2.1: Gate Evaluator Integration (AC7)
   *
   * @param {Object} step - Pipeline step with gate config
   * @param {Object} context - Execution context
   * @param {string} runId - Current run ID
   * @param {string} verdict - Review verdict: APPROVED | REVISION_NEEDED | REJECTED
   * @returns {{ verdict: string, nextStep: string }} Gate result
   */
  executeGate(step, context, runId, verdict) {
    return GateEvaluator.evaluateReviewGate(
      step,
      context,
      this.eventStore,
      runId,
      verdict
    );
  }

  /**
   * Finds a step by ID within the pipeline phases
   * Used for REVISION_NEEDED loop-back navigation
   *
   * @param {Array} phases - Pipeline phases array
   * @param {string} stepId - Step ID to find
   * @returns {{ phase: Object, step: Object, phaseIndex: number, stepIndex: number } | null}
   */
  findStepById(phases, stepId) {
    if (!phases || !stepId) return null;

    for (let pi = 0; pi < phases.length; pi++) {
      const phase = phases[pi];
      const steps = phase.steps || [];
      for (let si = 0; si < steps.length; si++) {
        if (steps[si].id === stepId) {
          return { phase, step: steps[si], phaseIndex: pi, stepIndex: si };
        }
      }
    }
    return null;
  }

  /**
   * Story 2.4: Coleta compensações dos steps completados em uma fase
   *
   * @param {Array} completedSteps - Steps já completados na fase
   * @param {string} phaseName - Nome da fase
   * @returns {Array<Object>} Lista de compensações (em ordem de execução original)
   */
  collectCompensations(completedSteps, phaseName) {
    const compensations = [];
    for (const step of completedSteps) {
      if (step.on_failure && step.on_failure.compensate) {
        compensations.push({
          stepId: step.id,
          task: step.on_failure.compensate,
          type: step.on_failure.compensate_type || 'task_pura',
          input: step.on_failure.compensate_input || {},
          phaseName,
        });
      }
    }
    return compensations;
  }

  /**
   * Story 2.4: Executa compensações para uma fase que falhou
   *
   * @param {Array} completedSteps - Steps completados antes da falha
   * @param {Object} context - Contexto da execução
   * @param {Object} taskExecutor - TaskExecutor para executar compensações
   * @param {string} squadName - Nome do squad
   * @param {string} runId - Run ID
   * @param {string} phaseName - Nome da fase
   * @returns {Promise<Object>} Summary: { executed, succeeded, failed, errors }
   */
  async executePhaseCompensations(completedSteps, context, taskExecutor, squadName, runId, phaseName) {
    const compensations = this.collectCompensations(completedSteps, phaseName);

    if (compensations.length === 0) {
      return { executed: 0, succeeded: 0, failed: 0, errors: [] };
    }

    return this.compensationExecutor.executeCompensations(
      compensations,
      context,
      taskExecutor,
      squadName,
      runId
    );
  }

  /**
   * Lista todas as execuções pausadas
   * @returns {Promise<Array<string>>} Lista de runIds pausados
   */
  async listPausedExecutions() {
    return this.stateManager.listPausedExecutions();
  }

  /**
   * Story 3.1: Executes a squad run with trigger data.
   * Wraps loadSquad() and stores trigger metadata in run state.
   *
   * @param {string} squadName - Name of squad (e.g., 'squad-copy')
   * @param {string} pipelineName - Name of pipeline (e.g., 'creative-pipeline')
   * @param {Object} trigger - Trigger data (type, source, callback_url, etc.)
   * @returns {Promise<Object>} { runId, squadId, pipelineName, status }
   */
  async execute(squadName, pipelineName, trigger = {}) {
    const run = await this.loadSquad(squadName, pipelineName);

    // Update state with trigger data
    const stateDir = path.join(resolveProjectRoot(), '.aios', 'squad-runs', run.runId);
    const statePath = path.join(stateDir, 'state.yaml');
    const stateContent = await fs.readFile(statePath, 'utf8');
    const state = yaml.load(stateContent);

    state.trigger = {
      type: trigger.type || 'manual',
      source: trigger.source || 'unknown',
      callback_url: trigger.callback_url || null,
      event: trigger.event || null,
      data: trigger.data || {},
    };

    // Story 3.3 AC1/AC6: Validate and store overrides
    if (trigger.overrides && Object.keys(trigger.overrides).length > 0) {
      const playbookPhases = (run.pipeline.phases || []).map(p => p.name || p.id);
      const validation = validateOverrides(trigger.overrides, { playbookPhases });
      if (!validation.valid) {
        throw new OverrideValidationError(validation.errors);
      }
      state.trigger.overrides = trigger.overrides;
    }

    state.status = 'running';
    state.updated_at = new Date().toISOString();

    // Story 3.2: Store inter-squad metadata if present
    if (trigger.type === 'inter_squad') {
      state.inter_squad = {
        parentRunId: trigger.parentRunId || null,
        callerSquadId: trigger.caller || null,
        callerStepId: trigger.callerStepId || null,
      };
    }

    await fs.writeFile(statePath, yaml.dump(state), 'utf8');

    // Re-emit run.started with trigger info
    this._emitEvent(run.runId, 'run.started', {
      squadId: squadName,
      playbook: pipelineName,
      trigger: state.trigger,
    });

    return {
      runId: run.runId,
      squadId: squadName,
      pipelineName,
      status: 'running',
      pipeline: run.pipeline,
      context: run.context,
    };
  }

  /**
   * Story 3.2 AC1: Executes a squad with inter-squad trigger support.
   * Creates run with metadata: { parentRunId, callerSquadId, callerStepId }.
   * Emits inter_squad.call event.
   *
   * @param {string} squadId - Squad to execute (e.g., 'squad-copy')
   * @param {Object} [options]
   * @param {string} [options.pipelineName] - Pipeline name (default: first available or 'creative-pipeline')
   * @param {Object} [options.trigger] - Trigger data
   * @param {string} [options.trigger.caller] - Caller squad ID (e.g., 'squad-trafego')
   * @param {string} [options.trigger.parentRunId] - Parent run ID
   * @param {string} [options.trigger.callerStepId] - Caller step ID
   * @param {Object} [options.data] - Additional data for the run
   * @param {number} [options.timeout] - Timeout for waitForCompletion (ms)
   * @param {number} [options.pollInterval] - Poll interval for waitForCompletion (ms)
   * @returns {Promise<Object>} { runId, squadId, status: "running" }
   */
  async executeSquad(squadId, options = {}) {
    const pipelineName = options.pipelineName || 'creative-pipeline';

    const trigger = {
      type: 'inter_squad',
      source: 'inter_squad',
      caller: options.trigger?.caller || null,
      parentRunId: options.trigger?.parentRunId || null,
      callerStepId: options.trigger?.callerStepId || null,
      callback_url: options.trigger?.callback_url || null,
      overrides: options.trigger?.overrides || options.overrides || undefined, // Story 3.3
      data: options.trigger?.data || options.data || {},
    };

    const run = await this.execute(squadId, pipelineName, trigger);

    // AC4: Emit inter_squad.call event
    this._emitEvent(run.runId, 'inter_squad.call', {
      callerSquadId: trigger.caller,
      calleeSquadId: squadId,
      parentRunId: trigger.parentRunId,
      callerStepId: trigger.callerStepId,
    });

    return {
      runId: run.runId,
      squadId,
      status: 'running',
    };
  }

  /**
   * Story 3.2 AC2: Waits for a run to complete using polling.
   * Polls getRunState() at configurable interval.
   *
   * @param {string} runId - Run ID to wait for
   * @param {Object} [options]
   * @param {number} [options.pollInterval] - Polling interval in ms (default: 5000)
   * @param {number} [options.timeout] - Timeout in ms (default: 1800000 = 30 min)
   * @returns {Promise<Object>} { status, duration_ms, outputs_path }
   * @throws {InterSquadTimeoutError} If timeout exceeded
   * @throws {InterSquadRunError} If run fails or is not found
   */
  async waitForCompletion(runId, options = {}) {
    const pollInterval = options.pollInterval || 5000;
    const timeout = options.timeout || 1800000; // 30 minutes
    const startTime = Date.now();

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    while (true) {
      const elapsed = Date.now() - startTime;

      if (elapsed >= timeout) {
        this._emitEvent(runId, 'inter_squad.timeout', {
          timeout_ms: timeout,
          elapsed_ms: elapsed,
        });
        throw new InterSquadTimeoutError(runId, timeout);
      }

      const state = await this.getRunState(runId);

      if (!state) {
        throw new InterSquadRunError(runId, 'not_found', 'Run state not found');
      }

      if (state.status === 'completed') {
        const duration_ms = Date.now() - startTime;
        this._emitEvent(runId, 'inter_squad.completed', {
          runId,
          duration_ms,
        });
        return {
          status: 'completed',
          duration_ms,
          outputs_path: `.aios/squad-runs/${runId}/outputs`,
        };
      }

      if (state.status === 'failed' || state.status === 'aborted') {
        this._emitEvent(runId, 'inter_squad.error', {
          runId,
          status: state.status,
          error: state.error || null,
        });
        throw new InterSquadRunError(runId, state.status, state.error);
      }

      await sleep(pollInterval);
    }
  }

  /**
   * Story 3.2 AC3: Returns structured outputs from a completed run.
   * Reads the outputs/ directory and returns a manifest with file details.
   *
   * @param {string} runId - Run ID to get outputs from
   * @returns {Promise<Object|null>} Output manifest or null if run not completed
   */
  async getOutputs(runId) {
    const state = await this.getRunState(runId);

    if (!state) return null;
    if (state.status !== 'completed') return null;

    const outputsDir = path.join(resolveProjectRoot(), '.aios', 'squad-runs', runId, 'outputs');
    let fileDetails = [];

    try {
      const entries = await fs.readdir(outputsDir);
      for (const entry of entries) {
        const entryPath = path.join(outputsDir, entry);
        try {
          const stat = await fs.stat(entryPath);
          if (stat.isFile()) {
            fileDetails.push({
              path: `outputs/${entry}`,
              type: path.extname(entry).slice(1) || 'unknown',
              size: stat.size,
            });
          }
        } catch {
          // Skip files we can't stat
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      // outputs/ directory doesn't exist — return empty files
    }

    return {
      runId,
      squadId: state.squadId,
      status: state.status,
      files: fileDetails,
      metadata: {
        completed_at: state.completed_at || null,
        duration_ms: state.duration_ms || null,
      },
    };
  }

  /**
   * Story 3.2 AC6: Convenience method combining executeSquad + waitForCompletion + getOutputs.
   * Single call for the most common inter-squad use case.
   *
   * @param {string} squadId - Squad to execute
   * @param {Object} [options] - Same as executeSquad options + waitForCompletion options
   * @returns {Promise<Object>} { runId, status, duration_ms, outputs }
   * @throws {InterSquadTimeoutError} If timeout exceeded
   * @throws {InterSquadRunError} If callee run fails
   */
  async executeAndWait(squadId, options = {}) {
    const run = await this.executeSquad(squadId, options);

    const waitOptions = {
      pollInterval: options.pollInterval || 5000,
      timeout: options.timeout || 1800000,
    };

    const completion = await this.waitForCompletion(run.runId, waitOptions);
    const outputs = await this.getOutputs(run.runId);

    return {
      runId: run.runId,
      status: completion.status,
      duration_ms: completion.duration_ms,
      outputs,
    };
  }

  /**
   * Story 3.1: Gets run state including trigger data.
   * @param {string} runId
   * @returns {Promise<Object|null>} Run state or null if not found
   */
  async getRunState(runId) {
    const statePath = path.join(resolveProjectRoot(), '.aios', 'squad-runs', runId, 'state.yaml');
    try {
      const content = await fs.readFile(statePath, 'utf8');
      return yaml.load(content);
    } catch {
      return null;
    }
  }

  /**
   * Story 3.1: Updates run status and emits completion event.
   * @param {string} runId
   * @param {string} status - 'completed' | 'failed' | 'aborted'
   * @param {Object} data - Additional data (error, outputs_path, duration_ms)
   */
  async completeRun(runId, status, data = {}) {
    const statePath = path.join(resolveProjectRoot(), '.aios', 'squad-runs', runId, 'state.yaml');
    try {
      const content = await fs.readFile(statePath, 'utf8');
      const state = yaml.load(content);

      state.status = status;
      state.completed_at = new Date().toISOString();
      state.updated_at = new Date().toISOString();
      if (data.error) state.error = data.error;
      if (data.error_details) state.error_details = data.error_details;
      if (data.failed_step) state.failed_step = data.failed_step;
      if (data.outputs_path) state.outputs_path = data.outputs_path;
      if (data.duration_ms) state.duration_ms = data.duration_ms;

      await fs.writeFile(statePath, yaml.dump(state), 'utf8');

      this._emitEvent(runId, `run.${status}`, {
        duration_ms: data.duration_ms || 0,
        outputs_path: data.outputs_path || '',
        error: data.error || null,
      });
    } catch {
      // Fire-and-forget
    }
  }

  /**
   * Remove arquivo de estado após conclusão
   * @param {string} runId - ID da execução
   * @returns {Promise<void>}
   */
  async clearState(runId) {
    return this.stateManager.clearState(runId);
  }

  /**
   * Runs a full pipeline: iterates through all phases/steps, executes each via TaskExecutor.
   * Updates state file after each step completion. Respects skip_phases override.
   *
   * @param {string} runId - Run ID from loadSquad/execute
   * @param {string} squadName - Squad name (e.g., 'squad-copy')
   * @param {Object} pipeline - Pipeline YAML object (with phases array)
   * @param {Object} context - Initial run context (with trigger data)
   * @param {Object} [options] - Additional options
   * @param {Object} [options.overrides] - Runtime overrides (skip_phases, etc.)
   * @returns {Promise<Object>} Completion result { status, duration_ms, steps_completed }
   */
  async runPipeline(runId, squadName, pipeline, context, options = {}) {
    const TaskExecutor = require('./task-executor');
    const taskExecutor = new TaskExecutor({ eventStore: this.eventStore });
    const startTime = Date.now();

    const phases = pipeline.phases || [];
    const overrides = options.overrides || {};
    const skipPhases = overrides.skip_phases || [];

    // Merge overrides into context so TaskExecutor can check them
    const runContext = { ...context, overrides };
    const stepsCompleted = [];
    const phasesCompleted = [];

    // Execution logger — writes to run directory
    const logDir = path.join(resolveProjectRoot(), '.aios', 'squad-runs', runId, 'logs');
    await fs.mkdir(logDir, { recursive: true }).catch(() => {});
    const logPath = path.join(logDir, 'execution.log');
    const log = (msg) => {
      const line = `[${new Date().toISOString()}] ${msg}\n`;
      fs.appendFile(logPath, line).catch(() => {});
      console.log(`[Pipeline:${runId.slice(0, 8)}] ${msg}`);
    };

    log(`Pipeline started: ${pipeline.name || squadName} (${phases.length} phases)`);

    try {
      // ═══ AUTO-LOAD: When Intelligence phase is skipped ═══
      // Downstream steps (Strategy, Production) depend on Intelligence outputs.
      // When skipped (e.g. "sem spy"), we auto-load essential data and provide
      // sensible defaults so the creative team can work without references.
      if (skipPhases.some(p => p.toLowerCase().includes('intelligence') || p === '1-Intelligence')) {
        const offerId = runContext.trigger?.offer;
        log(`[Auto-Load] Intelligence phase skipped — loading defaults for offer ${offerId}`);

        // 1. fetch_data: Load offer data from disk (essential for everything)
        if (offerId && !runContext.fetch_data) {
          try {
            const PureTaskRunner = require('./task-types/pure-task-runner');
            const ptr = new PureTaskRunner();
            const fetchResult = await ptr.fetchOfferData({ offer_id: offerId });
            runContext.fetch_data = { output: fetchResult };
            log(`[Auto-Load] fetch_data loaded for offer ${offerId}`);
          } catch (e) {
            log(`[Auto-Load] CRITICAL: Failed to load offer data: ${e.message}`);
          }
        }

        // 2. interpret_data: Derive basic analysis from offer data
        // (Used by suggest_angles as "winners" input)
        if (!runContext.interpret_data && runContext.fetch_data?.output) {
          const offerCtx = runContext.fetch_data.output.offer_context || {};
          const perf = runContext.fetch_data.output.performance || {};
          runContext.interpret_data = {
            output: {
              analysis: {
                offer_name: offerCtx.name || offerId,
                category: offerCtx.category || 'saúde',
                target_audience: offerCtx.target_audience || offerCtx.avatar || 'público geral',
                key_benefits: offerCtx.benefits || offerCtx.key_benefits || [],
                usp: offerCtx.usp || offerCtx.unique_selling_proposition || '',
                pain_points: offerCtx.pain_points || [],
                current_winners: perf.winners || [],
                performance_summary: perf.metrics || {},
                source: 'auto-derived (intelligence phase skipped)',
              },
              recommendation: 'Criar criativos originais sem referência de spy — foco na oferta e público-alvo.',
            },
          };
          log(`[Auto-Load] interpret_data derived from offer context`);
        }

        // 3. deconstruct: Empty patterns (no spy = no references to deconstruct)
        if (!runContext.deconstruct) {
          runContext.deconstruct = {
            output: {
              deconstructions: [],
              patterns: [],
              source: 'empty (intelligence phase skipped — agents will create from scratch)',
            },
          };
          log(`[Auto-Load] deconstruct set to empty (no spy data)`);
        }

        // 4. Spy-related outputs: empty defaults
        if (!runContext.spy_scrape) {
          runContext.spy_scrape = { output: { raw_media: [], spy_manifest: [] } };
        }
        if (!runContext.catalog) {
          runContext.catalog = { output: { cataloged: [] } };
        }
      }

      for (const phase of phases) {
        const phaseName = phase.name || phase.id;

        // Check if this phase should be skipped
        if (skipPhases.includes(phase.id) || skipPhases.includes(phaseName)) {
          phasesCompleted.push(phaseName);
          await this._updateRunState(runId, {
            current_phase: phaseName,
            phases_completed: phasesCompleted,
            status: 'running',
          });
          this._emitEvent(runId, 'phase.skipped', { phase: phaseName, reason: 'skip_phases_override' });
          log(`Phase SKIPPED: ${phaseName} (override)`);
          continue;
        }

        // Update state: entering phase
        await this._updateRunState(runId, {
          current_phase: phaseName,
          status: 'running',
        });
        this._emitEvent(runId, 'phase.started', { phase: phaseName });
        log(`\n========== Phase: ${phaseName} ==========`);

        // Build step index for this phase (enables goto/branching)
        const steps = phase.steps || [];
        const stepMap = {};
        for (const s of steps) {
          stepMap[s.id] = s;
        }

        // Execute steps with flow control (router, on_verdict, on_success, revision loops)
        const revisionCounts = {};
        let currentStepId = steps.length > 0 ? steps[0].id : null;
        const visitedInLoop = new Set();

        while (currentStepId) {
          const step = stepMap[currentStepId];
          if (!step) {
            log(`Step not found: ${currentStepId} — skipping`);
            break;
          }

          // Infinite loop protection
          const loopKey = `${currentStepId}:${revisionCounts[currentStepId] || 0}`;
          if (visitedInLoop.has(loopKey)) {
            log(`Loop detected at step ${currentStepId} — breaking`);
            break;
          }
          visitedInLoop.add(loopKey);

          const stepWithPhase = { ...step, phase: phase.id };
          await this._updateRunState(runId, { current_step: step.id });

          let nextStepId = null;
          const stepStart = Date.now();

          try {
            // ═══ HANDLE STEP BY TYPE ═══

            if (step.type === 'router') {
              // Router: evaluate conditions and jump
              log(`[Router] ${step.id}: evaluating conditions...`);
              const conditions = step.conditions || [];
              let matched = false;

              for (const cond of conditions) {
                const condExpr = cond.if || '';
                // Simple condition evaluation against context
                if (this._evaluateRouterCondition(condExpr, runContext)) {
                  log(`[Router] ${step.id}: matched "${condExpr}" → goto ${cond.goto}`);
                  nextStepId = cond.goto;
                  matched = true;
                  break;
                }
              }

              if (!matched) {
                // Default: try next step in array
                log(`[Router] ${step.id}: no condition matched — continuing to next step`);
                nextStepId = this._getNextStepId(steps, currentStepId);
              }

              stepsCompleted.push(step.id);
              this._emitEvent(runId, 'step.completed', {
                stepId: step.id, type: 'router', matched,
                nextStep: nextStepId, duration_ms: Date.now() - stepStart,
              });

            } else if (step.type === 'output') {
              // Output: terminal step — collect final output, no execution needed
              log(`[Output] ${step.id}: ${step.description || 'handoff'}`);
              stepsCompleted.push(step.id);
              this._emitEvent(runId, 'step.completed', {
                stepId: step.id, type: 'output', duration_ms: Date.now() - stepStart,
              });
              // Output steps have no next — end of phase flow
              nextStepId = null;

            } else if (step.type === 'task_pura' || step.type === 'agent_task') {
              // Real task execution
              const agentLabel = step.agent ? ` (@${step.agent})` : '';
              log(`[${step.type}] ${step.id}${agentLabel}: executing...`);

              const result = await taskExecutor.executeTask(stepWithPhase, runContext, squadName, runId);
              const duration = Date.now() - stepStart;

              // Accumulate output in context
              if (result.output !== null && result.output !== undefined) {
                runContext[step.id] = { output: result.output };
              }

              // Log output summary
              const outputPreview = this._summarizeOutput(result.output);
              log(`[${step.type}] ${step.id}${agentLabel}: completed (${duration}ms) → ${outputPreview}`);

              // Write detailed agent output to separate log
              if (step.type === 'agent_task') {
                const agentLog = path.join(logDir, `agent-${step.id}.json`);
                const agentData = {
                  step_id: step.id,
                  agent: step.agent,
                  task: step.task,
                  timestamp: new Date().toISOString(),
                  duration_ms: duration,
                  input: stepWithPhase.input || {},
                  output: result.output,
                  metadata: result.metadata || {},
                };
                fs.writeFile(agentLog, JSON.stringify(agentData, null, 2)).catch(() => {});
              }

              stepsCompleted.push(step.id);

              // ═══ DETERMINE NEXT STEP (verdict → on_success → array order) ═══
              if (step.on_verdict && result.output) {
                const verdict = this._extractVerdict(result.output);
                if (verdict && step.on_verdict[verdict]) {
                  const maxRounds = step.max_rounds || 3;
                  revisionCounts[step.id] = (revisionCounts[step.id] || 0) + 1;

                  if (verdict !== 'APPROVED' && revisionCounts[step.id] >= maxRounds) {
                    log(`[Verdict] ${step.id}: ${verdict} but max rounds (${maxRounds}) reached — forcing continue`);

                    // ═══ MERGE: move revision/non-approved items into approved ═══
                    // When forcing continue, downstream steps need the items that
                    // were under revision — otherwise they receive empty arrays.
                    if (result.output && typeof result.output === 'object') {
                      const mergeMap = {
                        'revision_needed_concepts': 'approved_concepts',
                        'revision_needed': 'approved_concepts',
                        'needs_revision': 'approved',
                        'regenerate': 'approved_images',
                        'regenerate_images': 'approved_images',
                        'rejected_images': 'approved_images',
                        'rejected_concepts': 'approved_concepts',
                        'rejected': 'approved',
                      };
                      for (const [srcKey, destKey] of Object.entries(mergeMap)) {
                        const src = result.output[srcKey];
                        if (Array.isArray(src) && src.length > 0) {
                          const dest = result.output[destKey];
                          if (Array.isArray(dest)) {
                            log(`[Force-Continue] Merging ${src.length} items from ${srcKey} → ${destKey}`);
                            result.output[destKey] = [...dest, ...src];
                          } else {
                            log(`[Force-Continue] Setting ${destKey} = ${src.length} items from ${srcKey}`);
                            result.output[destKey] = [...src];
                          }
                          // Update runContext (same object reference, but be explicit)
                          runContext[step.id] = { output: result.output };
                        }
                      }
                    }

                    const approvedTarget = step.on_verdict['APPROVED'] || step.on_verdict['approved'];
                    nextStepId = approvedTarget || step.on_success || this._getNextStepId(steps, currentStepId);
                  } else {
                    nextStepId = step.on_verdict[verdict];
                    log(`[Verdict] ${step.id}: ${verdict} → goto ${nextStepId} (round ${revisionCounts[step.id]}/${maxRounds})`);
                  }
                } else {
                  log(`[Verdict] ${step.id}: no verdict extracted from output — using on_success fallback`);
                  nextStepId = step.on_success || this._getNextStepId(steps, currentStepId);
                }
              } else if (step.on_success) {
                nextStepId = step.on_success;
              } else {
                nextStepId = this._getNextStepId(steps, currentStepId);
              }

            } else {
              // Unknown type — skip gracefully
              log(`[WARN] Unknown step type: ${step.type} at ${step.id} — skipping`);
              stepsCompleted.push(step.id);
              nextStepId = step.on_success || this._getNextStepId(steps, currentStepId);
            }

          } catch (stepError) {
            const duration = Date.now() - stepStart;
            log(`[ERROR] ${step.id} failed (${duration}ms): ${stepError.message}`);

            // Write error details to log
            const errorLog = path.join(logDir, `error-${step.id}.json`);
            fs.writeFile(errorLog, JSON.stringify({
              step_id: step.id,
              error: stepError.message,
              stack: stepError.stack,
              timestamp: new Date().toISOString(),
              duration_ms: duration,
            }, null, 2)).catch(() => {});

            this._emitEvent(runId, 'step.failed', {
              stepId: step.id, error: stepError.message, duration_ms: duration,
            });

            // ═══ HALT ON ANY STEP FAILURE ═══
            // Se algo falhou, PARA o pipeline. Não continua entregando resultado incompleto.
            // O estado será salvo com detalhes do erro para que o Jarvis possa reportar.
            const humanError = this._toHumanReadableError(step.id, stepError.message);
            log(`[HALT] Pipeline parou no passo "${step.id}": ${humanError}`);

            // Update state with clear error info before rethrowing
            await this._updateRunState(runId, {
              status: 'failed',
              current_step: step.id,
              error: humanError,
              error_details: {
                step_id: step.id,
                step_description: step.description || step.id,
                agent: step.agent || null,
                phase: phaseName,
                technical_error: stepError.message,
                human_message: humanError,
                timestamp: new Date().toISOString(),
              },
              steps_completed: stepsCompleted,
              phases_completed: phasesCompleted,
            });

            throw new Error(`Step "${step.id}" falhou: ${humanError}`);
          }

          await this._updateRunState(runId, { steps_completed: stepsCompleted });

          // Check if next step is in a DIFFERENT phase (cross-phase goto)
          if (nextStepId && !stepMap[nextStepId]) {
            // Step not in current phase — might be in next phase, break to let phase loop handle it
            log(`Step ${nextStepId} not in phase ${phaseName} — ending phase`);
            break;
          }

          currentStepId = nextStepId;
        }

        phasesCompleted.push(phaseName);
        await this._updateRunState(runId, {
          phases_completed: phasesCompleted,
          current_step: null,
        });
        this._emitEvent(runId, 'phase.completed', { phase: phaseName });
        log(`Phase completed: ${phaseName} (${stepsCompleted.length} steps total)`);
      }

      // Pipeline completed successfully
      const durationMs = Date.now() - startTime;
      await this.completeRun(runId, 'completed', { duration_ms: durationMs });
      log(`\n✅ Pipeline COMPLETED in ${(durationMs / 1000).toFixed(1)}s (${stepsCompleted.length} steps, ${phasesCompleted.length} phases)`);

      return {
        status: 'completed',
        duration_ms: durationMs,
        steps_completed: stepsCompleted,
        phases_completed: phasesCompleted,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      // Extract failed step from error message if it's a poisoned input error
      const failedStepMatch = error.message.match(/Step "([^"]+)"/);
      const failedStep = failedStepMatch ? failedStepMatch[1] : 'unknown';
      await this.completeRun(runId, 'failed', {
        error: error.message,
        failed_step: failedStep,
        duration_ms: durationMs,
      });
      log(`\n❌ Pipeline FAILED at step "${failedStep}" in ${(durationMs / 1000).toFixed(1)}s: ${error.message}`);

      return {
        status: 'failed',
        error: error.message,
        duration_ms: durationMs,
        steps_completed: stepsCompleted,
        phases_completed: phasesCompleted,
      };
    }
  }

  /**
   * Translates technical step errors into human-readable messages.
   * Used when pipeline halts to inform the user via Jarvis.
   * @private
   */
  _toHumanReadableError(stepId, errorMessage) {
    // Step name mapping (technical → human)
    const stepNames = {
      'fetch_data': 'Carregar dados da oferta',
      'spy_scrape': 'Pesquisa de referências (spy)',
      'catalog_references': 'Catalogar referências',
      'deconstruct_references': 'Analisar referências',
      'interpret_data': 'Entender a oferta',
      'suggest_angles': 'Criar ângulos criativos',
      'select_method': 'Definir método de criação',
      'decide_format': 'Decidir formatos de conteúdo',
      'generate_image_concepts': 'Gerar conceitos de imagem',
      'generate_scripts': 'Criar scripts de vídeo',
      'review_creative': 'Revisar criativos',
      'review_image_concept': 'Revisar conceitos de imagem',
      'generate_image_prompts': 'Preparar prompts de imagem',
      'generate_images_api': 'Gerar imagens',
      'review_generated_image': 'Revisar imagens geradas',
      'package_image': 'Empacotar criativos',
      'image_revision_loop': 'Revisão de imagens',
    };

    const stepName = stepNames[stepId] || stepId;

    // Error type mapping (technical → human)
    if (errorMessage.includes('poisoned input') || errorMessage.includes('unresolved')) {
      return `O passo "${stepName}" não recebeu dados necessários de um passo anterior. Provavelmente algo falhou antes.`;
    }
    if (errorMessage.includes('ANTHROPIC_API_KEY') || errorMessage.includes('API key')) {
      return `O passo "${stepName}" não conseguiu se comunicar com a IA. A chave de API pode estar incorreta.`;
    }
    if (errorMessage.includes('rate_limit') || errorMessage.includes('429')) {
      return `O passo "${stepName}" foi bloqueado por limite de requisições. Aguarde um momento e tente novamente.`;
    }
    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      return `O passo "${stepName}" demorou demais e foi cancelado. Tente novamente.`;
    }
    if (errorMessage.includes('ENOENT') || errorMessage.includes('not found')) {
      return `O passo "${stepName}" não encontrou um arquivo necessário. Verifique se os dados da oferta estão completos.`;
    }
    if (errorMessage.includes('parse') || errorMessage.includes('JSON') || errorMessage.includes('_parseError')) {
      return `O passo "${stepName}" recebeu uma resposta que não conseguiu entender. Pode ser necessário tentar novamente.`;
    }

    // Default: simplify but keep context
    return `O passo "${stepName}" encontrou um problema: ${errorMessage.slice(0, 150)}`;
  }

  /**
   * Evaluates a simple router condition against context.
   * Supports: "format == imagem", "method == variacao_de_winner"
   * @private
   */
  _evaluateRouterCondition(condExpr, context) {
    try {
      // Parse "field == value" expressions
      const eqMatch = condExpr.match(/^(\w+)\s*==\s*(.+)$/);
      if (eqMatch) {
        const [, field, expected] = eqMatch;
        const expectedClean = expected.trim().replace(/^["']|["']$/g, '');

        // Search context for the field (check in all step outputs)
        for (const key of Object.keys(context)) {
          const stepData = context[key];
          if (stepData && stepData.output) {
            const output = stepData.output;
            // Direct field match
            if (output[field] === expectedClean) return true;
            // Check format_assignments for format-related conditions
            if (output.format_assignments) {
              const assignments = output.format_assignments;
              if (Array.isArray(assignments)) {
                if (assignments.some(a => a[field] === expectedClean || a.format === expectedClean)) return true;
              } else if (typeof assignments === 'object') {
                if (assignments[field] === expectedClean) return true;
              }
            }
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Extracts verdict from agent task output.
   * Looks for: output.verdict, output.decision, or categorizes based on approved/rejected arrays.
   * @private
   */
  _extractVerdict(output) {
    if (!output || typeof output !== 'object') return null;

    // Direct verdict field
    if (output.verdict) return output.verdict.toUpperCase();
    if (output.decision) return output.decision.toUpperCase();
    if (output.status) {
      const s = output.status.toUpperCase();
      if (['APPROVED', 'REVISION_NEEDED', 'REJECTED', 'REGENERATE'].includes(s)) return s;
    }

    // Infer from arrays
    if (output.approved_concepts?.length > 0 || output.approved?.length > 0 || output.approved_images?.length > 0) {
      if (output.revision_needed?.length > 0 || output.needs_revision?.length > 0) return 'REVISION_NEEDED';
      if (output.regenerate?.length > 0) return 'REGENERATE';
      return 'APPROVED';
    }
    if (output.rejected?.length > 0 && !output.approved?.length && !output.approved_concepts?.length) {
      return 'REJECTED';
    }

    // If output has any content, treat as approved (resilience)
    return 'APPROVED';
  }

  /**
   * Gets the next step ID in array order after currentStepId.
   * @private
   */
  _getNextStepId(steps, currentStepId) {
    const idx = steps.findIndex(s => s.id === currentStepId);
    if (idx >= 0 && idx < steps.length - 1) {
      return steps[idx + 1].id;
    }
    return null; // End of phase
  }

  /**
   * Creates a short summary of step output for logging.
   * @private
   */
  _summarizeOutput(output) {
    if (output === null || output === undefined) return '(no output)';
    if (typeof output === 'string') return output.slice(0, 100);
    if (typeof output !== 'object') return String(output);

    const keys = Object.keys(output);
    if (keys.length === 0) return '{}';

    // Show keys and value types
    const parts = keys.slice(0, 5).map(k => {
      const v = output[k];
      if (Array.isArray(v)) return `${k}:[${v.length}]`;
      if (typeof v === 'object' && v !== null) return `${k}:{...}`;
      if (typeof v === 'string') return `${k}:"${v.slice(0, 30)}"`;
      return `${k}:${v}`;
    });
    if (keys.length > 5) parts.push(`+${keys.length - 5} more`);
    return `{ ${parts.join(', ')} }`;
  }

  /**
   * Updates specific fields in a run's state.yaml
   * @param {string} runId
   * @param {Object} updates - Fields to merge into state
   * @private
   */
  async _updateRunState(runId, updates) {
    const statePath = path.join(resolveProjectRoot(), '.aios', 'squad-runs', runId, 'state.yaml');
    try {
      const content = await fs.readFile(statePath, 'utf8');
      const state = yaml.load(content);
      Object.assign(state, updates, { updated_at: new Date().toISOString() });
      await fs.writeFile(statePath, yaml.dump(state), 'utf8');
    } catch {
      // Non-blocking state update
    }
  }
}

module.exports = SquadOrchestrator;
