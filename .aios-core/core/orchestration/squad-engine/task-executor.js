/**
 * Task Executor - Story 1.2
 *
 * Epic: Squad Orchestration Engine
 *
 * Executes task steps from pipeline (task_pura and agent_task).
 *
 * Features:
 * - AC1: Load task file from squads/{name}/tasks/{task}.md
 * - AC2: Execute task_pura (JavaScript functions/scripts)
 * - AC3: Execute agent_task (invoke AgentInvoker)
 * - AC4: Input interpolation with {{context.field}} syntax
 * - AC5: Return structured output with metadata
 * - AC6: Save output to context accumulation
 *
 * @module core/orchestration/squad-engine/task-executor
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const PureTaskRunner = require('./task-types/pure-task-runner');
const AgentTaskRunner = require('./task-types/agent-task-runner');
const { ConditionEngine, PreConditionError, PostConditionError } = require('./condition-engine');
const { IdempotencyCache } = require('./idempotency-cache');
const { RetryHandler } = require('./retry-handler');
const { resolveProjectRoot } = require('../../utils/resolve-project-root');

class TaskExecutor {
  /**
   * @param {Object} [options] - Opções adicionais
   * @param {Object} [options.eventStore] - EventStore para emissão de eventos (Story 1.7)
   * @param {IdempotencyCache} [options.idempotencyCache] - Cache para idempotency keys (Story 2.2)
   * @param {RetryHandler} [options.retryHandler] - RetryHandler para retry logic (Story 2.4)
   */
  constructor(options = {}) {
    this.pureTaskRunner = new PureTaskRunner();
    this.agentTaskRunner = new AgentTaskRunner();
    this.conditionEngine = new ConditionEngine();
    this.eventStore = options.eventStore || null;
    this.idempotencyCache = options.idempotencyCache || null;
    this.retryHandler = options.retryHandler || null;
  }

  /**
   * Emite evento de forma fire-and-forget (AC8 — non-blocking)
   * @param {string} runId
   * @param {string} eventType
   * @param {Object} data
   * @private
   */
  _emitEvent(runId, eventType, data = {}) {
    if (!this.eventStore) return;
    try {
      this.eventStore.append(runId, eventType, data);
    } catch {
      // Fire-and-forget — event write failure does NOT stop pipeline (AC8)
    }
  }

  /**
   * Executes a task step from pipeline (AC1-AC6 + Story 1.3 integration)
   * @param {Object} step - Step definition from pipeline.yaml
   * @param {Object} context - Current run context
   * @param {string} squadName - Name of squad
   * @returns {Promise<Object>} Task output with execution metadata
   */
  async executeTask(step, context, squadName, runId) {
    const startTime = Date.now();

    // Story 3.3 AC5: Check if step's phase should be skipped by override
    if (context.overrides?.skip_phases && step.phase) {
      if (context.overrides.skip_phases.includes(step.phase)) {
        const duration = Date.now() - startTime;
        if (runId) {
          this._emitEvent(runId, 'step.skipped', {
            stepId: step.id,
            reason: 'phase_skipped_by_override',
            phase: step.phase,
          });
        }
        return {
          output: null,
          metadata: {
            stepId: step.id,
            task: step.task,
            duration,
            completedAt: new Date().toISOString(),
            skipped: true,
            skipReason: 'phase_skipped_by_override',
          },
        };
      }
    }

    // Story 1.7: Emit step.started event
    if (runId) {
      this._emitEvent(runId, 'step.started', {
        stepId: step.id,
        stepType: step.type,
        input: step.input,
      });
    }

    // STORY 1.3: Validate pre-conditions BEFORE task execution
    if (step.pre_conditions) {
      const preResult = await this.conditionEngine.validate(
        step.pre_conditions,
        context
      );

      // Log non-blocker failures as warnings
      const nonBlockerFailures = preResult.failures.filter(f => !f.blocker);
      if (nonBlockerFailures.length > 0) {
        console.warn(`[WARNING] Pre-condition(s) failed (non-blockers):`, nonBlockerFailures);
      }

      // Blocker failures → throw PreConditionError
      if (preResult.blockersFailed) {
        const blockerFailures = preResult.failures.filter(f => f.blocker);
        throw new PreConditionError(blockerFailures);
      }
    }

    // AC4: Interpolate input with context
    const interpolatedInput = this.interpolateInput(step.input, context);

    // Cascade prevention: detect poisoned inputs from failed upstream steps
    this._validateInterpolatedInput(interpolatedInput, step.id);

    // Story 2.2: Check idempotency cache before execution
    if (this.idempotencyCache && !step.force_execute) {
      const idempotencyKey = IdempotencyCache.generateKey(runId, step.id, interpolatedInput);
      const cachedResult = this.idempotencyCache.get(idempotencyKey);

      if (cachedResult !== null) {
        const duration = Date.now() - startTime;

        // AC6: Emit step.cache_hit event
        if (runId) {
          const metadata = this.idempotencyCache.getMetadata(idempotencyKey);
          this._emitEvent(runId, 'step.cache_hit', {
            stepId: step.id,
            idempotencyKey,
            cached_at: metadata ? metadata.cachedAt : null,
            ttl_remaining_ms: metadata ? metadata.expiresAt - Date.now() : null,
          });
        }

        return {
          output: cachedResult,
          metadata: {
            stepId: step.id,
            task: step.task,
            duration,
            completedAt: new Date().toISOString(),
            cacheHit: true,
          },
        };
      }
    }

    // AC1: Load task file
    const taskFile = await this.loadTaskFile(squadName, step.task);

    // AC2, AC3: Execute based on task type (Story 2.4: wrapped with retry logic)
    const executeFn = async () => {
      if (step.type === 'task_pura') {
        return await this.pureTaskRunner.execute(taskFile, interpolatedInput);
      } else if (step.type === 'agent_task') {
        return await this.agentTaskRunner.execute(
          step.agent,
          step.task,
          interpolatedInput,
          { squadName, llmOptions: step.llm_options || {} }
        );
      } else {
        throw new Error(`Unknown task type: ${step.type}`);
      }
    };

    let output;
    if (this.retryHandler && step.retry !== false) {
      // Story 2.4: Wrap execution with retry logic
      const retryConfig = {
        ...(step.retry || {}),
        stepId: step.id,
        runId,
      };
      output = await this.retryHandler.retryWithBackoff(executeFn, retryConfig);
    } else {
      output = await executeFn();
    }

    // Story 2.2: Store result in cache after successful execution
    if (this.idempotencyCache) {
      const idempotencyKey = IdempotencyCache.generateKey(runId, step.id, interpolatedInput);
      this.idempotencyCache.set(idempotencyKey, output);
    }

    // STORY 1.3: Validate post-conditions AFTER task execution
    if (step.post_conditions) {
      // Add current step output to context for validation
      const postContext = {
        ...context,
        [step.id]: { output }
      };

      const postResult = await this.conditionEngine.validate(
        step.post_conditions,
        postContext
      );

      // Log non-blocker failures as warnings
      const nonBlockerFailures = postResult.failures.filter(f => !f.blocker);
      if (nonBlockerFailures.length > 0) {
        console.warn(`[WARNING] Post-condition(s) failed (non-blockers):`, nonBlockerFailures);
      }

      // Blocker failures → throw PostConditionError
      if (postResult.blockersFailed) {
        const blockerFailures = postResult.failures.filter(f => f.blocker);
        throw new PostConditionError(blockerFailures);
      }
    }

    // AC5: Add execution metadata
    const duration = Date.now() - startTime;

    // Story 1.7: Emit step.completed event
    if (runId) {
      this._emitEvent(runId, 'step.completed', {
        stepId: step.id,
        status: 'completed',
        output,
        duration_ms: duration,
      });
    }

    // AC5: Return structured output with metadata
    return {
      output,
      metadata: {
        stepId: step.id,
        task: step.task,
        duration,
        completedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Loads task file from squad directory (AC1)
   * Story 3.2 AC7: Resolves task path with fallback.
   * Searches: squads/{squadName}/tasks/ → .aios-core/squads/{squadName}/tasks/
   *
   * @param {string} squadName
   * @param {string} taskName
   * @returns {Promise<Object>} Parsed task definition
   */
  async loadTaskFile(squadName, taskName) {
    const fileName = `${taskName}.md`;
    const root = resolveProjectRoot();
    const searchPaths = [
      path.join(root, 'squads', squadName, 'tasks', fileName),
      path.join(root, '.aios-core', 'squads', squadName, 'tasks', fileName),
    ];

    for (const taskPath of searchPaths) {
      try {
        const content = await fs.readFile(taskPath, 'utf8');
        return {
          name: taskName,
          content,
          path: taskPath,
        };
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        // Try next path
      }
    }

    throw new Error(
      `Task file not found: ${taskName}.md for squad ${squadName}. Searched: squads/${squadName}/tasks/, .aios-core/squads/${squadName}/tasks/`
    );
  }

  /**
   * Interpolates variables in input using context (AC4)
   * Supports strings, objects, and arrays with {{context.field}} syntax
   *
   * @param {any} input - Input value (string, object, array)
   * @param {Object} context - Run context
   * @returns {any} Interpolated input
   */
  interpolateInput(input, context) {
    // String: replace {{path}} with context value
    if (typeof input === 'string') {
      // Special case: if string is ONLY a placeholder (e.g., "{{path}}"),
      // return the actual value (object, array, primitive) instead of converting to string
      const singlePlaceholderMatch = input.match(/^\{\{([^}]+)\}\}$/);
      if (singlePlaceholderMatch) {
        const value = this.resolveContextPath(singlePlaceholderMatch[1].trim(), context);
        return value !== undefined ? value : input; // Return value as-is or keep placeholder
      }

      // Otherwise, replace all placeholders in the string
      return input.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const value = this.resolveContextPath(path.trim(), context);
        return value !== undefined ? value : match; // Keep placeholder if not found
      });
    }

    // Array: recursively interpolate each item
    if (Array.isArray(input)) {
      return input.map((item) => this.interpolateInput(item, context));
    }

    // Object: recursively interpolate each value
    if (typeof input === 'object' && input !== null) {
      const result = {};
      for (const [key, value] of Object.entries(input)) {
        result[key] = this.interpolateInput(value, context);
      }
      return result;
    }

    // Primitive: return as-is
    return input;
  }

  /**
   * Resolves a path in context (e.g., "step1.output.value")
   * Supports pipe expressions: "path | filter: value"
   * @param {string} pathExpr - Dot-notation path, optionally with pipe
   * @param {Object} context - Run context
   * @returns {any} Resolved value or undefined
   */
  resolveContextPath(pathExpr, context) {
    // Handle pipe expressions: "path | filter: value"
    let contextPath = pathExpr;
    let pipeFilter = null;

    const pipeIdx = pathExpr.indexOf('|');
    if (pipeIdx > 0) {
      contextPath = pathExpr.slice(0, pipeIdx).trim();
      const pipeExpr = pathExpr.slice(pipeIdx + 1).trim();
      // Parse "filter: value"
      const filterMatch = pipeExpr.match(/^filter:\s*(.+)$/);
      if (filterMatch) {
        pipeFilter = { type: 'filter', value: filterMatch[1].trim() };
      }
    }

    const parts = contextPath.split('.');
    let current = context;

    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[part];
    }

    // Apply pipe filter if present
    if (pipeFilter && current !== undefined) {
      if (pipeFilter.type === 'filter' && Array.isArray(current)) {
        const filterVal = pipeFilter.value;
        current = current.filter(item => {
          if (typeof item !== 'object' || item === null) return false;
          // Check if any field matches the filter value
          return Object.values(item).some(v => v === filterVal);
        });
        // If filter returns empty, return the original (resilience)
        if (current.length === 0) {
          let orig = context;
          for (const part of parts) {
            if (orig === undefined || orig === null) break;
            orig = orig[part];
          }
          return orig;
        }
      }
    }

    return current;
  }

  /**
   * Validates interpolated input for poisoned/failed upstream data.
   * Detects _parseError objects and unresolved placeholders from failed steps.
   * Throws early to prevent cascade failures.
   *
   * @param {any} input - Interpolated input
   * @param {string} stepId - Current step ID (for error context)
   * @private
   */
  _validateInterpolatedInput(input, stepId) {
    if (!input || typeof input !== 'object') return;

    const poisoned = [];

    const check = (value, path) => {
      if (value && typeof value === 'object' && value._parseError) {
        poisoned.push(`${path}: upstream returned _parseError (LLM output unparseable)`);
      }
      if (typeof value === 'string' && /^\{\{.+\}\}$/.test(value)) {
        poisoned.push(`${path}: unresolved placeholder "${value}" (upstream step may have failed)`);
      }
    };

    for (const [key, value] of Object.entries(input)) {
      check(value, key);
      // Check one level deeper for nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const [k2, v2] of Object.entries(value)) {
          check(v2, `${key}.${k2}`);
        }
      }
    }

    if (poisoned.length > 0) {
      throw new Error(
        `Step "${stepId}" has poisoned input from failed upstream steps:\n` +
        poisoned.map(p => `  - ${p}`).join('\n')
      );
    }
  }
}

module.exports = TaskExecutor;
