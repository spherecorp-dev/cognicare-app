/**
 * Jarvis Workflow: Morning Brief
 *
 * Sprint 4 C.5: High-priority workflow
 *
 * Generates executive briefings combining:
 * - Active delegations and their health
 * - Recent squad run results
 * - Attention items requiring CEO action
 * - Pattern-based suggestions
 *
 * @module core/intelligence/jarvis-workflows/brief
 */

const { ProactiveIntelligence } = require('../jarvis-proactive');
const { JarvisDelegationStore } = require('../../orchestration/jarvis-delegation-store');
const path = require('path');
const fs = require('fs').promises;

class BriefWorkflow {
  /**
   * @param {Object} options
   * @param {string} [options.projectRoot] - Project root path
   * @param {ProactiveIntelligence} [options.proactiveIntelligence] - Existing instance
   * @param {JarvisDelegationStore} [options.delegationStore] - Existing store
   */
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();

    this.delegationStore = options.delegationStore || new JarvisDelegationStore(
      path.join(this.projectRoot, '.aios', 'jarvis', 'delegations'),
    );

    this.proactive = options.proactiveIntelligence || new ProactiveIntelligence({
      delegationStore: this.delegationStore,
    });
  }

  /**
   * Generate a morning brief
   *
   * @param {Object} [options]
   * @param {string} [options.timeRange='24h'] - Time range
   * @returns {Promise<Object>} Structured brief
   */
  async execute(options = {}) {
    const timeRange = options.timeRange || '24h';

    // Get proactive brief (delegations, decisions, patterns)
    const proactiveBrief = this.proactive.morningBrief({ timeRange });

    // Get recent squad runs
    const recentRuns = await this._getRecentRuns();

    // Get attention items
    const attentionItems = this.proactive.getAttentionItems();

    // Get next action suggestion
    const suggestion = this.proactive.suggestNextAction();

    return {
      success: true,
      generatedAt: new Date().toISOString(),
      timeRange,

      // Executive summary
      summary: {
        activeDelegations: proactiveBrief.sections.activeDelegations?.count || 0,
        pendingDecisions: proactiveBrief.sections.pendingDecisions?.count || 0,
        recentRuns: recentRuns.length,
        attentionItems: attentionItems.length,
        anomalies: proactiveBrief.sections.anomalies?.count || 0,
      },

      // Detailed sections
      sections: {
        delegations: proactiveBrief.sections.activeDelegations || { count: 0, items: [] },
        decisions: proactiveBrief.sections.pendingDecisions || { count: 0, items: [] },
        runs: {
          count: recentRuns.length,
          items: recentRuns.slice(0, 5),
        },
        patterns: proactiveBrief.sections.detectedPatterns || { count: 0, items: [] },
        anomalies: proactiveBrief.sections.anomalies || { count: 0, items: [] },
      },

      // Actionable items
      attentionItems: attentionItems.slice(0, 10),

      // Suggestions
      suggestions: proactiveBrief.sections.suggestions || [],
      nextAction: suggestion.topSuggestion || null,
    };
  }

  /**
   * Get recent squad runs from state directory
   * @private
   */
  async _getRecentRuns() {
    const stateDir = path.join(this.projectRoot, '.aios-core', '.state');

    try {
      const files = await fs.readdir(stateDir);
      const stateFiles = files.filter(f => f.endsWith('.state.yaml')).slice(0, 10);

      const runs = [];
      for (const filename of stateFiles) {
        try {
          const content = await fs.readFile(path.join(stateDir, filename), 'utf8');
          const runId = this._extractField(content, 'runId') || filename.replace('.state.yaml', '');
          const squadId = this._extractField(content, 'squadId') || 'unknown';
          const status = this._extractField(content, 'status') || 'unknown';
          const startedAt = this._extractField(content, 'startedAt');

          runs.push({ runId, squadId, status, startedAt });
        } catch {
          // Skip
        }
      }

      return runs.sort((a, b) => {
        const dateA = new Date(a.startedAt || 0).getTime();
        const dateB = new Date(b.startedAt || 0).getTime();
        return dateB - dateA;
      });
    } catch {
      return [];
    }
  }

  /**
   * Extract a YAML field value
   * @private
   */
  _extractField(content, field) {
    const regex = new RegExp(`^${field}:\\s*['"]?(.+?)['"]?\\s*$`, 'm');
    const match = content.match(regex);
    return match ? match[1].trim() : null;
  }
}

module.exports = { BriefWorkflow };
