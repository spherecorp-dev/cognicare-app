'use strict';

/**
 * Jarvis Proactive Intelligence
 *
 * Generates proactive insights based on recognized patterns + historical decisions.
 * Combines PatternRecognitionEngine and DecisionRecordSystem to surface
 * actionable intelligence for the CEO without being asked.
 *
 * Capabilities:
 * - morningBrief() — summarizes pendencies, detected patterns, suggestions
 * - detectAnomaly(event) — identifies deviations from normal patterns
 * - suggestNextAction() — based on current context + history
 * - getAttentionItems() — items requiring CEO attention
 *
 * @module core/intelligence/jarvis-proactive
 * @version 1.0.0
 */

const EventEmitter = require('events');

// ═══════════════════════════════════════════════════════════════════════════════════
//                              CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Anomaly severity levels
 */
const AnomalySeverity = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
};

/**
 * Attention item priority
 */
const AttentionPriority = {
  URGENT: 'urgent',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

/**
 * Default thresholds for anomaly detection
 */
const DEFAULT_THRESHOLDS = {
  staleDelegationHours: 4,
  failureRatePercent: 30,
  pendingDecisionsMax: 5,
  repeatedFailuresMin: 2,
  unusualDurationMultiplier: 3,
};

// ═══════════════════════════════════════════════════════════════════════════════════
//                              PROACTIVE INTELLIGENCE CLASS
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * ProactiveIntelligence — Generates proactive insights for the CEO
 */
class ProactiveIntelligence extends EventEmitter {
  /**
   * @param {Object} options - Configuration
   * @param {Object} options.patternEngine - PatternRecognitionEngine instance
   * @param {Object} options.decisionRecord - DecisionRecordSystem instance
   * @param {Object} options.businessMemory - JarvisBusinessMemory instance
   * @param {Object} options.delegationStore - JarvisDelegationStore instance
   * @param {Object} [options.thresholds] - Custom anomaly thresholds
   */
  constructor(options = {}) {
    super();

    this.patternEngine = options.patternEngine || null;
    this.decisionRecord = options.decisionRecord || null;
    this.businessMemory = options.businessMemory || null;
    this.delegationStore = options.delegationStore || null;
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds };

    this._anomalyHistory = [];
    this._insightCache = null;
    this._insightCacheTimestamp = 0;
    this._insightCacheTtlMs = 60_000; // 1 minute
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              MORNING BRIEF
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Generate a morning brief summarizing the current state for the CEO.
   *
   * @param {Object} [options] - Brief options
   * @param {string} [options.timeRange='24h'] - Time range: '24h', '7d', '30d'
   * @returns {Object} Morning brief with sections
   */
  morningBrief(options = {}) {
    const timeRange = options.timeRange || '24h';
    const since = this._timeRangeToDate(timeRange);

    const brief = {
      generatedAt: new Date().toISOString(),
      timeRange,
      sections: {},
    };

    // Section 1: Pending decisions
    if (this.decisionRecord) {
      const pendingFollowUps = this.decisionRecord.getPendingFollowUps();
      brief.sections.pendingDecisions = {
        count: pendingFollowUps.length,
        items: pendingFollowUps.slice(0, 5).map(d => ({
          id: d.id,
          title: d.title,
          decidedAt: d.decidedAt,
          chosen: d.chosen,
          followUp: d.followUp,
        })),
        hasMore: pendingFollowUps.length > 5,
      };
    }

    // Section 2: Active delegations summary
    if (this.delegationStore) {
      const activeDelegations = this._getActiveDelegations();
      brief.sections.activeDelegations = {
        count: activeDelegations.length,
        items: activeDelegations.slice(0, 5).map(d => ({
          delegationId: d.delegationId,
          task: d.task,
          delegatedTo: d.delegatedTo,
          status: d.status,
          createdAt: d.createdAt,
        })),
        hasMore: activeDelegations.length > 5,
      };
    }

    // Section 3: Detected patterns
    if (this.patternEngine) {
      const recurringPatterns = this._getRecurringPatterns();
      brief.sections.detectedPatterns = {
        count: recurringPatterns.length,
        items: recurringPatterns.slice(0, 3).map(p => ({
          description: p.description || p.title,
          frequency: p.frequency,
          category: p.category,
        })),
      };
    }

    // Section 4: Recent anomalies
    const recentAnomalies = this._anomalyHistory.filter(
      a => new Date(a.detectedAt) >= since,
    );
    brief.sections.anomalies = {
      count: recentAnomalies.length,
      items: recentAnomalies.slice(0, 3).map(a => ({
        type: a.type,
        severity: a.severity,
        description: a.description,
        detectedAt: a.detectedAt,
      })),
    };

    // Section 5: Recent decisions summary
    if (this.decisionRecord) {
      try {
        const recentDecisions = this.decisionRecord.getDecisionHistory({
          since: since.toISOString(),
          limit: 5,
        });
        brief.sections.recentDecisions = {
          count: recentDecisions.length,
          items: recentDecisions.map(d => ({
            id: d.id,
            title: d.title,
            chosen: d.chosen,
            outcome: d.outcome,
          })),
        };
      } catch (_err) {
        brief.sections.recentDecisions = { count: 0, items: [] };
      }
    }

    // Section 6: Suggestions
    brief.sections.suggestions = this._generateSuggestions(brief);

    this.emit('brief.generated', brief);
    return brief;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              ANOMALY DETECTION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Detect anomalies in a business event.
   *
   * @param {Object} event - Business event to analyze
   * @param {string} event.type - Event type (delegation.completed, delegation.failed, etc.)
   * @param {Object} event.data - Event data
   * @returns {Object|null} Anomaly record if detected, null otherwise
   */
  detectAnomaly(event) {
    if (!event || !event.type) return null;

    const anomalies = [];

    // Check for delegation failure patterns
    if (event.type === 'delegation.failed') {
      const failureAnomaly = this._checkFailurePattern(event);
      if (failureAnomaly) anomalies.push(failureAnomaly);
    }

    // Check for unusual duration
    if (event.type === 'delegation.completed' && event.data && event.data.duration) {
      const durationAnomaly = this._checkUnusualDuration(event);
      if (durationAnomaly) anomalies.push(durationAnomaly);
    }

    // Check for stale delegations
    if (event.type === 'delegation.created' || event.type === 'monitor.check') {
      const staleAnomalies = this._checkStaleDelegations();
      anomalies.push(...staleAnomalies);
    }

    // Check for decision overload
    if (event.type === 'decision.recorded') {
      const overloadAnomaly = this._checkDecisionOverload();
      if (overloadAnomaly) anomalies.push(overloadAnomaly);
    }

    if (anomalies.length === 0) return null;

    for (const anomaly of anomalies) {
      this._anomalyHistory.push(anomaly);
      this.emit('anomaly.detected', anomaly);

      if (anomaly.severity === AnomalySeverity.CRITICAL) {
        this.emit('anomaly.critical', anomaly);
      }
    }

    return anomalies.length === 1 ? anomalies[0] : anomalies;
  }

  /**
   * Check for repeated failure patterns from a specific agent
   * @private
   */
  _checkFailurePattern(event) {
    const agent = event.data && event.data.delegatedTo;
    if (!agent) return null;

    // Count recent failures for this agent from anomaly history
    const recentFailures = this._anomalyHistory.filter(
      a => a.type === 'repeated_failure' && a.agent === agent
        && new Date(a.detectedAt) > this._timeRangeToDate('24h'),
    ).length;

    // Also count from current session events
    const sessionFailures = (this._recentFailures || []).filter(
      f => f.agent === agent,
    ).length;

    // Track this failure
    if (!this._recentFailures) this._recentFailures = [];
    this._recentFailures.push({
      agent,
      timestamp: new Date().toISOString(),
      task: event.data.task,
    });

    const totalFailures = recentFailures + sessionFailures + 1;

    if (totalFailures >= this.thresholds.repeatedFailuresMin) {
      return {
        type: 'repeated_failure',
        severity: totalFailures >= 3 ? AnomalySeverity.CRITICAL : AnomalySeverity.WARNING,
        description: `Agent ${agent} has failed ${totalFailures} times in the last 24h`,
        agent,
        failureCount: totalFailures,
        detectedAt: new Date().toISOString(),
        suggestion: `Consider reviewing ${agent}'s task complexity or reassigning pending work`,
      };
    }

    return null;
  }

  /**
   * Check if a delegation took unusually long compared to average
   * @private
   */
  _checkUnusualDuration(event) {
    if (!this.patternEngine || !event.data) return null;

    const { duration, delegatedTo, task } = event.data;
    if (!duration || !delegatedTo) return null;

    // Try to get historical average from pattern engine
    let avgDuration = null;
    if (this.delegationStore && typeof this.delegationStore.getAgentPerformance === 'function') {
      try {
        const perf = this.delegationStore.getAgentPerformance(delegatedTo);
        if (perf && perf.avgDuration) {
          avgDuration = perf.avgDuration;
        }
      } catch (_err) {
        // No performance data available
      }
    }

    if (avgDuration && duration > avgDuration * this.thresholds.unusualDurationMultiplier) {
      return {
        type: 'unusual_duration',
        severity: AnomalySeverity.WARNING,
        description: `Delegation to ${delegatedTo} took ${this._formatDuration(duration)} — ${this.thresholds.unusualDurationMultiplier}x longer than average (${this._formatDuration(avgDuration)})`,
        agent: delegatedTo,
        task,
        duration,
        avgDuration,
        detectedAt: new Date().toISOString(),
        suggestion: `Task may have been more complex than estimated. Consider reviewing scope for similar future tasks.`,
      };
    }

    return null;
  }

  /**
   * Check for delegations that have gone stale
   * @private
   */
  _checkStaleDelegations() {
    const anomalies = [];
    const activeDelegations = this._getActiveDelegations();
    const now = Date.now();
    const staleThresholdMs = this.thresholds.staleDelegationHours * 60 * 60 * 1000;

    for (const delegation of activeDelegations) {
      const createdAt = new Date(delegation.createdAt).getTime();
      const age = now - createdAt;

      if (age > staleThresholdMs) {
        // Don't re-alert for the same delegation
        const alreadyAlerted = this._anomalyHistory.some(
          a => a.type === 'stale_delegation' && a.delegationId === delegation.delegationId,
        );

        if (!alreadyAlerted) {
          anomalies.push({
            type: 'stale_delegation',
            severity: age > staleThresholdMs * 2 ? AnomalySeverity.CRITICAL : AnomalySeverity.WARNING,
            description: `Delegation ${delegation.delegationId} to ${delegation.delegatedTo} is stale (${this._formatDuration(age)})`,
            delegationId: delegation.delegationId,
            agent: delegation.delegatedTo,
            age,
            detectedAt: new Date().toISOString(),
            suggestion: `Check on progress or consider reassigning`,
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Check if there are too many pending decisions (decision overload)
   * @private
   */
  _checkDecisionOverload() {
    if (!this.decisionRecord) return null;

    const pending = this.decisionRecord.getPendingFollowUps();
    if (pending.length >= this.thresholds.pendingDecisionsMax) {
      return {
        type: 'decision_overload',
        severity: pending.length >= this.thresholds.pendingDecisionsMax * 2
          ? AnomalySeverity.CRITICAL
          : AnomalySeverity.WARNING,
        description: `${pending.length} decisions pending follow-up — may need attention`,
        pendingCount: pending.length,
        detectedAt: new Date().toISOString(),
        suggestion: `Review pending decisions and close those that have been resolved`,
      };
    }

    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              SUGGEST NEXT ACTION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Suggest the next action based on current context + historical patterns.
   *
   * @param {Object} [currentContext] - Optional current context for suggestion
   * @param {string} [currentContext.focus] - Current strategic focus
   * @param {string} [currentContext.domain] - Current domain of work
   * @returns {Object} Suggestion with rationale
   */
  suggestNextAction(currentContext = {}) {
    const suggestions = [];

    // 1. Check pending decisions that need follow-up
    if (this.decisionRecord) {
      const pending = this.decisionRecord.getPendingFollowUps();
      if (pending.length > 0) {
        const oldest = pending[pending.length - 1];
        suggestions.push({
          action: 'follow_up_decision',
          priority: AttentionPriority.HIGH,
          description: `Follow up on decision: "${oldest.title}"`,
          detail: `Decided ${oldest.decidedAt} — chosen: "${oldest.chosen}" — needs outcome recording`,
          decisionId: oldest.id,
          rationale: 'Pending follow-ups prevent learning from outcomes',
        });
      }
    }

    // 2. Check stale delegations
    const staleDelegations = this._getActiveDelegations().filter(d => {
      const age = Date.now() - new Date(d.createdAt).getTime();
      return age > this.thresholds.staleDelegationHours * 60 * 60 * 1000;
    });
    if (staleDelegations.length > 0) {
      suggestions.push({
        action: 'check_stale_delegation',
        priority: AttentionPriority.URGENT,
        description: `Check on ${staleDelegations.length} stale delegation(s)`,
        detail: staleDelegations.map(d => `${d.delegationId} → ${d.delegatedTo}`).join(', '),
        rationale: 'Stale delegations may indicate blockers or abandoned work',
      });
    }

    // 3. Pattern-based suggestion
    if (this.patternEngine && currentContext.domain) {
      try {
        const suggestion = this.patternEngine.suggestAction({
          description: currentContext.focus || currentContext.domain,
          category: currentContext.domain,
          keywords: (currentContext.focus || '').split(/\s+/).filter(w => w.length > 2),
          domain: currentContext.domain,
        });
        if (suggestion && suggestion.confidence !== 'low') {
          suggestions.push({
            action: 'pattern_based',
            priority: AttentionPriority.MEDIUM,
            description: `Pattern suggests: delegate to ${suggestion.suggestedAgent}`,
            detail: `Based on ${suggestion.basedOn.length} similar past patterns (confidence: ${suggestion.confidence})`,
            suggestedAgent: suggestion.suggestedAgent,
            rationale: 'Historical patterns suggest this approach works well in similar contexts',
          });
        }
      } catch (_err) {
        // Pattern engine not available or failed — skip
      }
    }

    // 4. If nothing else, suggest a brief
    if (suggestions.length === 0) {
      suggestions.push({
        action: 'generate_brief',
        priority: AttentionPriority.LOW,
        description: 'No urgent items — consider reviewing a status brief',
        rationale: 'Regular briefings help maintain situational awareness',
      });
    }

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    suggestions.sort(
      (a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3),
    );

    const result = {
      topSuggestion: suggestions[0],
      allSuggestions: suggestions,
      generatedAt: new Date().toISOString(),
    };

    this.emit('suggestion.generated', result);
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              ATTENTION ITEMS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get items requiring CEO attention, prioritized.
   *
   * @returns {Object[]} Attention items sorted by priority
   */
  getAttentionItems() {
    const items = [];

    // Critical anomalies
    const criticalAnomalies = this._anomalyHistory.filter(
      a => a.severity === AnomalySeverity.CRITICAL
        && new Date(a.detectedAt) > this._timeRangeToDate('24h'),
    );
    for (const anomaly of criticalAnomalies) {
      items.push({
        type: 'anomaly',
        priority: AttentionPriority.URGENT,
        title: anomaly.description,
        detail: anomaly.suggestion,
        source: anomaly,
      });
    }

    // Stale delegations
    const staleDelegations = this._getActiveDelegations().filter(d => {
      const age = Date.now() - new Date(d.createdAt).getTime();
      return age > this.thresholds.staleDelegationHours * 60 * 60 * 1000;
    });
    for (const delegation of staleDelegations) {
      items.push({
        type: 'stale_delegation',
        priority: AttentionPriority.HIGH,
        title: `Stale: ${delegation.task || delegation.delegationId} → ${delegation.delegatedTo}`,
        detail: `Created ${delegation.createdAt}`,
        source: delegation,
      });
    }

    // Pending decision follow-ups
    if (this.decisionRecord) {
      const pending = this.decisionRecord.getPendingFollowUps();
      for (const decision of pending.slice(0, 5)) {
        items.push({
          type: 'pending_followup',
          priority: AttentionPriority.MEDIUM,
          title: `Follow-up: ${decision.title}`,
          detail: `Decided ${decision.decidedAt} — awaiting outcome`,
          source: decision,
        });
      }
    }

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    items.sort(
      (a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3),
    );

    return items;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              ANOMALY HISTORY
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get anomaly history
   * @param {Object} [options] - Filter options
   * @param {string} [options.severity] - Filter by severity
   * @param {string} [options.type] - Filter by type
   * @param {string} [options.since] - ISO date string
   * @returns {Object[]} Anomaly records
   */
  getAnomalyHistory(options = {}) {
    let result = [...this._anomalyHistory];

    if (options.severity) {
      result = result.filter(a => a.severity === options.severity);
    }
    if (options.type) {
      result = result.filter(a => a.type === options.type);
    }
    if (options.since) {
      const sinceDate = new Date(options.since);
      result = result.filter(a => new Date(a.detectedAt) >= sinceDate);
    }

    return result;
  }

  /**
   * Clear anomaly history
   */
  clearAnomalyHistory() {
    this._anomalyHistory = [];
    this._recentFailures = [];
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get active delegations from the delegation store
   * @private
   * @returns {Object[]}
   */
  _getActiveDelegations() {
    if (!this.delegationStore) return [];

    try {
      if (typeof this.delegationStore.getActiveDelegations === 'function') {
        return this.delegationStore.getActiveDelegations();
      }
    } catch (_err) {
      // Store not available
    }

    return [];
  }

  /**
   * Get recurring patterns from the pattern engine
   * @private
   * @returns {Object[]}
   */
  _getRecurringPatterns() {
    if (!this.patternEngine) return [];

    try {
      if (typeof this.patternEngine.detectRecurringPatterns === 'function') {
        return this.patternEngine.detectRecurringPatterns();
      }
    } catch (_err) {
      // Pattern engine not available
    }

    return [];
  }

  /**
   * Generate contextual suggestions based on brief data
   * @private
   * @param {Object} brief - The brief data
   * @returns {Object[]} Suggestions
   */
  _generateSuggestions(brief) {
    const suggestions = [];

    // Suggest follow-up on pending decisions
    const pendingDecisions = brief.sections.pendingDecisions;
    if (pendingDecisions && pendingDecisions.count > 3) {
      suggestions.push({
        type: 'decision_review',
        description: `${pendingDecisions.count} decisions awaiting follow-up — consider a review session`,
        priority: AttentionPriority.HIGH,
      });
    }

    // Suggest checking stale delegations
    const activeDelegations = brief.sections.activeDelegations;
    if (activeDelegations && activeDelegations.count > 3) {
      suggestions.push({
        type: 'delegation_review',
        description: `${activeDelegations.count} active delegations — consider a status check`,
        priority: AttentionPriority.MEDIUM,
      });
    }

    // Suggest acting on detected patterns
    const patterns = brief.sections.detectedPatterns;
    if (patterns && patterns.count > 0) {
      suggestions.push({
        type: 'pattern_action',
        description: `${patterns.count} recurring pattern(s) detected — potential for automation or process improvement`,
        priority: AttentionPriority.LOW,
      });
    }

    // Anomaly follow-up
    const anomalies = brief.sections.anomalies;
    if (anomalies && anomalies.count > 0) {
      const criticalCount = anomalies.items.filter(a => a.severity === AnomalySeverity.CRITICAL).length;
      if (criticalCount > 0) {
        suggestions.push({
          type: 'anomaly_resolution',
          description: `${criticalCount} critical anomaly(ies) detected — requires immediate attention`,
          priority: AttentionPriority.URGENT,
        });
      }
    }

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    suggestions.sort(
      (a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3),
    );

    return suggestions;
  }

  /**
   * Convert time range string to Date
   * @private
   * @param {string} range - '24h', '7d', '30d'
   * @returns {Date}
   */
  _timeRangeToDate(range) {
    const now = new Date();
    switch (range) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Format duration in ms to human-readable string
   * @private
   * @param {number} ms - Duration in milliseconds
   * @returns {string}
   */
  _formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3_600_000) return `${Math.round(ms / 60_000)}min`;
    const hours = Math.round(ms / 3_600_000 * 10) / 10;
    return `${hours}h`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════
//                              FACTORY
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Create a new ProactiveIntelligence instance
 * @param {Object} options - See ProactiveIntelligence constructor
 * @returns {ProactiveIntelligence}
 */
function createProactiveIntelligence(options) {
  return new ProactiveIntelligence(options);
}

// ═══════════════════════════════════════════════════════════════════════════════════
//                              EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════════

module.exports = {
  ProactiveIntelligence,
  createProactiveIntelligence,
  AnomalySeverity,
  AttentionPriority,
  DEFAULT_THRESHOLDS,
};
