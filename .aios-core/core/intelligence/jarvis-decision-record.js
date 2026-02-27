'use strict';

/**
 * Jarvis Decision Record System
 *
 * Adapted from: epic-context-accumulator.js (Story 12.4)
 * Purpose: Records CEO decisions with full context — what alternatives were
 * considered, what was chosen, why, and what happened as a result.
 *
 * Uses progressive summarization (adapted from EpicContextAccumulator)
 * to maintain decision history within token limits, and provides
 * retrieval by topic, agent, or timeframe.
 *
 * @module core/intelligence/jarvis-decision-record
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
//                              CONSTANTS
// =============================================================================

const TOKEN_LIMIT = 8000;
const HARD_CAP_PER_DECISION = 600;
const CHARS_PER_TOKEN = 3.5;

// =============================================================================
//                              DETAIL LEVEL
// =============================================================================

/**
 * Detail levels for decision records (progressive summarization)
 * @enum {string}
 */
const DetailLevel = {
  FULL: 'full',
  SUMMARY: 'summary',
  MINIMAL: 'minimal',
};

/**
 * Fields included per detail level
 */
const DETAIL_FIELDS = {
  [DetailLevel.FULL]: [
    'id', 'title', 'category', 'context', 'alternatives',
    'chosen', 'rationale', 'outcome', 'followUp', 'decidedAt', 'decidedBy',
  ],
  [DetailLevel.SUMMARY]: [
    'id', 'title', 'category', 'chosen', 'rationale', 'decidedAt',
  ],
  [DetailLevel.MINIMAL]: [
    'id', 'title', 'chosen', 'decidedAt',
  ],
};

// =============================================================================
//                              UTILITY FUNCTIONS
// =============================================================================

/**
 * Estimates token count for a text string
 * @param {string} text - Text to estimate
 * @returns {number} Estimated token count
 */
function estimateTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Truncates text to fit within a token limit
 * @param {string} text - Text to truncate
 * @param {number} maxTokens - Maximum tokens allowed
 * @returns {string} Truncated text
 */
function truncateToTokens(text, maxTokens) {
  if (!text || typeof text !== 'string') return '';
  const maxChars = Math.floor(maxTokens * CHARS_PER_TOKEN);
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + '...';
}

/**
 * Determines detail level based on decision age
 * @param {string} decidedAt - ISO date string of when the decision was made
 * @returns {string} DetailLevel value
 */
function getDetailLevel(decidedAt) {
  if (!decidedAt) return DetailLevel.MINIMAL;

  const now = Date.now();
  const decisionTime = new Date(decidedAt).getTime();
  const ageMs = now - decisionTime;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays < 7) {
    return DetailLevel.FULL;
  }
  if (ageDays <= 30) {
    return DetailLevel.SUMMARY;
  }
  return DetailLevel.MINIMAL;
}

/**
 * Formats a single decision entry based on detail level
 * @param {Object} decision - Decision data
 * @param {string} level - DetailLevel
 * @returns {string} Formatted decision string
 */
function formatDecisionEntry(decision, level) {
  const fields = DETAIL_FIELDS[level];
  if (!fields) return '';

  const parts = [];
  for (const field of fields) {
    const value = decision[field];
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      // For alternatives, show concise summary
      if (field === 'alternatives') {
        const altSummary = value.map(alt => {
          if (typeof alt === 'object' && alt.option) {
            return alt.option;
          }
          return String(alt);
        });
        parts.push(`${field}: [${altSummary.join('; ')}]`);
      } else {
        parts.push(`${field}: [${value.join(', ')}]`);
      }
    } else if (typeof value === 'object') {
      // For context object, stringify concisely
      const summary = Object.entries(value)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
        .join(', ');
      if (summary) {
        parts.push(`${field}: {${summary}}`);
      }
    } else {
      parts.push(`${field}: ${value}`);
    }
  }

  const entry = parts.join(' | ');

  // Apply hard cap per decision
  const tokens = estimateTokens(entry);
  if (tokens > HARD_CAP_PER_DECISION) {
    return truncateToTokens(entry, HARD_CAP_PER_DECISION);
  }

  return entry;
}

// =============================================================================
//                              DECISION RECORD SYSTEM CLASS
// =============================================================================

/**
 * Decision Record System class
 * Records and retrieves CEO decisions with progressive summarization
 */
class DecisionRecordSystem {
  /**
   * @param {Object} options - Configuration options
   * @param {string} [options.storagePath] - Path to decisions JSON file
   * @param {Object} [options.businessMemory] - Optional JarvisBusinessMemory instance
   */
  constructor(options = {}) {
    this.storagePath = options.storagePath || path.join(process.cwd(), '.aios/jarvis/decisions.json');
    this.businessMemory = options.businessMemory || null;

    // In-memory storage: Map keyed by decision ID
    this.decisions = new Map();

    // Load existing data
    this._load();
  }

  // ===========================================================================
  //                              PUBLIC METHODS
  // ===========================================================================

  /**
   * Record a new CEO decision
   *
   * @param {Object} data - Decision data
   * @param {string} data.title - Short decision title
   * @param {string} [data.category] - Decision category (e.g. 'strategic', 'technical', 'operational', 'hiring', 'product')
   * @param {string} [data.context] - Background context for the decision
   * @param {Array<Object|string>} [data.alternatives] - Alternatives considered (each can be {option, pros, cons} or a string)
   * @param {string} data.chosen - The chosen alternative / decision made
   * @param {string} [data.rationale] - Why this was chosen over alternatives
   * @param {string} [data.decidedBy] - Who made the decision (e.g. 'ceo', agent name)
   * @param {string} [data.followUp] - Expected follow-up action or check
   * @returns {Object} The created decision record
   */
  recordDecision(data) {
    const id = this._generateId();
    const now = new Date().toISOString();

    const decision = {
      id,
      title: data.title || 'Untitled Decision',
      category: data.category || 'general',
      context: data.context || null,
      alternatives: data.alternatives || [],
      chosen: data.chosen,
      rationale: data.rationale || null,
      decidedBy: data.decidedBy || 'ceo',
      followUp: data.followUp || null,
      outcome: null,
      outcomeRecordedAt: null,
      decidedAt: now,
    };

    this.decisions.set(id, decision);
    this._save();

    return { ...decision };
  }

  /**
   * Update the outcome of a previously recorded decision
   *
   * @param {string} decisionId - The decision ID to update
   * @param {string} outcome - Description of what happened as a result
   * @returns {Object|null} The updated decision, or null if not found
   */
  updateOutcome(decisionId, outcome) {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      return null;
    }

    decision.outcome = outcome;
    decision.outcomeRecordedAt = new Date().toISOString();

    this._save();

    return { ...decision };
  }

  /**
   * Retrieve decision history with optional filters
   *
   * @param {Object} [options] - Filter and retrieval options
   * @param {string} [options.topic] - Keyword matching against title + context + rationale
   * @param {string} [options.category] - Filter by decision category
   * @param {string} [options.agent] - Filter by decisions involving this agent (in context, alternatives, or decidedBy)
   * @param {number} [options.limit] - Maximum number of decisions to return
   * @param {string|Date} [options.since] - Only return decisions after this date
   * @returns {Array<Object>} Array of decisions sorted by recency, formatted with progressive detail levels
   */
  getDecisionHistory(options = {}) {
    const { topic, category, agent, limit, since } = options;

    let decisions = [...this.decisions.values()];

    // Filter by category
    if (category) {
      decisions = decisions.filter(d => d.category === category);
    }

    // Filter by agent — checks all text fields where an agent name could appear
    if (agent) {
      const agentLower = agent.toLowerCase();
      decisions = decisions.filter(d => {
        // Check decidedBy
        if (d.decidedBy && d.decidedBy.toLowerCase().includes(agentLower)) {
          return true;
        }
        // Check title
        if (d.title && d.title.toLowerCase().includes(agentLower)) {
          return true;
        }
        // Check chosen
        if (d.chosen && d.chosen.toLowerCase().includes(agentLower)) {
          return true;
        }
        // Check rationale
        if (d.rationale && d.rationale.toLowerCase().includes(agentLower)) {
          return true;
        }
        // Check context text
        if (d.context && d.context.toLowerCase().includes(agentLower)) {
          return true;
        }
        // Check alternatives
        if (d.alternatives && Array.isArray(d.alternatives)) {
          for (const alt of d.alternatives) {
            const altText = typeof alt === 'string' ? alt : JSON.stringify(alt);
            if (altText.toLowerCase().includes(agentLower)) {
              return true;
            }
          }
        }
        return false;
      });
    }

    // Filter by topic (keyword matching)
    if (topic) {
      decisions = decisions.filter(d => this._matchesTopic(d, topic));
    }

    // Filter by date
    if (since) {
      const sinceTime = new Date(since).getTime();
      decisions = decisions.filter(d => new Date(d.decidedAt).getTime() >= sinceTime);
    }

    // Sort by recency (newest first)
    decisions.sort((a, b) => new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime());

    // Apply limit before token processing
    if (limit && limit > 0) {
      decisions = decisions.slice(0, limit);
    }

    // Apply progressive detail levels based on age
    const entries = decisions.map(d => ({
      decision: d,
      level: getDetailLevel(d.decidedAt),
    }));

    let formattedEntries = entries.map(({ decision, level }) =>
      formatDecisionEntry(decision, level)
    );

    // Apply token limit with detail cascade
    formattedEntries = this._applyDetailCascade(entries, formattedEntries);

    // Return decision objects with their formatted summaries
    return entries.map((entry, i) => ({
      ...entry.decision,
      _detailLevel: entry.level,
      _formatted: formattedEntries[i],
    }));
  }

  /**
   * Get decisions that have a follow-up defined but no outcome recorded yet
   *
   * @returns {Array<Object>} Array of decisions with pending follow-ups, sorted by recency
   */
  getPendingFollowUps() {
    const pending = [...this.decisions.values()].filter(
      d => d.followUp && d.followUp.trim().length > 0 && d.outcome === null
    );

    // Sort by recency (newest first)
    pending.sort((a, b) => new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime());

    return pending.map(d => ({ ...d }));
  }

  /**
   * Get full detail for a specific decision by ID
   *
   * @param {string} decisionId - The decision ID
   * @returns {Object|null} Full decision record, or null if not found
   */
  getDecisionContext(decisionId) {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      return null;
    }

    // Always return full detail
    const formatted = formatDecisionEntry(decision, DetailLevel.FULL);

    return {
      ...decision,
      _detailLevel: DetailLevel.FULL,
      _formatted: formatted,
    };
  }

  /**
   * Build a markdown-formatted brief of recent decisions within token limits
   *
   * @param {Object} [options] - Brief options
   * @param {string} [options.topic] - Filter by topic
   * @param {string} [options.category] - Filter by category
   * @param {string} [options.agent] - Filter by agent
   * @param {number} [options.limit] - Maximum decisions
   * @param {string|Date} [options.since] - Only decisions after this date
   * @returns {string} Markdown-formatted decision brief within TOKEN_LIMIT
   */
  buildDecisionBrief(options = {}) {
    const decisions = this.getDecisionHistory(options);

    if (decisions.length === 0) {
      return '';
    }

    // Build header
    const total = this.decisions.size;
    const sections = [];
    sections.push(`Decision Record Brief (${decisions.length} of ${total} decisions):`);
    sections.push('---');

    // Build category distribution
    const categoryDist = {};
    for (const d of this.decisions.values()) {
      categoryDist[d.category] = (categoryDist[d.category] || 0) + 1;
    }
    const catSummary = Object.entries(categoryDist)
      .map(([cat, count]) => `${cat}: ${count}`)
      .join(', ');
    if (catSummary) {
      sections.push(`Categories: ${catSummary}`);
    }

    // Pending follow-ups count
    const pendingCount = this.getPendingFollowUps().length;
    if (pendingCount > 0) {
      sections.push(`Pending follow-ups: ${pendingCount}`);
    }

    sections.push('---');

    // Add formatted decisions
    for (const decision of decisions) {
      const level = decision._detailLevel;
      let entry = '';

      if (level === DetailLevel.FULL) {
        entry += `### ${decision.title}\n`;
        entry += `**ID:** ${decision.id} | **Category:** ${decision.category} | **By:** ${decision.decidedBy} | **Date:** ${decision.decidedAt}\n`;
        if (decision.context) {
          entry += `**Context:** ${decision.context}\n`;
        }
        if (decision.alternatives && decision.alternatives.length > 0) {
          entry += '**Alternatives considered:**\n';
          for (const alt of decision.alternatives) {
            if (typeof alt === 'object' && alt.option) {
              entry += `- ${alt.option}`;
              if (alt.pros) entry += ` (pros: ${alt.pros})`;
              if (alt.cons) entry += ` (cons: ${alt.cons})`;
              entry += '\n';
            } else {
              entry += `- ${alt}\n`;
            }
          }
        }
        entry += `**Chosen:** ${decision.chosen}\n`;
        if (decision.rationale) {
          entry += `**Rationale:** ${decision.rationale}\n`;
        }
        if (decision.outcome) {
          entry += `**Outcome:** ${decision.outcome}\n`;
        }
        if (decision.followUp) {
          entry += `**Follow-up:** ${decision.followUp}${decision.outcome === null ? ' (PENDING)' : ''}\n`;
        }
      } else if (level === DetailLevel.SUMMARY) {
        entry += `### ${decision.title}\n`;
        entry += `**Category:** ${decision.category} | **Date:** ${decision.decidedAt}\n`;
        entry += `**Chosen:** ${decision.chosen}\n`;
        if (decision.rationale) {
          entry += `**Rationale:** ${decision.rationale}\n`;
        }
      } else {
        // MINIMAL
        entry += `- **${decision.title}** — chose: ${decision.chosen} (${decision.decidedAt})\n`;
      }

      // Apply hard cap
      const tokens = estimateTokens(entry);
      if (tokens > HARD_CAP_PER_DECISION) {
        entry = truncateToTokens(entry, HARD_CAP_PER_DECISION);
      }

      sections.push(entry);
    }

    // Check total token limit and truncate if needed
    let result = sections.join('\n');
    let totalTokens = estimateTokens(result);

    if (totalTokens > TOKEN_LIMIT) {
      // Progressively downgrade detail levels from oldest to newest
      const mutableDecisions = [...decisions].reverse(); // oldest first
      for (const decision of mutableDecisions) {
        if (totalTokens <= TOKEN_LIMIT) break;

        if (decision._detailLevel === DetailLevel.FULL) {
          // Downgrade FULL to SUMMARY
          decision._detailLevel = DetailLevel.SUMMARY;
        } else if (decision._detailLevel === DetailLevel.SUMMARY) {
          // Downgrade SUMMARY to MINIMAL
          decision._detailLevel = DetailLevel.MINIMAL;
        }
      }

      // Rebuild with downgraded levels
      return this.buildDecisionBrief(options);
    }

    return result;
  }

  /**
   * Get statistics about the decision record
   *
   * @returns {Object} Statistics including totals, by category, by outcome status, pending follow-ups, avg time to outcome
   */
  getStatistics() {
    const decisions = [...this.decisions.values()];
    const total = decisions.length;

    // By category
    const byCategory = {};
    for (const d of decisions) {
      byCategory[d.category] = (byCategory[d.category] || 0) + 1;
    }

    // By outcome status
    const withOutcome = decisions.filter(d => d.outcome !== null).length;
    const withoutOutcome = total - withOutcome;

    // Pending follow-ups
    const pendingFollowUps = decisions.filter(
      d => d.followUp && d.followUp.trim().length > 0 && d.outcome === null
    ).length;

    // Average time to outcome (in hours) for decisions that have outcomes
    let averageTimeToOutcomeHours = null;
    const decisionsWithOutcome = decisions.filter(d => d.outcome !== null && d.outcomeRecordedAt);
    if (decisionsWithOutcome.length > 0) {
      const totalMs = decisionsWithOutcome.reduce((sum, d) => {
        const decidedTime = new Date(d.decidedAt).getTime();
        const outcomeTime = new Date(d.outcomeRecordedAt).getTime();
        return sum + (outcomeTime - decidedTime);
      }, 0);
      averageTimeToOutcomeHours = Math.round((totalMs / decisionsWithOutcome.length) / (1000 * 60 * 60) * 10) / 10;
    }

    return {
      totalDecisions: total,
      byCategory,
      withOutcome,
      withoutOutcome,
      pendingFollowUps,
      averageTimeToOutcomeHours,
    };
  }

  // ===========================================================================
  //                              PRIVATE METHODS
  // ===========================================================================

  /**
   * Load decisions from JSON file
   * @private
   */
  _load() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const content = fs.readFileSync(this.storagePath, 'utf-8');
        const data = JSON.parse(content);

        if (data.decisions && Array.isArray(data.decisions)) {
          for (const decision of data.decisions) {
            this.decisions.set(decision.id, decision);
          }
        }
      }
    } catch (error) {
      // Silently handle missing or corrupt file — start fresh
      this.decisions = new Map();
    }
  }

  /**
   * Save decisions to JSON file
   * @private
   */
  _save() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        schema: 'aios-jarvis-decision-record-v1',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        totalDecisions: this.decisions.size,
        decisions: [...this.decisions.values()],
      };

      fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      // Log but do not throw — persistence failure should not break in-memory operations
      if (typeof console !== 'undefined') {
        console.error(`DecisionRecordSystem: failed to save to ${this.storagePath}: ${error.message}`);
      }
    }
  }

  /**
   * Generate a unique decision ID
   * @returns {string} ID in format dec-{timestamp36}-{random6}
   * @private
   */
  _generateId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `dec-${timestamp}-${random}`;
  }

  /**
   * Apply detail cascade to fit formatted entries within TOKEN_LIMIT
   * Progressively downgrades detail levels starting from oldest entries
   *
   * @param {Array<Object>} entries - Entries with {decision, level}
   * @param {string[]} formattedEntries - Formatted strings for each entry
   * @returns {string[]} Adjusted formatted entries within token limit
   * @private
   */
  _applyDetailCascade(entries, formattedEntries) {
    const totalText = formattedEntries.join('\n');
    let totalTokens = estimateTokens(totalText);

    if (totalTokens <= TOKEN_LIMIT) {
      return formattedEntries;
    }

    // Working copy
    const result = [...formattedEntries];
    const workingEntries = entries.map((e, i) => ({ ...e, formatted: result[i] }));

    // Cascade 1: Downgrade all FULL entries older than 30 days to MINIMAL
    for (let i = 0; i < workingEntries.length; i++) {
      const ageDays = this._getAgeDays(workingEntries[i].decision.decidedAt);
      if (ageDays > 30 && workingEntries[i].level !== DetailLevel.MINIMAL) {
        workingEntries[i].level = DetailLevel.MINIMAL;
        result[i] = formatDecisionEntry(workingEntries[i].decision, DetailLevel.MINIMAL);
      }
    }

    totalTokens = estimateTokens(result.join('\n'));
    if (totalTokens <= TOKEN_LIMIT) return result;

    // Cascade 2: Downgrade SUMMARY entries (7-30 days) to MINIMAL
    for (let i = 0; i < workingEntries.length; i++) {
      const ageDays = this._getAgeDays(workingEntries[i].decision.decidedAt);
      if (ageDays >= 7 && ageDays <= 30 && workingEntries[i].level === DetailLevel.SUMMARY) {
        workingEntries[i].level = DetailLevel.MINIMAL;
        result[i] = formatDecisionEntry(workingEntries[i].decision, DetailLevel.MINIMAL);
      }
    }

    totalTokens = estimateTokens(result.join('\n'));
    if (totalTokens <= TOKEN_LIMIT) return result;

    // Cascade 3: Downgrade FULL entries (recent, < 7 days) to SUMMARY
    for (let i = 0; i < workingEntries.length; i++) {
      const ageDays = this._getAgeDays(workingEntries[i].decision.decidedAt);
      if (ageDays < 7 && workingEntries[i].level === DetailLevel.FULL) {
        workingEntries[i].level = DetailLevel.SUMMARY;
        result[i] = formatDecisionEntry(workingEntries[i].decision, DetailLevel.SUMMARY);
      }
    }

    totalTokens = estimateTokens(result.join('\n'));
    if (totalTokens <= TOKEN_LIMIT) return result;

    // Cascade 4: Downgrade remaining SUMMARY entries to MINIMAL
    for (let i = 0; i < workingEntries.length; i++) {
      if (workingEntries[i].level === DetailLevel.SUMMARY) {
        workingEntries[i].level = DetailLevel.MINIMAL;
        result[i] = formatDecisionEntry(workingEntries[i].decision, DetailLevel.MINIMAL);
      }
    }

    return result;
  }

  /**
   * Check if a decision matches a topic via keyword matching
   *
   * @param {Object} decision - Decision record
   * @param {string} topic - Topic to search for
   * @returns {boolean} True if the decision matches the topic
   * @private
   */
  _matchesTopic(decision, topic) {
    const topicLower = topic.toLowerCase();
    const keywords = topicLower
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

    // Build searchable text from decision fields
    const searchParts = [
      decision.title || '',
      decision.context || '',
      decision.rationale || '',
      decision.chosen || '',
      decision.category || '',
      decision.outcome || '',
      decision.followUp || '',
    ];

    // Include alternatives text
    if (decision.alternatives && Array.isArray(decision.alternatives)) {
      for (const alt of decision.alternatives) {
        if (typeof alt === 'string') {
          searchParts.push(alt);
        } else if (typeof alt === 'object') {
          searchParts.push(alt.option || '');
          searchParts.push(alt.pros || '');
          searchParts.push(alt.cons || '');
        }
      }
    }

    const searchText = searchParts.join(' ').toLowerCase();

    // Match if any keyword appears in the decision text
    return keywords.some(keyword => searchText.includes(keyword));
  }

  /**
   * Get age of a decision in days
   *
   * @param {string} decidedAt - ISO date string
   * @returns {number} Age in days
   * @private
   */
  _getAgeDays(decidedAt) {
    if (!decidedAt) return Infinity;
    const now = Date.now();
    const decisionTime = new Date(decidedAt).getTime();
    return (now - decisionTime) / (1000 * 60 * 60 * 24);
  }
}

// =============================================================================
//                              FACTORY FUNCTION
// =============================================================================

/**
 * Creates a new DecisionRecordSystem instance
 *
 * @param {Object} [options] - Configuration options
 * @param {string} [options.storagePath] - Path to decisions JSON file
 * @param {Object} [options.businessMemory] - Optional JarvisBusinessMemory instance
 * @returns {DecisionRecordSystem}
 */
function createDecisionRecordSystem(options = {}) {
  return new DecisionRecordSystem(options);
}

// =============================================================================
//                              EXPORTS
// =============================================================================

module.exports = {
  DecisionRecordSystem,
  createDecisionRecordSystem,
  DetailLevel,
  DETAIL_FIELDS,
  estimateTokens,
  truncateToTokens,
  getDetailLevel,
  formatDecisionEntry,
  TOKEN_LIMIT,
  HARD_CAP_PER_DECISION,
  CHARS_PER_TOKEN,
};
