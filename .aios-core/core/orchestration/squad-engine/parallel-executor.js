/**
 * Parallel Executor
 *
 * Executes parallel groups within a pipeline — multiple tasks run simultaneously
 * via Promise.allSettled(). Supports fail_fast (AbortController), context isolation,
 * and result aggregation.
 *
 * Story 4.4: Paralelização de Steps — Parallel Groups
 *
 * @module ParallelExecutor
 */

const MAX_PARALLEL_TASKS = 10;

class ParallelExecutor {
  /**
   * @param {Object} options
   * @param {Object} options.eventStore - EventStore for event emission
   * @param {Object} [options.conditionEngine] - ConditionEngine for pre/post-condition validation
   */
  constructor(options = {}) {
    this.eventStore = options.eventStore || null;
    this.conditionEngine = options.conditionEngine || null;
  }

  /**
   * Emits event via EventStore (fire-and-forget)
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
      // Fire-and-forget
    }
  }

  /**
   * Deep-clones context for task isolation (AC5 — no shared mutable state)
   * @param {Object} ctx
   * @returns {Object}
   * @private
   */
  _cloneContext(ctx) {
    return JSON.parse(JSON.stringify(ctx));
  }

  /**
   * Validates pre-conditions for a task using the condition engine
   * @param {Object} task - Task definition
   * @param {Object} context - Execution context
   * @returns {{ valid: boolean, error?: string }}
   * @private
   */
  _validatePreConditions(task, context) {
    if (!this.conditionEngine || !task.pre_conditions) {
      return { valid: true };
    }
    try {
      const result = this.conditionEngine.evaluate(task.pre_conditions, context);
      return { valid: result.passed, error: result.passed ? undefined : result.message };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  /**
   * Validates post-conditions for a task using the condition engine
   * @param {Object} task - Task definition
   * @param {Object} context - Execution context
   * @returns {{ valid: boolean, error?: string }}
   * @private
   */
  _validatePostConditions(task, context) {
    if (!this.conditionEngine || !task.post_conditions) {
      return { valid: true };
    }
    try {
      const result = this.conditionEngine.evaluate(task.post_conditions, context);
      return { valid: result.passed, error: result.passed ? undefined : result.message };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  /**
   * Executes a single task within a parallel group
   * @param {Object} task - Task definition { id, task, input, ... }
   * @param {Object} clonedContext - Isolated context clone
   * @param {Function} taskExecutorFn - Function to execute a task: (task, context) => Promise<result>
   * @param {string} runId - Current run ID
   * @param {AbortSignal} [signal] - AbortSignal for fail_fast cancellation
   * @returns {Promise<{ taskId: string, status: string, output: any, error: any, duration_ms: number }>}
   * @private
   */
  async _executeTask(task, clonedContext, taskExecutorFn, runId, signal) {
    const startTime = Date.now();
    const taskId = task.id;

    // Check abort before starting
    if (signal && signal.aborted) {
      return { taskId, status: 'aborted', output: null, error: 'Aborted by fail_fast', duration_ms: 0 };
    }

    // Emit step.started
    this._emitEvent(runId, 'step.started', { stepId: taskId, parallel: true });

    // Validate pre-conditions (Task 7)
    const preCheck = this._validatePreConditions(task, clonedContext);
    if (!preCheck.valid) {
      const duration_ms = Date.now() - startTime;
      this._emitEvent(runId, 'step.failed', { stepId: taskId, error: preCheck.error, duration_ms, parallel: true });
      return { taskId, status: 'failed', output: null, error: preCheck.error, duration_ms };
    }

    try {
      // Wrap execution with abort signal checking
      const result = await new Promise((resolve, reject) => {
        if (signal) {
          const onAbort = () => reject(new Error('Aborted by fail_fast'));
          signal.addEventListener('abort', onAbort, { once: true });
          taskExecutorFn(task, clonedContext)
            .then(res => {
              signal.removeEventListener('abort', onAbort);
              resolve(res);
            })
            .catch(err => {
              signal.removeEventListener('abort', onAbort);
              reject(err);
            });
        } else {
          taskExecutorFn(task, clonedContext).then(resolve).catch(reject);
        }
      });

      const duration_ms = Date.now() - startTime;

      // Validate post-conditions (Task 7)
      const postCheck = this._validatePostConditions(task, clonedContext);
      if (!postCheck.valid) {
        this._emitEvent(runId, 'step.failed', { stepId: taskId, error: postCheck.error, duration_ms, parallel: true });
        return { taskId, status: 'failed', output: null, error: postCheck.error, duration_ms };
      }

      this._emitEvent(runId, 'step.completed', { stepId: taskId, duration_ms, parallel: true });
      return { taskId, status: 'completed', output: result, error: null, duration_ms };
    } catch (err) {
      const duration_ms = Date.now() - startTime;
      const isAbort = err.message === 'Aborted by fail_fast';
      const status = isAbort ? 'aborted' : 'failed';
      const eventType = isAbort ? 'step.aborted' : 'step.failed';
      this._emitEvent(runId, eventType, { stepId: taskId, error: err.message, duration_ms, parallel: true });
      return { taskId, status, output: null, error: err.message, duration_ms };
    }
  }

  /**
   * Executes a parallel group (AC2, AC3, AC4)
   *
   * @param {Object} group - Parallel group definition
   * @param {string} group.id - Group ID
   * @param {Array} group.tasks - Array of task definitions
   * @param {boolean} [group.wait_for_all=true] - Wait for all tasks to complete
   * @param {boolean} [group.fail_fast=false] - Cancel remaining on first failure
   * @param {Object} context - Current execution context
   * @param {Function} taskExecutorFn - Function to execute a task: (task, context) => Promise<result>
   * @param {string} runId - Current run ID
   * @returns {Promise<{ results: Object, summary: Object }>}
   */
  async execute(group, context, taskExecutorFn, runId) {
    const groupId = group.id;
    const tasks = group.tasks || [];
    const waitForAll = group.wait_for_all !== false; // default true
    const failFast = group.fail_fast === true; // default false

    if (tasks.length === 0) {
      return {
        results: {},
        summary: { total: 0, succeeded: 0, failed: 0, aborted: 0, duration_ms: 0 },
      };
    }

    if (tasks.length > MAX_PARALLEL_TASKS) {
      throw new Error(`Parallel group "${groupId}" has ${tasks.length} tasks, exceeding max of ${MAX_PARALLEL_TASKS}`);
    }

    // Validate group pre-conditions (Task 7.1)
    const groupPreCheck = this._validatePreConditions(group, context);
    if (!groupPreCheck.valid) {
      throw new Error(`Parallel group "${groupId}" pre-condition failed: ${groupPreCheck.error}`);
    }

    const startTime = Date.now();

    // Emit parallel_group.started (AC6)
    const taskIds = tasks.map(t => t.id);
    this._emitEvent(runId, 'parallel_group.started', { groupId, tasks: taskIds, total: tasks.length });

    // AbortController for fail_fast (AC4)
    const abortController = failFast ? new AbortController() : null;
    const signal = abortController ? abortController.signal : null;

    // Clone context per task for isolation (AC5)
    const taskPromises = tasks.map(task => {
      const clonedCtx = this._cloneContext(context);
      return this._executeTask(task, clonedCtx, taskExecutorFn, runId, signal);
    });

    let taskResults;

    if (waitForAll) {
      // AC3: Wait for all tasks
      if (failFast) {
        // With fail_fast: use custom logic — abort on first failure
        taskResults = await this._executeWithFailFast(taskPromises, abortController);
      } else {
        // Default: allSettled — all complete independently
        const settled = await Promise.allSettled(taskPromises);
        taskResults = settled.map(s => s.status === 'fulfilled' ? s.value : {
          taskId: 'unknown', status: 'failed', output: null, error: s.reason?.message || 'Unknown error', duration_ms: 0,
        });
      }
    } else {
      // wait_for_all: false — resolve when first completes (future use)
      const settled = await Promise.allSettled(taskPromises);
      taskResults = settled.map(s => s.status === 'fulfilled' ? s.value : {
        taskId: 'unknown', status: 'failed', output: null, error: s.reason?.message || 'Unknown error', duration_ms: 0,
      });
    }

    const duration_ms = Date.now() - startTime;

    // Aggregate results (AC2)
    const results = {};
    let succeeded = 0;
    let failed = 0;
    let aborted = 0;

    for (const result of taskResults) {
      results[result.taskId] = {
        status: result.status,
        output: result.output,
        error: result.error,
        duration_ms: result.duration_ms,
      };
      if (result.status === 'completed') succeeded++;
      else if (result.status === 'failed') failed++;
      else if (result.status === 'aborted') aborted++;
    }

    const summary = {
      total: tasks.length,
      succeeded,
      failed,
      aborted,
      duration_ms,
    };

    // Validate group post-conditions (Task 7.2)
    const groupPostCheck = this._validatePostConditions(group, context);
    if (!groupPostCheck.valid) {
      this._emitEvent(runId, 'parallel_group.completed', { groupId, ...summary, post_condition_failed: true });
      throw new Error(`Parallel group "${groupId}" post-condition failed: ${groupPostCheck.error}`);
    }

    // Emit parallel_group.completed (AC6)
    this._emitEvent(runId, 'parallel_group.completed', { groupId, ...summary });

    return { results, summary };
  }

  /**
   * Execute with fail_fast: monitors promises, aborts remaining on first failure
   * @param {Array<Promise>} taskPromises
   * @param {AbortController} abortController
   * @returns {Promise<Array>}
   * @private
   */
  async _executeWithFailFast(taskPromises, abortController) {
    const results = new Array(taskPromises.length).fill(null);
    let firstFailure = false;

    const wrappedPromises = taskPromises.map((promise, index) =>
      promise.then(result => {
        results[index] = result;
        if ((result.status === 'failed') && !firstFailure) {
          firstFailure = true;
          abortController.abort();
        }
        return result;
      }).catch(err => {
        const fallback = { taskId: `task-${index}`, status: 'failed', output: null, error: err.message, duration_ms: 0 };
        results[index] = fallback;
        if (!firstFailure) {
          firstFailure = true;
          abortController.abort();
        }
        return fallback;
      })
    );

    await Promise.allSettled(wrappedPromises);
    return results;
  }
}

module.exports = { ParallelExecutor, MAX_PARALLEL_TASKS };
