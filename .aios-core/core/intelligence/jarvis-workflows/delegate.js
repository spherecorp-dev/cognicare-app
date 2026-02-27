/**
 * Jarvis Workflow: Delegate
 *
 * Sprint 4 C.5: High-priority workflow
 *
 * Handles the full delegation flow:
 * 1. Parse user intent (who, what, with what context)
 * 2. Resolve agent/squad routing
 * 3. Execute delegation via JarvisDelegator
 * 4. Track and report result
 *
 * @module core/intelligence/jarvis-workflows/delegate
 */

const { JarvisDelegator } = require('../../orchestration/jarvis-delegator');

class DelegateWorkflow {
  /**
   * @param {Object} options
   * @param {string} [options.projectRoot] - Project root path
   * @param {JarvisDelegator} [options.delegator] - Existing delegator instance
   */
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.delegator = options.delegator || new JarvisDelegator({
      projectRoot: this.projectRoot,
    });
  }

  /**
   * Execute a delegation workflow
   *
   * @param {Object} params
   * @param {string} params.agent - Agent name (e.g., 'stefan-georgi', 'copy-chief')
   * @param {string} params.task - Task description
   * @param {Object} [params.inputs] - Task inputs
   * @param {string} [params.priority='medium'] - Priority
   * @param {string} [params.businessContext] - Why this delegation matters
   * @returns {Promise<Object>} Delegation result
   */
  async execute(params) {
    const { agent, task, inputs = {}, priority = 'medium', businessContext = '' } = params;

    if (!agent || !task) {
      return {
        success: false,
        error: 'Agent and task are required for delegation',
      };
    }

    // Execute delegation
    const result = await this.delegator.delegate(task, agent, {
      priority,
      businessContext,
      inputs,
    });

    return {
      success: result.success,
      delegationId: result.delegationId,
      agent: result.agentName,
      task: result.task,
      result: result.result || null,
      error: result.error || null,
      duration: result.duration,
    };
  }

  /**
   * Get status of an existing delegation
   *
   * @param {string} delegationId
   * @returns {Promise<Object>} Delegation status
   */
  async getStatus(delegationId) {
    return await this.delegator.getDelegationStatus(delegationId);
  }

  /**
   * Cancel a delegation
   *
   * @param {string} delegationId
   * @param {string} reason
   * @returns {Promise<void>}
   */
  async cancel(delegationId, reason) {
    await this.delegator.cancelDelegation(delegationId, reason);
  }
}

module.exports = { DelegateWorkflow };
