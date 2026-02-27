/**
 * Agent Task Runner - Story 1.2
 *
 * Executes agent_task using existing AgentInvoker
 *
 * Features (AC3):
 * - Invoke agents via AgentInvoker.invokeAgent()
 * - Handle agent invocation errors
 * - Return agent output
 *
 * Integration:
 * - Uses existing AgentInvoker from Story 0.7
 * - API: invokeAgent(agentName, taskPath, inputs)
 * - Returns: { success, invocationId, agentName, taskPath, result/error, duration }
 *
 * @module core/orchestration/squad-engine/task-types/agent-task-runner
 * @version 1.0.0
 */

const { AgentInvoker } = require('../../agent-invoker');
const { resolveProjectRoot } = require('../../../utils/resolve-project-root');

class AgentTaskRunner {
  constructor(options = {}) {
    const projectRoot = options.projectRoot || resolveProjectRoot();
    this.agentInvoker = options.agentInvoker || new AgentInvoker({ projectRoot });
  }

  /**
   * Executes an agent task using existing AgentInvoker (AC3)
   * @param {string} agent - Agent name (e.g., "@copy-chief")
   * @param {string} task - Task name
   * @param {Object} input - Interpolated input
   * @param {Object} [options={}] - Additional options
   * @param {string} [options.squadName] - Squad name for squad-specific lookups
   * @returns {Promise<Object>} Agent output
   */
  async execute(agent, task, input, options = {}) {
    // Normalize agent name (remove @ prefix if present)
    const agentName = agent.replace(/^@/, '');

    // API: invokeAgent(agentName, taskPath, inputs, options)
    const result = await this.agentInvoker.invokeAgent(
      agentName,
      task,
      input,
      {
        squadName: options.squadName,
        llmOptions: options.llmOptions || {},
      }
    );

    // Handle invocation errors
    if (!result.success) {
      throw new Error(
        `Agent invocation failed (@${agentName}, task: ${task}): ${result.error}`
      );
    }

    // Return agent output
    return result.result;
  }
}

module.exports = AgentTaskRunner;
