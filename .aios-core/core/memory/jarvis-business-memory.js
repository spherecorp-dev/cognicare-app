#!/usr/bin/env node

/**
 * Jarvis Business Memory
 *
 * Adapted from: gotchas-memory.js (Story 9.4, Epic 9)
 * Purpose: Persistent business context memory for Jarvis CEO assistant
 *
 * Captures business patterns instead of error patterns:
 * - Strategic decisions, vision, roadmap
 * - Delegation preferences and agent performance
 * - CEO feedback on outcomes
 * - Operational preferences and conventions
 * - Key business decisions
 * - Business insights discovered
 *
 * Features:
 * - EventEmitter-based with typed events
 * - Map-based in-memory storage with JSON file persistence
 * - Categories: strategy, delegation, feedback, preference, decision, insight
 * - Auto-capture when delegation patterns repeat (threshold-based)
 * - Context injection for tasks (relevance scoring)
 * - Search, query, filter, statistics
 * - Summarize for briefings (24h, 7d, 30d)
 * - Markdown and JSON export
 * - CLI interface
 *
 * @author @dev (Dex)
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

// ═══════════════════════════════════════════════════════════════════════════════════
//                              CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // Output paths
  businessMemoryJsonPath: '.aios/jarvis/business-memory.json',
  businessMemoryMdPath: '.aios/jarvis/business-memory.md',
  delegationTrackingPath: '.aios/jarvis/delegation-tracking.json',

  // Auto-capture settings
  repeatThreshold: 3, // Number of times delegation must repeat to auto-capture
  delegationWindowMs: 7 * 24 * 60 * 60 * 1000, // 7 days window for delegation counting

  // Version
  version: '1.0.0',
  schemaVersion: 'aios-jarvis-business-memory-v1',
};

// ═══════════════════════════════════════════════════════════════════════════════════
//                              ENUMS
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Business pattern categories
 */
const BusinessCategory = {
  STRATEGY: 'strategy',       // Strategic decisions, vision
  DELEGATION: 'delegation',   // Delegation preferences, agent performance
  FEEDBACK: 'feedback',       // CEO feedback on outcomes
  PREFERENCE: 'preference',   // Operational preferences
  DECISION: 'decision',       // Key business decisions
  INSIGHT: 'insight',         // Business insights discovered
  GENERAL: 'general',         // Uncategorized
};

/**
 * Importance levels (replaces Severity)
 */
const Importance = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

/**
 * Category keywords for auto-detection
 */
const CATEGORY_KEYWORDS = {
  [BusinessCategory.STRATEGY]: [
    'strategy',
    'vision',
    'roadmap',
    'direction',
    'goal',
    'objective',
    'plan',
    'priority',
    'mission',
    'milestone',
    'quarter',
    'okr',
  ],
  [BusinessCategory.DELEGATION]: [
    'delegate',
    'assign',
    'agent',
    'team',
    'execute',
    'task',
    'workflow',
    'handoff',
    'ownership',
    'responsible',
  ],
  [BusinessCategory.FEEDBACK]: [
    'feedback',
    'review',
    'quality',
    'improve',
    'concern',
    'issue',
    'problem',
    'satisfied',
    'disappointed',
    'excellent',
  ],
  [BusinessCategory.PREFERENCE]: [
    'prefer',
    'always',
    'never',
    'default',
    'standard',
    'convention',
    'rule',
    'style',
    'format',
    'approach',
  ],
  [BusinessCategory.DECISION]: [
    'decide',
    'choose',
    'approve',
    'reject',
    'select',
    'option',
    'alternative',
    'go with',
    'confirmed',
    'vetoed',
  ],
  [BusinessCategory.INSIGHT]: [
    'notice',
    'pattern',
    'trend',
    'discover',
    'realize',
    'learn',
    'observe',
    'finding',
    'correlation',
    'metric',
  ],
};

/**
 * Events emitted by JarvisBusinessMemory
 */
const Events = {
  PATTERN_CAPTURED: 'pattern_captured',
  PATTERN_UPDATED: 'pattern_updated',
  PATTERN_RESOLVED: 'pattern_resolved',
  CONTEXT_INJECTED: 'context_injected',
  SUMMARY_GENERATED: 'summary_generated',
};

// ═══════════════════════════════════════════════════════════════════════════════════
//                              JARVIS BUSINESS MEMORY CLASS
// ═══════════════════════════════════════════════════════════════════════════════════

class JarvisBusinessMemory extends EventEmitter {
  /**
   * Create a new JarvisBusinessMemory instance
   *
   * @param {string} rootPath - Project root path
   * @param {Object} [options] - Configuration options
   */
  constructor(rootPath, options = {}) {
    super();
    this.rootPath = rootPath || process.cwd();
    this.options = {
      repeatThreshold: options.repeatThreshold || CONFIG.repeatThreshold,
      delegationWindowMs: options.delegationWindowMs || CONFIG.delegationWindowMs,
      quiet: options.quiet || false,
    };

    // Paths
    this.businessMemoryJsonPath = path.join(this.rootPath, CONFIG.businessMemoryJsonPath);
    this.businessMemoryMdPath = path.join(this.rootPath, CONFIG.businessMemoryMdPath);
    this.delegationTrackingPath = path.join(this.rootPath, CONFIG.delegationTrackingPath);

    // In-memory storage
    this.patterns = new Map(); // id -> pattern
    this.delegationTracking = new Map(); // delegationHash -> { count, firstSeen, lastSeen, samples }

    // Load existing data
    this._loadPatterns();
    this._loadDelegationTracking();
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              PUBLIC METHODS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Capture a business pattern
   *
   * @param {Object} data - Pattern data
   * @param {string} data.title - Short title
   * @param {string} data.description - Detailed description
   * @param {string} [data.category] - Category (auto-detected if not provided)
   * @param {string} [data.importance] - Importance level (high, medium, low)
   * @param {Object} [data.context] - Business context
   * @param {string[]} [data.context.agents_involved] - Agents involved
   * @param {string[]} [data.context.related_stories] - Related stories
   * @param {string[]} [data.context.related_epics] - Related epics
   * @param {string} [data.context.business_domain] - Business domain
   * @param {string} [data.outcome] - What happened as a result
   * @param {string} [data.learned_pattern] - Pattern recognized
   * @param {string[]} [data.tags] - Tags for classification
   * @returns {Object} Created pattern
   */
  capture(data) {
    const pattern = this._createPattern(data, 'ceo_input');
    this.patterns.set(pattern.id, pattern);
    this._savePatterns();

    this.emit(Events.PATTERN_CAPTURED, pattern);
    this._log(`Captured pattern: ${pattern.title}`);

    return pattern;
  }

  /**
   * Track a delegation occurrence (auto-capture logic)
   *
   * If CEO delegates similar tasks 3+ times, auto-capture the delegation preference.
   *
   * @param {Object} delegationData - Delegation information
   * @param {string} delegationData.description - What was delegated
   * @param {string} [delegationData.agent] - Agent delegated to
   * @param {string} [delegationData.domain] - Business domain
   * @param {Object} [delegationData.context] - Additional context
   * @returns {Object|null} Auto-captured pattern if threshold reached
   */
  trackDelegation(delegationData) {
    const delegationHash = this._hashDelegation(delegationData);
    const now = Date.now();

    // Get or create tracking entry
    let tracking = this.delegationTracking.get(delegationHash);
    if (!tracking) {
      tracking = {
        count: 0,
        firstSeen: now,
        lastSeen: now,
        samples: [],
        delegationPattern: delegationData.description,
        agent: delegationData.agent || null,
        category: this._detectCategory(
          delegationData.description + ' ' + (delegationData.domain || ''),
        ),
      };
    }

    // Update tracking
    tracking.count++;
    tracking.lastSeen = now;
    if (tracking.samples.length < 5) {
      tracking.samples.push({
        timestamp: new Date(now).toISOString(),
        agent: delegationData.agent,
        context: delegationData.context,
      });
    }

    this.delegationTracking.set(delegationHash, tracking);
    this._saveDelegationTracking();

    // Check if threshold reached for auto-capture
    if (tracking.count >= this.options.repeatThreshold) {
      // Check if not already captured
      const existingPattern = this._findPatternByDelegation(delegationData.description);
      if (!existingPattern) {
        return this._autoCaptureDelegation(delegationData, tracking);
      }
    }

    return null;
  }

  /**
   * Query patterns with filters
   *
   * @param {Object} [options] - Filter options
   * @param {string} [options.category] - Filter by category
   * @param {string} [options.importance] - Filter by importance
   * @param {boolean} [options.unresolved] - Only show unresolved
   * @param {string[]} [options.tags] - Filter by tags (any match)
   * @param {string} [options.agent] - Filter by agent involved
   * @returns {Object[]} List of patterns
   */
  query(options = {}) {
    let patterns = [...this.patterns.values()];

    if (options.category) {
      patterns = patterns.filter((p) => p.category === options.category);
    }

    if (options.importance) {
      patterns = patterns.filter((p) => p.importance === options.importance);
    }

    if (options.unresolved) {
      patterns = patterns.filter((p) => !p.resolved);
    }

    if (options.tags && options.tags.length > 0) {
      patterns = patterns.filter((p) =>
        p.tags.some((tag) => options.tags.includes(tag)),
      );
    }

    if (options.agent) {
      patterns = patterns.filter(
        (p) =>
          p.context &&
          p.context.agents_involved &&
          p.context.agents_involved.includes(options.agent),
      );
    }

    // Sort by importance (high first), then by most recent
    const importanceOrder = { high: 0, medium: 1, low: 2 };
    patterns.sort((a, b) => {
      const importanceDiff =
        (importanceOrder[a.importance] ?? 2) - (importanceOrder[b.importance] ?? 2);
      if (importanceDiff !== 0) return importanceDiff;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return patterns;
  }

  /**
   * Get patterns relevant to a business context
   *
   * @param {string} context - Description of the business context
   * @param {string[]} [relatedAgents] - Agents involved
   * @returns {Object[]} Relevant patterns for context injection
   */
  getRelevant(context, relatedAgents = []) {
    const relevantPatterns = [];
    const contextLower = context.toLowerCase();
    const agentNames = relatedAgents.map((a) => a.toLowerCase());

    for (const pattern of this.patterns.values()) {
      if (pattern.resolved) continue;

      let relevanceScore = 0;

      // Check category match
      const contextCategory = this._detectCategory(context);
      if (pattern.category === contextCategory) {
        relevanceScore += 3;
      }

      // Check keyword matches in description
      const patternKeywords = this._extractKeywords(
        `${pattern.title} ${pattern.description} ${pattern.outcome || ''} ${pattern.learned_pattern || ''}`,
      );
      for (const keyword of patternKeywords) {
        if (contextLower.includes(keyword)) {
          relevanceScore += 1;
        }
      }

      // Check agent matches
      if (
        pattern.context &&
        pattern.context.agents_involved &&
        pattern.context.agents_involved.length > 0
      ) {
        for (const patternAgent of pattern.context.agents_involved) {
          const patternAgentLower = patternAgent.toLowerCase();
          for (const agent of agentNames) {
            if (agent.includes(patternAgentLower) || patternAgentLower.includes(agent)) {
              relevanceScore += 2;
            }
          }
        }
      }

      // Check tag matches
      if (pattern.tags && pattern.tags.length > 0) {
        for (const tag of pattern.tags) {
          if (contextLower.includes(tag.toLowerCase())) {
            relevanceScore += 1;
          }
        }
      }

      // Boost high-importance patterns
      if (pattern.importance === 'high') {
        relevanceScore += 2;
      }

      // Boost preference patterns (they are always relevant)
      if (pattern.category === BusinessCategory.PREFERENCE) {
        relevanceScore += 1;
      }

      if (relevanceScore > 0) {
        relevantPatterns.push({
          ...pattern,
          relevanceScore,
        });
      }
    }

    // Sort by relevance and return top matches
    relevantPatterns.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const result = relevantPatterns.slice(0, 10);

    if (result.length > 0) {
      this.emit(Events.CONTEXT_INJECTED, {
        context,
        patternsCount: result.length,
      });
    }

    return result;
  }

  /**
   * Format patterns for prompt injection
   *
   * @param {Object[]} patterns - Patterns to format
   * @returns {string} Formatted string for Jarvis prompt injection
   */
  formatForPrompt(patterns) {
    if (!patterns || patterns.length === 0) {
      return '';
    }

    let prompt = '\n## Business Context (From Memory)\n\n';

    for (const pattern of patterns) {
      const importanceLabel =
        {
          high: '[HIGH]',
          medium: '[MEDIUM]',
          low: '[LOW]',
        }[pattern.importance] || '[MEDIUM]';

      const categoryLabel = pattern.category.charAt(0).toUpperCase() + pattern.category.slice(1);

      prompt += `### ${importanceLabel} ${pattern.title}\n`;
      prompt += `**Category:** ${categoryLabel}\n`;
      prompt += `${pattern.description}\n`;

      if (pattern.outcome) {
        prompt += `\n**Outcome:** ${pattern.outcome}\n`;
      }

      if (pattern.learned_pattern) {
        prompt += `**Learned Pattern:** ${pattern.learned_pattern}\n`;
      }

      if (
        pattern.context &&
        pattern.context.agents_involved &&
        pattern.context.agents_involved.length > 0
      ) {
        prompt += `**Agents:** ${pattern.context.agents_involved.join(', ')}\n`;
      }

      prompt += '\n';
    }

    return prompt;
  }

  /**
   * Search patterns by query
   *
   * @param {string} query - Search query
   * @returns {Object[]} Matching patterns
   */
  search(query) {
    const lowerQuery = query.toLowerCase();
    return [...this.patterns.values()].filter((pattern) => {
      const searchText = [
        pattern.id,
        pattern.title,
        pattern.description,
        pattern.outcome || '',
        pattern.learned_pattern || '',
        pattern.category,
        ...(pattern.tags || []),
        ...(pattern.context && pattern.context.agents_involved
          ? pattern.context.agents_involved
          : []),
        (pattern.context && pattern.context.business_domain) || '',
      ]
        .join(' ')
        .toLowerCase();

      return searchText.includes(lowerQuery);
    });
  }

  /**
   * Generate a summary for briefings
   *
   * @param {string} [timeRange='24h'] - Time range: '24h', '7d', '30d', 'all'
   * @returns {Object} Structured summary
   */
  summarize(timeRange = '24h') {
    const now = Date.now();
    const rangeMs = this._parseTimeRange(timeRange);

    // Filter patterns within time range
    let patterns = [...this.patterns.values()];
    if (rangeMs !== null) {
      const cutoff = now - rangeMs;
      patterns = patterns.filter(
        (p) => new Date(p.created_at).getTime() >= cutoff,
      );
    }

    // Group by category
    const byCategory = {};
    for (const category of Object.values(BusinessCategory)) {
      const categoryPatterns = patterns.filter((p) => p.category === category);
      if (categoryPatterns.length > 0) {
        byCategory[category] = categoryPatterns.length;
      }
    }

    // Recent decisions
    const recentDecisions = patterns
      .filter((p) => p.category === BusinessCategory.DECISION)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    // Active preferences (unresolved preferences)
    const activePreferences = [...this.patterns.values()]
      .filter(
        (p) =>
          p.category === BusinessCategory.PREFERENCE && !p.resolved,
      )
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Pending follow-ups (patterns with outcomes still null)
    const pendingFollowUps = patterns
      .filter((p) => !p.resolved && !p.outcome)
      .sort((a, b) => {
        const importanceOrder = { high: 0, medium: 1, low: 2 };
        return (
          (importanceOrder[a.importance] ?? 2) -
          (importanceOrder[b.importance] ?? 2)
        );
      })
      .slice(0, 10);

    const summary = {
      timeRange,
      generatedAt: new Date().toISOString(),
      totalPatterns: patterns.length,
      byCategory,
      recentDecisions: recentDecisions.map((d) => ({
        title: d.title,
        importance: d.importance,
        outcome: d.outcome,
        created_at: d.created_at,
      })),
      activePreferences: activePreferences.map((p) => ({
        title: p.title,
        description: p.description,
        created_at: p.created_at,
      })),
      pendingFollowUps: pendingFollowUps.map((p) => ({
        title: p.title,
        category: p.category,
        importance: p.importance,
        created_at: p.created_at,
      })),
    };

    this.emit(Events.SUMMARY_GENERATED, summary);
    return summary;
  }

  /**
   * Update an existing pattern
   *
   * @param {string} patternId - Pattern ID
   * @param {Object} updates - Fields to update
   * @returns {Object|null} Updated pattern or null if not found
   */
  updatePattern(patternId, updates) {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      return null;
    }

    // Apply allowed updates
    const allowedFields = [
      'title',
      'description',
      'category',
      'importance',
      'context',
      'outcome',
      'learned_pattern',
      'tags',
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        pattern[field] = updates[field];
      }
    }

    this._savePatterns();
    this.emit(Events.PATTERN_UPDATED, pattern);

    return pattern;
  }

  /**
   * Mark a pattern as resolved
   *
   * @param {string} patternId - Pattern ID
   * @param {string} [resolvedBy] - Who/what resolved it
   * @returns {Object|null} Updated pattern or null if not found
   */
  resolvePattern(patternId, resolvedBy = 'manual') {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      return null;
    }

    pattern.resolved = true;
    pattern.resolvedAt = new Date().toISOString();
    pattern.resolvedBy = resolvedBy;

    this._savePatterns();
    this.emit(Events.PATTERN_RESOLVED, pattern);

    return pattern;
  }

  /**
   * Remove a pattern
   *
   * @param {string} patternId - Pattern ID
   * @returns {boolean} True if removed
   */
  removePattern(patternId) {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      return false;
    }

    this.patterns.delete(patternId);
    this._savePatterns();

    return true;
  }

  /**
   * Get statistics
   *
   * @returns {Object} Statistics object
   */
  getStatistics() {
    const patterns = [...this.patterns.values()];
    const byCategory = {};
    const byImportance = { high: 0, medium: 0, low: 0 };
    const bySource = { ceo_input: 0, delegation_outcome: 0, auto_detected: 0 };

    for (const pattern of patterns) {
      byCategory[pattern.category] = (byCategory[pattern.category] || 0) + 1;
      byImportance[pattern.importance] = (byImportance[pattern.importance] || 0) + 1;
      bySource[pattern.source.type] = (bySource[pattern.source.type] || 0) + 1;
    }

    return {
      totalPatterns: patterns.length,
      resolved: patterns.filter((p) => p.resolved).length,
      unresolved: patterns.filter((p) => !p.resolved).length,
      withOutcome: patterns.filter((p) => p.outcome).length,
      withLearnedPattern: patterns.filter((p) => p.learned_pattern).length,
      byCategory,
      byImportance,
      bySource,
      trackedDelegations: this.delegationTracking.size,
      pendingAutoCapture: [...this.delegationTracking.values()].filter(
        (t) =>
          t.count >= this.options.repeatThreshold - 1 &&
          t.count < this.options.repeatThreshold,
      ).length,
    };
  }

  /**
   * Export to JSON
   *
   * @returns {Object} JSON export
   */
  toJSON() {
    return {
      schema: CONFIG.schemaVersion,
      version: CONFIG.version,
      projectId: path.basename(this.rootPath),
      lastUpdated: new Date().toISOString(),
      statistics: this.getStatistics(),
      patterns: [...this.patterns.values()],
    };
  }

  /**
   * Generate markdown output
   *
   * @returns {string} Markdown content
   */
  toMarkdown() {
    const stats = this.getStatistics();
    const now = new Date().toISOString();

    let md = `# Jarvis Business Memory

> Auto-generated by AIOS Jarvis Business Memory
> Last updated: ${now}
> Total: ${stats.totalPatterns} (${stats.unresolved} active)

---

## Table of Contents

`;

    // Generate TOC by category
    for (const category of Object.values(BusinessCategory)) {
      const count = stats.byCategory[category] || 0;
      if (count > 0) {
        md += `- [${category.charAt(0).toUpperCase() + category.slice(1)}](#${category}) (${count})\n`;
      }
    }

    md += '\n---\n\n';

    // Generate content by category
    for (const category of Object.values(BusinessCategory)) {
      const categoryPatterns = this.query({ category });
      if (categoryPatterns.length === 0) continue;

      md += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;

      for (const pattern of categoryPatterns) {
        md += this._renderPatternMarkdown(pattern);
      }
    }

    // Add statistics
    md += `---

## Statistics

| Metric | Value |
|--------|-------|
| Total Patterns | ${stats.totalPatterns} |
| Active | ${stats.unresolved} |
| High Importance | ${stats.byImportance.high} |
| Medium Importance | ${stats.byImportance.medium} |
| Low Importance | ${stats.byImportance.low} |
| CEO Input | ${stats.bySource.ceo_input} |
| Delegation Outcome | ${stats.bySource.delegation_outcome} |
| Auto-detected | ${stats.bySource.auto_detected} |
| With Outcome | ${stats.withOutcome} |
| With Learned Pattern | ${stats.withLearnedPattern} |

---

*Generated by AIOS Jarvis Business Memory v${CONFIG.version}*
`;

    return md;
  }

  /**
   * Save all data
   */
  save() {
    this._savePatterns();
    this._saveDelegationTracking();
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Create a pattern object
   * @private
   */
  _createPattern(data, sourceType) {
    const now = new Date().toISOString();
    const category =
      data.category ||
      this._detectCategory(`${data.title || ''} ${data.description || ''}`);

    return {
      id: data.id || this._generateId(),
      title: data.title || 'Untitled Pattern',
      description: data.description || '',
      category,
      importance: this._normalizeImportance(data.importance),
      context: {
        agents_involved: (data.context && data.context.agents_involved) || [],
        related_stories: (data.context && data.context.related_stories) || [],
        related_epics: (data.context && data.context.related_epics) || [],
        business_domain: (data.context && data.context.business_domain) || null,
      },
      outcome: data.outcome || null,
      learned_pattern: data.learned_pattern || null,
      source: {
        type: sourceType,
        session_id: (data.source && data.source.session_id) || null,
        timestamp: now,
      },
      tags: data.tags || [],
      resolved: false,
      resolvedAt: null,
      resolvedBy: null,
      created_at: now,
    };
  }

  /**
   * Auto-capture a delegation preference from repeated patterns
   * @private
   */
  _autoCaptureDelegation(delegationData, tracking) {
    const pattern = this._createPattern(
      {
        title: this._generateTitleFromDelegation(delegationData.description, tracking.agent),
        description: `CEO repeatedly delegates "${delegationData.description}" tasks. ` +
          `Detected ${tracking.count} similar delegations.`,
        category: BusinessCategory.DELEGATION,
        importance: Importance.MEDIUM,
        context: {
          agents_involved: tracking.samples
            .filter((s) => s.agent)
            .map((s) => s.agent)
            .filter((a, i, arr) => arr.indexOf(a) === i),
          related_stories: [],
          related_epics: [],
          business_domain: delegationData.domain || null,
        },
        outcome: null,
        learned_pattern: `CEO prefers to delegate "${delegationData.description}" type tasks` +
          (tracking.agent ? ` to ${tracking.agent}` : ''),
        tags: ['auto-detected', 'delegation-preference'],
      },
      'auto_detected',
    );

    this.patterns.set(pattern.id, pattern);
    this._savePatterns();

    this.emit(Events.PATTERN_CAPTURED, pattern);
    this._log(
      `Auto-captured delegation preference: ${pattern.title} (${tracking.count} occurrences)`,
    );

    return pattern;
  }

  /**
   * Find pattern by delegation description
   * @private
   */
  _findPatternByDelegation(description) {
    const keywords = this._extractKeywords(description);
    for (const pattern of this.patterns.values()) {
      if (
        pattern.source.type === 'auto_detected' &&
        pattern.category === BusinessCategory.DELEGATION
      ) {
        const patternKeywords = this._extractKeywords(pattern.description);
        const matchCount = keywords.filter((k) => patternKeywords.includes(k)).length;
        if (matchCount >= Math.min(3, keywords.length * 0.5)) {
          return pattern;
        }
      }
    }
    return null;
  }

  /**
   * Generate title from delegation description
   * @private
   */
  _generateTitleFromDelegation(description, agent) {
    const cleaned = description.substring(0, 50).trim();
    const agentSuffix = agent ? ` -> ${agent}` : '';
    const title = `Delegation preference: ${cleaned}${agentSuffix}`;

    if (title.length > 80) {
      return title.substring(0, 77) + '...';
    }
    return title;
  }

  /**
   * Hash delegation for deduplication
   * @private
   */
  _hashDelegation(delegationData) {
    // Normalize the description for matching
    const normalized = delegationData.description
      .toLowerCase()
      .replace(/\d+/g, 'N')
      .replace(/["'].*?["']/g, '"X"')
      .substring(0, 100);

    let hash = 0;
    const input = normalized + (delegationData.agent || '');
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Detect category from text
   * @private
   */
  _detectCategory(text) {
    const lowerText = text.toLowerCase();

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          return category;
        }
      }
    }

    return BusinessCategory.GENERAL;
  }

  /**
   * Normalize importance level
   * @private
   */
  _normalizeImportance(importance) {
    if (!importance) return Importance.MEDIUM;

    const lower = (importance + '').toLowerCase();
    if (lower === 'high' || lower === 'critical' || lower === 'urgent') {
      return Importance.HIGH;
    }
    if (lower === 'low' || lower === 'minor' || lower === 'trivial') {
      return Importance.LOW;
    }
    return Importance.MEDIUM;
  }

  /**
   * Extract keywords from text
   * @private
   */
  _extractKeywords(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3);
  }

  /**
   * Parse time range string to milliseconds
   * @private
   */
  _parseTimeRange(timeRange) {
    const ranges = {
      '1h': 1 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      all: null,
    };

    return ranges[timeRange] !== undefined ? ranges[timeRange] : ranges['24h'];
  }

  /**
   * Generate unique ID
   * @private
   */
  _generateId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `biz-${timestamp}-${random}`;
  }

  /**
   * Render pattern as markdown
   * @private
   */
  _renderPatternMarkdown(pattern) {
    const importanceLabel =
      {
        high: '**[HIGH]**',
        medium: '**[MEDIUM]**',
        low: '[LOW]',
      }[pattern.importance] || '';

    let md = `### ${pattern.title}\n\n`;
    md += `${importanceLabel}${pattern.resolved ? ' (RESOLVED)' : ''}\n\n`;
    md += `${pattern.description}\n\n`;

    if (pattern.outcome) {
      md += `**Outcome:** ${pattern.outcome}\n\n`;
    }

    if (pattern.learned_pattern) {
      md += `**Learned Pattern:** ${pattern.learned_pattern}\n\n`;
    }

    if (
      pattern.context &&
      pattern.context.agents_involved &&
      pattern.context.agents_involved.length > 0
    ) {
      md += `**Agents Involved:** ${pattern.context.agents_involved.join(', ')}\n`;
    }

    if (pattern.context && pattern.context.business_domain) {
      md += `**Domain:** ${pattern.context.business_domain}\n`;
    }

    if (pattern.tags && pattern.tags.length > 0) {
      md += `**Tags:** ${pattern.tags.join(', ')}\n`;
    }

    md += `**Source:** ${pattern.source.type} | **Created:** ${pattern.created_at}\n\n`;

    md += '---\n\n';
    return md;
  }

  /**
   * Load patterns from file
   * @private
   */
  _loadPatterns() {
    try {
      if (fs.existsSync(this.businessMemoryJsonPath)) {
        const content = fs.readFileSync(this.businessMemoryJsonPath, 'utf-8');
        const data = JSON.parse(content);

        if (data.patterns && Array.isArray(data.patterns)) {
          for (const pattern of data.patterns) {
            this.patterns.set(pattern.id, pattern);
          }
        }
      }
    } catch (error) {
      this._log(`Warning: Could not load business memory: ${error.message}`, 'warn');
    }
  }

  /**
   * Save patterns to files
   * @private
   */
  _savePatterns() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.businessMemoryJsonPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Save JSON
      fs.writeFileSync(
        this.businessMemoryJsonPath,
        JSON.stringify(this.toJSON(), null, 2),
        'utf-8',
      );

      // Save Markdown
      fs.writeFileSync(this.businessMemoryMdPath, this.toMarkdown(), 'utf-8');
    } catch (error) {
      this._log(`Error saving business memory: ${error.message}`, 'error');
    }
  }

  /**
   * Load delegation tracking from file
   * @private
   */
  _loadDelegationTracking() {
    try {
      if (fs.existsSync(this.delegationTrackingPath)) {
        const content = fs.readFileSync(this.delegationTrackingPath, 'utf-8');
        const data = JSON.parse(content);

        if (data.delegations && typeof data.delegations === 'object') {
          for (const [hash, tracking] of Object.entries(data.delegations)) {
            this.delegationTracking.set(hash, tracking);
          }
        }
      }
    } catch (error) {
      this._log(
        `Warning: Could not load delegation tracking: ${error.message}`,
        'warn',
      );
    }
  }

  /**
   * Save delegation tracking to file
   * @private
   */
  _saveDelegationTracking() {
    try {
      const dir = path.dirname(this.delegationTrackingPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        version: CONFIG.version,
        updatedAt: new Date().toISOString(),
        delegations: Object.fromEntries(this.delegationTracking),
      };

      fs.writeFileSync(
        this.delegationTrackingPath,
        JSON.stringify(data, null, 2),
        'utf-8',
      );
    } catch (error) {
      this._log(`Error saving delegation tracking: ${error.message}`, 'error');
    }
  }

  /**
   * Log message
   * @private
   */
  _log(message, level = 'info') {
    if (this.options.quiet) return;

    const prefix =
      {
        info: '',
        warn: '\x1b[33m[WARN]\x1b[0m ',
        error: '\x1b[31m[ERROR]\x1b[0m ',
      }[level] || '';

    console.log(`${prefix}${message}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              STATIC METHODS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * CLI main function
   */
  static async main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
      JarvisBusinessMemory.showHelp();
      process.exit(0);
    }

    const rootPath = process.cwd();
    const memory = new JarvisBusinessMemory(rootPath);

    // Parse command
    const command = args[0] || 'list';
    const rest = args.slice(1);

    switch (command) {
      case 'capture': {
        const title = rest.join(' ');
        if (!title) {
          console.error('Error: Title required');
          process.exit(1);
        }
        const pattern = memory.capture({
          title,
          description: title,
        });
        console.log(`Captured pattern: ${pattern.id}`);
        break;
      }

      case 'list': {
        const options = {};
        if (rest.includes('--category')) {
          const idx = rest.indexOf('--category');
          options.category = rest[idx + 1];
        }
        if (rest.includes('--importance')) {
          const idx = rest.indexOf('--importance');
          options.importance = rest[idx + 1];
        }
        if (rest.includes('--unresolved')) {
          options.unresolved = true;
        }
        if (rest.includes('--agent')) {
          const idx = rest.indexOf('--agent');
          options.agent = rest[idx + 1];
        }

        const patterns = memory.query(options);
        console.log(`\n=== Business Patterns (${patterns.length}) ===\n`);

        for (const pattern of patterns) {
          const status = pattern.resolved ? '(RESOLVED)' : '';
          console.log(
            `[${pattern.importance.toUpperCase()}] ${pattern.title} ${status}`,
          );
          console.log(`  Category: ${pattern.category}`);
          console.log(`  ID: ${pattern.id}`);
          console.log('');
        }
        break;
      }

      case 'search': {
        const query = rest.join(' ');
        if (!query) {
          console.error('Error: Search query required');
          process.exit(1);
        }
        const results = memory.search(query);
        console.log(
          `\n=== Search Results for "${query}" (${results.length}) ===\n`,
        );

        for (const pattern of results) {
          console.log(
            `[${pattern.importance.toUpperCase()}] ${pattern.title}`,
          );
          console.log(`  ${pattern.description.substring(0, 80)}...`);
          console.log('');
        }
        break;
      }

      case 'summarize': {
        const timeRange = rest[0] || '24h';
        const summary = memory.summarize(timeRange);
        console.log(`\n=== Business Summary (${timeRange}) ===\n`);
        console.log(JSON.stringify(summary, null, 2));
        break;
      }

      case 'stats': {
        const stats = memory.getStatistics();
        console.log('\n=== Business Memory Statistics ===\n');
        console.log(JSON.stringify(stats, null, 2));
        break;
      }

      case 'resolve': {
        const patternId = rest[0];
        if (!patternId) {
          console.error('Error: Pattern ID required');
          process.exit(1);
        }
        const result = memory.resolvePattern(patternId);
        if (result) {
          console.log(`Resolved pattern: ${result.title}`);
        } else {
          console.error(`Pattern not found: ${patternId}`);
          process.exit(1);
        }
        break;
      }

      case 'context': {
        const contextDesc = rest.join(' ');
        if (!contextDesc) {
          console.error('Error: Context description required');
          process.exit(1);
        }
        const relevant = memory.getRelevant(contextDesc);
        if (relevant.length > 0) {
          console.log(memory.formatForPrompt(relevant));
        } else {
          console.log('No relevant business patterns found for this context.');
        }
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        JarvisBusinessMemory.showHelp();
        process.exit(1);
    }
  }

  /**
   * Show CLI help
   */
  static showHelp() {
    console.log(`
Jarvis Business Memory - AIOS Memory Layer

Persistent business context memory for Jarvis CEO assistant.
Captures strategic decisions, delegation preferences, feedback,
and business insights.

Usage:
  node jarvis-business-memory.js [command] [options]

Commands:
  capture <title>       Capture a business pattern
  list                  List all business patterns
  search <query>        Search patterns
  summarize [range]     Generate briefing summary (24h, 7d, 30d, all)
  stats                 Show statistics
  resolve <id>          Mark pattern as resolved
  context <desc>        Get relevant patterns for a business context

Options:
  --category <cat>      Filter by category
  --importance <imp>    Filter by importance (high, medium, low)
  --unresolved          Show only active (unresolved) patterns
  --agent <name>        Filter by agent involved
  --help, -h            Show this help message

Categories:
  - strategy            Strategic decisions, vision
  - delegation          Delegation preferences, agent performance
  - feedback            CEO feedback on outcomes
  - preference          Operational preferences
  - decision            Key business decisions
  - insight             Business insights discovered
  - general             Uncategorized

Examples:
  node jarvis-business-memory.js capture "Always use @dev for refactoring tasks"
  node jarvis-business-memory.js list --category delegation
  node jarvis-business-memory.js search "roadmap"
  node jarvis-business-memory.js summarize 7d
  node jarvis-business-memory.js context "planning next sprint"
`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════
//                              EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════════

module.exports = {
  JarvisBusinessMemory,
  // Enums
  BusinessCategory,
  Importance,
  Events,
  // Config
  CONFIG,
};

// Run CLI if executed directly
if (require.main === module) {
  JarvisBusinessMemory.main();
}
