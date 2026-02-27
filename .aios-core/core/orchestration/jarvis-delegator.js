/**
 * Jarvis Delegator
 *
 * Structured delegation with business context, retry, timeout, and audit trail.
 * Programmatic interface for Jarvis to delegate tasks to agents with full
 * business context tracking.
 *
 * Adapted from: agent-invoker.js (Story 0.7, Epic 0)
 *
 * Key adaptations over AgentInvoker:
 * - delegate(task, delegatedTo, options) instead of invokeAgent(agentName, taskPath, inputs)
 * - Dynamic agent lookup via DELEGATION_ROUTING instead of static SUPPORTED_AGENTS
 * - Persistent storage via JarvisDelegationStore instead of in-memory invocations[]
 * - Business context enrichment via JarvisBusinessMemory in every delegation
 *
 * @module core/orchestration/jarvis-delegator
 * @version 1.0.0
 */

const path = require('path');
const EventEmitter = require('events');
const { JarvisDelegationStore } = require('./jarvis-delegation-store');
const { JarvisBusinessMemory } = require('../memory/jarvis-business-memory');

// ═══════════════════════════════════════════════════════════════════════════════════
//                              DELEGATION ROUTING
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Routing table mapping delegation domains to agents
 */
const DELEGATION_ROUTING = {
  strategy_product:  { agent: '@pm', name: 'Morgan' },
  architecture_tech: { agent: '@architect', name: 'Aria' },
  stories_backlog:   { agent: '@sm', name: 'River' },
  validation:        { agent: '@po', name: 'Pax' },
  implementation:    { agent: '@dev', name: 'Dex' },
  quality:           { agent: '@qa', name: 'Quinn' },
  database:          { agent: '@data-engineer', name: 'Dara' },
  research:          { agent: '@analyst', name: 'Atlas' },
  deploy:            { agent: '@devops', name: 'Gage' },
  design:            { agent: '@ux-design-expert', name: 'Uma' },
  copy:              { agent: '@stefan-georgi', name: 'Stefan Georgi' },
  copy_chief:        { agent: '@copy-chief', name: 'Copy Chief' },
  media:             { agent: '@media-head', name: 'Media Head' },
  framework:         { agent: '@aios-master', name: 'Orion' },
};

/**
 * Maps agent names and domains to squad IDs for squad execution
 */
const SQUAD_ROUTING = {
  // Agents → Squads
  'stefan-georgi': 'squad-copy',
  'copy-chief': 'squad-copy',
  'media-head': 'media-squad',
  'media-analyst': 'media-squad',
  'media-buyer': 'media-squad',
  'media-engineer': 'media-squad',

  // Domain keywords → Squads
  'copy': 'squad-copy',
  'criativo': 'squad-copy',
  'creative': 'squad-copy',
  'media': 'media-squad',
  'trafego': 'media-squad',
  'campanha': 'media-squad',
  'campaign': 'media-squad',
};

/**
 * Delegation status values
 */
const DelegationStatus = {
  CREATED: 'created',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// ═══════════════════════════════════════════════════════════════════════════════════
//                              DELEGATION ERROR
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Error thrown when a delegation operation fails
 */
class DelegationError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} [delegationId] - Associated delegation ID
   * @param {string} [agentName] - Agent that was targeted
   */
  constructor(message, delegationId, agentName) {
    super(message);
    this.name = 'DelegationError';
    this.delegationId = delegationId || null;
    this.agentName = agentName || null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════
//                              JARVIS DELEGATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * JarvisDelegator - Structured delegation with business context
 */
class JarvisDelegator extends EventEmitter {
  /**
   * @param {Object} options - Configuration options
   * @param {string} options.projectRoot - Project root path
   * @param {number} [options.defaultTimeout=300000] - Default timeout (5 min)
   * @param {number} [options.maxRetries=3] - Max retries for transient failures
   * @param {JarvisDelegationStore} [options.delegationStore] - Persistent store (creates default if not provided)
   * @param {JarvisBusinessMemory} [options.businessMemory] - Business memory (creates default if not provided)
   * @param {Function} [options.executor] - Custom executor function
   */
  constructor(options = {}) {
    super();

    this.projectRoot = options.projectRoot || process.cwd();
    this.defaultTimeout = options.defaultTimeout ?? 300000; // 5 minutes
    this.maxRetries = options.maxRetries ?? 3;
    this.executor = options.executor || null;

    // Persistent delegation store
    this.store = options.delegationStore || new JarvisDelegationStore(
      path.join(this.projectRoot, '.aios', 'jarvis', 'delegations'),
    );

    // Business memory for context enrichment
    this.memory = options.businessMemory || new JarvisBusinessMemory(
      this.projectRoot,
      { quiet: true },
    );

    // Audit log
    this.logs = [];
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              PUBLIC METHODS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Delegate a task to an agent with full business context
   *
   * @param {string} task - Description of what to delegate
   * @param {string} delegatedTo - Agent name (e.g., '@dev', '@architect')
   * @param {Object} [options={}] - Delegation options
   * @param {string} [options.businessContext] - Business reason for the delegation
   * @param {string} [options.priority] - Priority: 'critical', 'high', 'medium', 'low'
   * @param {string} [options.deadline] - ISO 8601 deadline
   * @param {Object} [options.metadata] - Additional metadata
   * @param {Object} [options.inputs] - Inputs to pass to the agent
   * @returns {Promise<Object>} Delegation result
   */
  async delegate(task, delegatedTo, options = {}) {
    const startTime = Date.now();
    const agentName = this._normalizeAgentName(delegatedTo);
    const priority = options.priority || 'medium';
    const businessContext = options.businessContext || '';

    this._log(`Delegating to ${agentName}: ${task}`, 'info');

    // Create delegation in persistent store
    const delegationId = this.store.createDelegation(
      task,
      agentName,
      businessContext,
      priority,
      {
        deadline: options.deadline || null,
        inputs: options.inputs || {},
        ...options.metadata,
      },
    );

    this.emit('delegation.started', { delegationId, agentName, task, priority });

    try {
      // Update status to in_progress
      await this.store.updateStatus(delegationId, 'in_progress');

      // Enrich context with business memory
      const relevantPatterns = this.memory.getRelevant(
        `${task} ${businessContext}`,
        [agentName],
      );

      // Track the delegation in business memory
      this.memory.trackDelegation({
        description: task,
        agent: agentName,
        domain: this._inferDomain(agentName),
        context: { businessContext, priority },
      });

      // Build execution context
      const context = this._buildContext(agentName, task, {
        businessContext,
        priority,
        deadline: options.deadline,
        inputs: options.inputs || {},
        relevantPatterns,
        delegationId,
      });

      // Execute with retry logic
      const result = await this._executeWithRetry(
        () => this._executeDelegation(agentName, task, context),
        { delegationId },
      );

      // Update store with completion
      const duration = Date.now() - startTime;
      await this.store.updateStatus(delegationId, 'completed', {
        outcome: result,
        duration_ms: duration,
      });

      this._log(`Delegation ${delegationId} completed in ${duration}ms`, 'info');
      this.emit('delegation.completed', { delegationId, agentName, task, result, duration });

      return {
        success: true,
        delegationId,
        agentName,
        task,
        result,
        duration,
        businessContext,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      await this.store.updateStatus(delegationId, 'failed', {
        outcome: { error: error.message },
        duration_ms: duration,
      });

      this._log(`Delegation ${delegationId} failed: ${error.message}`, 'error');
      this.emit('delegation.failed', { delegationId, agentName, task, error: error.message, duration });

      return {
        success: false,
        delegationId,
        agentName,
        task,
        error: error.message,
        duration,
        businessContext,
      };
    }
  }

  /**
   * Estimate complexity of a task for a given agent
   *
   * @param {string} task - Task description
   * @param {string} agentName - Agent name
   * @returns {Promise<Object>} Complexity estimate
   */
  async estimateComplexity(task, agentName) {
    const normalizedAgent = this._normalizeAgentName(agentName);

    // Check business memory for similar past delegations
    const similarPatterns = this.memory.getRelevant(task, [normalizedAgent]);

    // Check delegation store for agent performance history
    const performance = await this.store.getAgentPerformance(normalizedAgent);

    // Determine complexity based on signals
    let score = 0;
    const reasoning = [];

    // Factor 1: Task description length/complexity
    const wordCount = task.split(/\s+/).length;
    if (wordCount > 50) {
      score += 2;
      reasoning.push('Long task description suggests complexity');
    } else if (wordCount > 20) {
      score += 1;
      reasoning.push('Moderate task description length');
    }

    // Factor 2: Agent performance history
    if (performance.avgDuration_ms) {
      if (performance.avgDuration_ms > 180000) { // > 3 min avg
        score += 2;
        reasoning.push(`Agent avg duration is ${Math.round(performance.avgDuration_ms / 1000)}s`);
      } else if (performance.avgDuration_ms > 60000) { // > 1 min avg
        score += 1;
        reasoning.push(`Agent avg duration is ${Math.round(performance.avgDuration_ms / 1000)}s`);
      }
    }

    // Factor 3: Similar patterns in business memory
    if (similarPatterns.length > 0) {
      const highImportance = similarPatterns.filter((p) => p.importance === 'high');
      if (highImportance.length > 0) {
        score += 1;
        reasoning.push(`${highImportance.length} high-importance related pattern(s) found`);
      }
    }

    // Factor 4: Agent success rate
    if (performance.successRate !== null && performance.successRate < 0.8) {
      score += 1;
      reasoning.push(`Agent success rate is ${Math.round(performance.successRate * 100)}%`);
    }

    // Map score to level
    let level;
    if (score <= 1) {
      level = 'simple';
    } else if (score <= 3) {
      level = 'standard';
    } else {
      level = 'complex';
    }

    const confidence = Math.min(
      0.95,
      0.5 + (performance.totalDelegations * 0.05) + (similarPatterns.length * 0.05),
    );

    return {
      level,
      confidence: Math.round(confidence * 100) / 100,
      reasoning,
      avgDuration: performance.avgDuration_ms || null,
    };
  }

  /**
   * Get the status of a delegation
   *
   * @param {string} delegationId - Delegation ID
   * @returns {Promise<Object>} Delegation state
   */
  async getDelegationStatus(delegationId) {
    return this.store.getDelegation(delegationId);
  }

  /**
   * Get all active (non-terminal) delegations
   *
   * @returns {Promise<Array<Object>>} Active delegations
   */
  async getActiveDelegations() {
    return this.store.getActiveDelegations();
  }

  /**
   * Get performance metrics for an agent
   *
   * @param {string} agentName - Agent name (e.g., '@dev')
   * @returns {Promise<Object>} Performance metrics
   */
  async getAgentPerformance(agentName) {
    const normalizedAgent = this._normalizeAgentName(agentName);
    return this.store.getAgentPerformance(normalizedAgent);
  }

  /**
   * Cancel an active delegation
   *
   * @param {string} delegationId - Delegation ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<void>}
   */
  async cancelDelegation(delegationId, reason) {
    await this.store.updateStatus(delegationId, 'cancelled', {
      reason,
      cancelledAt: new Date().toISOString(),
    });

    this._log(`Delegation ${delegationId} cancelled: ${reason}`, 'info');
    this.emit('delegation.cancelled', { delegationId, reason });
  }

  /**
   * Resolve an agent name from a routing domain key
   *
   * @param {string} domain - Routing domain key (e.g., 'implementation')
   * @returns {Object|null} Routing entry or null
   */
  resolveRoute(domain) {
    return DELEGATION_ROUTING[domain] || null;
  }

  /**
   * Get audit logs
   *
   * @returns {Object[]} Log entries
   */
  getLogs() {
    return [...this.logs];
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Normalize agent name (ensure @ prefix, lowercase)
   * @private
   */
  _normalizeAgentName(agentName) {
    const name = agentName.trim().toLowerCase();
    return name.startsWith('@') ? name : `@${name}`;
  }

  /**
   * Infer delegation domain from agent name
   * @private
   */
  _inferDomain(agentName) {
    for (const [domain, entry] of Object.entries(DELEGATION_ROUTING)) {
      if (entry.agent === agentName) {
        return domain;
      }
    }
    return 'general';
  }

  /**
   * Build enriched context for delegation execution
   * @private
   */
  _buildContext(agentName, task, enrichment) {
    // Resolve agent display info from routing table
    let agentInfo = { agent: agentName, name: agentName };
    for (const entry of Object.values(DELEGATION_ROUTING)) {
      if (entry.agent === agentName) {
        agentInfo = entry;
        break;
      }
    }

    return {
      // Agent info
      agent: {
        id: agentInfo.agent,
        name: agentInfo.name,
      },

      // Task info
      task,

      // Business context
      businessContext: enrichment.businessContext || '',
      priority: enrichment.priority || 'medium',
      deadline: enrichment.deadline || null,

      // User inputs
      inputs: enrichment.inputs || {},

      // Business memory patterns
      relevantPatterns: enrichment.relevantPatterns || [],

      // Environment
      projectRoot: this.projectRoot,
      timestamp: new Date().toISOString(),
      delegationId: enrichment.delegationId,

      // Orchestration config
      orchestration: {
        timeout: this.defaultTimeout,
        maxRetries: this.maxRetries,
      },
    };
  }

  /**
   * Execute with retry logic (adapted from AgentInvoker._executeWithRetry)
   * @private
   */
  async _executeWithRetry(executeFn, options = {}) {
    const { delegationId } = options;
    let lastError;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this._log(`Retry attempt ${attempt}/${this.maxRetries} for ${delegationId}`, 'info');
          this.emit('delegation.retrying', { delegationId, attempt, maxRetries: this.maxRetries });
          // Exponential backoff
          await this._delay(1000 * Math.pow(2, attempt - 1));
        }

        return await executeFn();
      } catch (error) {
        lastError = error;

        // Check if error is transient (retryable)
        if (!this._isTransientError(error)) {
          throw error;
        }

        this._log(`Transient error on delegation ${delegationId}: ${error.message}`, 'warn');
      }
    }

    throw lastError;
  }

  /**
   * Execute a delegation — routes to squad or agent execution
   *
   * Priority: custom executor → squad execution → agent invocation → simulated
   * @private
   */
  async _executeDelegation(agentName, task, context) {
    // If custom executor provided, use it (for testing/overrides)
    if (this.executor) {
      return await this._executeWithTimeout(
        () => this.executor(agentName, task, context),
        this.defaultTimeout,
      );
    }

    // Check if this maps to a squad (squad-copy, media-squad, etc.)
    const squadId = this._resolveSquad(agentName, task);

    if (squadId) {
      return await this._executeSquadDelegation(squadId, agentName, task, context);
    }

    // Fallback: invoke individual agent via AgentInvoker
    return await this._executeAgentDelegation(agentName, task, context);
  }

  /**
   * Execute delegation via Squad Orchestrator
   * @private
   */
  async _executeSquadDelegation(squadId, agentName, task, context) {
    const { SquadOrchestrator } = require('./squad-engine/squad-orchestrator');

    this._log(`Routing delegation to squad: ${squadId}`, 'info');

    const orchestrator = new SquadOrchestrator({
      projectRoot: this.projectRoot,
    });

    // Determine pipeline from context or use default
    const pipelineName = context.inputs?.pipeline || 'default-pipeline';

    const run = await orchestrator.executeSquad(squadId, {
      pipelineName,
      trigger: {
        type: 'jarvis-delegation',
        caller: 'jarvis',
        parentRunId: context.delegationId,
        callerStepId: context.delegationId,
        data: {
          task,
          agentName,
          ...(context.inputs || {}),
        },
      },
    });

    // Wait for completion with timeout
    const completion = await orchestrator.waitForCompletion(run.runId, {
      timeout: this.defaultTimeout,
      pollInterval: 2000,
    });

    // Get outputs
    const outputs = await orchestrator.getOutputs(run.runId);

    return {
      status: completion.status === 'completed' ? 'completed' : 'failed',
      squadId,
      runId: run.runId,
      outputs,
      duration_ms: completion.duration_ms,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute delegation via AgentInvoker (individual agent, not squad)
   * @private
   */
  async _executeAgentDelegation(agentName, task, context) {
    const { AgentInvoker } = require('./agent-invoker');

    this._log(`Routing delegation to individual agent: @${agentName}`, 'info');

    const invoker = new AgentInvoker({ projectRoot: this.projectRoot });
    const result = await invoker.invokeAgent(agentName, task, context.inputs || {});

    if (!result.success) {
      throw new DelegationError(
        `Agent @${agentName} failed: ${result.error}`,
        context.delegationId,
        agentName
      );
    }

    return {
      status: 'completed',
      agentName,
      result: result.result,
      duration: result.duration,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Resolve agent/task to squad ID, returns null if no squad match
   * @private
   */
  _resolveSquad(agentName, task) {
    const name = agentName.replace(/^@/, '').toLowerCase();

    // Direct agent match
    if (SQUAD_ROUTING[name]) return SQUAD_ROUTING[name];

    // Keyword match in task
    const taskLower = (task || '').toLowerCase();
    for (const [keyword, squadId] of Object.entries(SQUAD_ROUTING)) {
      if (taskLower.includes(keyword)) return squadId;
    }

    return null;
  }

  /**
   * Execute with timeout (adapted from AgentInvoker._executeWithTimeout)
   * @private
   */
  async _executeWithTimeout(fn, timeout) {
    return Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new DelegationError('Delegation execution timed out')), timeout),
      ),
    ]);
  }

  /**
   * Check if error is transient (retryable)
   * @private
   */
  _isTransientError(error) {
    const transientPatterns = [
      /timeout/i,
      /ECONNRESET/i,
      /ETIMEDOUT/i,
      /rate.?limit/i,
      /retry/i,
      /temporary/i,
      /503/,
      /504/,
    ];

    return transientPatterns.some((p) => p.test(error.message));
  }

  /**
   * Generate unique ID
   * @private
   */
  _generateId() {
    return `dlg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log message
   * @private
   */
  _log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    this.logs.push({ timestamp, level, message });
  }

  /**
   * Delay utility
   * @private
   */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════
//                              EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════════

module.exports = {
  JarvisDelegator,
  DELEGATION_ROUTING,
  DelegationError,
};
