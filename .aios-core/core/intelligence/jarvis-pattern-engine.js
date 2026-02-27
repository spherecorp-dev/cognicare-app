'use strict';

/**
 * PatternRecognitionEngine — Jarvis Intelligence Module
 *
 * Identifies recurring patterns in Jarvis's business operations — delegations,
 * decisions, and outcomes. Uses TF-IDF keyword scoring (adapted from the IDS
 * IncrementalDecisionEngine) to match current business contexts against
 * historical patterns and suggest actions that worked well in similar situations.
 *
 * Algorithm: TF-IDF keyword overlap (60%) + context similarity (40%)
 * Match levels: exact_match (>=90%) | strong_match (70-89%) | partial_match (50-69%) | weak_match (<50%)
 *
 * Adapted from: .aios-core/core/ids/incremental-decision-engine.js (IDS Story IDS-2)
 */

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'for', 'to', 'of', 'in', 'on',
  'and', 'or', 'but', 'not', 'with', 'that', 'this', 'it', 'be',
  'as', 'at', 'by', 'from', 'has', 'have', 'had', 'was', 'were',
  'will', 'would', 'can', 'could', 'should', 'do', 'does', 'did',
  'i', 'we', 'you', 'my', 'our', 'your', 'its', 'their',
]);

const MIN_KEYWORD_LENGTH = 3;
const MAX_KEYWORDS_PER_ENTITY = 15;
const KEYWORD_OVERLAP_WEIGHT = 0.6;
const CONTEXT_SIMILARITY_WEIGHT = 0.4;
const THRESHOLD_MINIMUM = 0.4;
const MAX_RESULTS = 20;
const CACHE_TTL_MS = 300_000; // 300 seconds
const MIN_RECURRING_COUNT = 3;

/**
 * Match level thresholds for pattern scoring.
 */
const MatchLevel = Object.freeze({
  EXACT_MATCH: 'exact_match',       // >= 90%
  STRONG_MATCH: 'strong_match',     // 70-89%
  PARTIAL_MATCH: 'partial_match',   // 50-69%
  WEAK_MATCH: 'weak_match',         // < 50%
});

class PatternRecognitionEngine {
  /**
   * @param {object} deps
   * @param {object} deps.businessMemory — JarvisBusinessMemory instance (.query(), .getRelevant(), .capture())
   * @param {object} deps.delegationStore — JarvisDelegationStore instance (.getAgentPerformance(), .getDelegationHistory(), .getActiveDelegations())
   */
  constructor({ businessMemory, delegationStore } = {}) {
    if (!businessMemory) {
      throw new Error('[Jarvis] PatternRecognitionEngine requires a businessMemory instance');
    }
    if (!delegationStore) {
      throw new Error('[Jarvis] PatternRecognitionEngine requires a delegationStore instance');
    }
    this._businessMemory = businessMemory;
    this._delegationStore = delegationStore;
    this._analysisCache = new Map();
    this._analysisCacheTimestamps = new Map();
    this._idfCache = null;
    this._idfCacheTimestamp = 0;
  }

  // ================================================================
  // Main API — recognizePatterns(currentContext)
  // ================================================================

  /**
   * Find historical patterns similar to the current business context.
   *
   * Scores every pattern in business memory against the provided context
   * using TF-IDF keyword overlap (60%) and context similarity (40%).
   *
   * @param {object} currentContext
   * @param {string} currentContext.description — Natural language description of the situation
   * @param {string} [currentContext.category] — Business category (e.g. 'delegation', 'decision')
   * @param {string[]} [currentContext.keywords] — Pre-extracted keywords (optional)
   * @param {string} [currentContext.domain] — Business domain (e.g. 'marketing', 'finance')
   * @returns {object} { patterns, topMatch, suggestion, confidence }
   */
  recognizePatterns(currentContext) {
    if (!currentContext || !currentContext.description || typeof currentContext.description !== 'string' || !currentContext.description.trim()) {
      return {
        patterns: [],
        topMatch: null,
        suggestion: null,
        confidence: 'low',
      };
    }

    const cacheKey = `recognize|${currentContext.description.trim().toLowerCase()}|${currentContext.category || ''}|${currentContext.domain || ''}`;
    const cached = this._getFromCache(cacheKey);
    if (cached) return cached;

    const allPatterns = this._businessMemory.query();
    const totalPatterns = allPatterns.length;

    // Edge case: empty memory
    if (totalPatterns === 0) {
      const result = {
        patterns: [],
        topMatch: null,
        suggestion: 'No historical patterns available. This will be recorded as a new pattern.',
        confidence: 'low',
      };
      this._setCache(cacheKey, result);
      return result;
    }

    const contextKeywords = currentContext.keywords && currentContext.keywords.length > 0
      ? currentContext.keywords.map((k) => k.toLowerCase()).slice(0, MAX_KEYWORDS_PER_ENTITY)
      : this._extractKeywords(currentContext.description);
    const contextPurpose = currentContext.description.trim().toLowerCase();

    // Filter candidates by category and domain if provided
    let candidates = allPatterns;
    if (currentContext.category) {
      candidates = candidates.filter(
        (p) => p.category && p.category.toLowerCase() === currentContext.category.toLowerCase(),
      );
    }
    if (currentContext.domain) {
      candidates = candidates.filter(
        (p) => p.domain && p.domain.toLowerCase() === currentContext.domain.toLowerCase(),
      );
    }

    // Score all candidates
    const evaluations = [];
    for (const pattern of candidates) {
      const keywordScore = this._calculateKeywordOverlap(contextKeywords, pattern);
      const contextScore = this._calculateContextSimilarity(contextPurpose, pattern);
      const relevanceScore =
        keywordScore * KEYWORD_OVERLAP_WEIGHT + contextScore * CONTEXT_SIMILARITY_WEIGHT;

      if (relevanceScore >= THRESHOLD_MINIMUM) {
        evaluations.push({
          pattern,
          keywordScore,
          contextScore,
          relevanceScore,
          matchLevel: this._classifyMatchLevel(relevanceScore),
        });
      }
    }

    // Sort by relevance descending
    evaluations.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const topEvaluations = evaluations.slice(0, MAX_RESULTS);

    // Build pattern results
    const patterns = topEvaluations.map((evaluation) => ({
      patternId: evaluation.pattern.id || evaluation.pattern.patternId || null,
      description: evaluation.pattern.description || evaluation.pattern.purpose || '',
      category: evaluation.pattern.category || null,
      domain: evaluation.pattern.domain || null,
      relevanceScore: this._round(evaluation.relevanceScore),
      keywordScore: this._round(evaluation.keywordScore),
      contextScore: this._round(evaluation.contextScore),
      matchLevel: evaluation.matchLevel,
      keywords: evaluation.pattern.keywords || [],
      metadata: evaluation.pattern.metadata || null,
    }));

    const topMatch = patterns.length > 0 ? patterns[0] : null;
    const confidence = topMatch
      ? this._matchLevelToConfidence(topMatch.matchLevel)
      : 'low';

    const suggestion = this._generateSuggestion(topMatch, evaluations.length);

    const result = {
      patterns,
      topMatch,
      suggestion,
      confidence,
    };

    this._setCache(cacheKey, result);
    return result;
  }

  // ================================================================
  // suggestAction(currentContext)
  // ================================================================

  /**
   * Suggest the best action based on historical pattern outcomes and delegation history.
   *
   * Combines pattern recognition with delegation outcome data to recommend
   * which agent should handle the task and what approach to use.
   *
   * @param {object} currentContext
   * @param {string} currentContext.description — Natural language description
   * @param {string} [currentContext.category] — Business category
   * @param {string[]} [currentContext.keywords] — Pre-extracted keywords
   * @param {string} [currentContext.domain] — Business domain
   * @returns {object} { suggestedAgent, suggestedApproach, confidence, basedOn }
   */
  suggestAction(currentContext) {
    if (!currentContext || !currentContext.description || typeof currentContext.description !== 'string' || !currentContext.description.trim()) {
      return {
        suggestedAgent: null,
        suggestedApproach: null,
        confidence: 'low',
        basedOn: [],
      };
    }

    const cacheKey = `suggest|${currentContext.description.trim().toLowerCase()}|${currentContext.category || ''}|${currentContext.domain || ''}`;
    const cached = this._getFromCache(cacheKey);
    if (cached) return cached;

    // Step 1: find similar patterns
    const recognition = this.recognizePatterns(currentContext);

    if (recognition.patterns.length === 0) {
      const result = {
        suggestedAgent: null,
        suggestedApproach: null,
        confidence: 'low',
        basedOn: [],
      };
      this._setCache(cacheKey, result);
      return result;
    }

    // Step 2: gather delegation history for patterns with strong or exact matches
    const relevantPatterns = recognition.patterns.filter(
      (p) => p.matchLevel === MatchLevel.EXACT_MATCH || p.matchLevel === MatchLevel.STRONG_MATCH,
    );

    // If no strong/exact matches, fall back to partial
    const patternsToAnalyze = relevantPatterns.length > 0
      ? relevantPatterns
      : recognition.patterns.filter((p) => p.matchLevel === MatchLevel.PARTIAL_MATCH);

    if (patternsToAnalyze.length === 0) {
      const result = {
        suggestedAgent: null,
        suggestedApproach: null,
        confidence: 'low',
        basedOn: recognition.patterns.slice(0, 3).map((p) => p.patternId).filter(Boolean),
      };
      this._setCache(cacheKey, result);
      return result;
    }

    // Step 3: check delegation history for outcome data
    const delegationHistory = this._delegationStore.getDelegationHistory();
    const agentSuccessCounts = new Map();
    const agentTotalCounts = new Map();
    const approachCounts = new Map();
    const basedOnIds = [];

    for (const pattern of patternsToAnalyze) {
      if (pattern.patternId) {
        basedOnIds.push(pattern.patternId);
      }

      // Match delegation history entries to this pattern
      for (const delegation of delegationHistory) {
        const delegationDesc = delegation.description || delegation.task || '';
        const delegationKeywords = delegation.keywords || this._extractKeywords(delegationDesc);

        // Check if this delegation relates to the pattern
        const patternKeywords = pattern.keywords || [];
        const overlap = this._computeSimpleOverlap(delegationKeywords, patternKeywords);

        if (overlap >= 0.3) {
          const agent = delegation.agent || delegation.assignedTo || null;
          if (agent) {
            agentTotalCounts.set(agent, (agentTotalCounts.get(agent) || 0) + 1);
            if (delegation.outcome === 'success' || delegation.status === 'completed') {
              agentSuccessCounts.set(agent, (agentSuccessCounts.get(agent) || 0) + 1);
            }
          }

          const approach = delegation.approach || delegation.method || null;
          if (approach) {
            const wasSuccess = delegation.outcome === 'success' || delegation.status === 'completed';
            const key = approach;
            const current = approachCounts.get(key) || { total: 0, success: 0 };
            current.total++;
            if (wasSuccess) current.success++;
            approachCounts.set(key, current);
          }
        }
      }
    }

    // Step 4: determine best agent by success rate (weighted by total count)
    let suggestedAgent = null;
    let bestAgentScore = -1;

    for (const [agent, total] of agentTotalCounts) {
      const successes = agentSuccessCounts.get(agent) || 0;
      const successRate = total > 0 ? successes / total : 0;
      // Weight: success rate * log(total + 1) to prefer agents with more experience
      const score = successRate * Math.log(total + 1);
      if (score > bestAgentScore) {
        bestAgentScore = score;
        suggestedAgent = agent;
      }
    }

    // Step 5: determine best approach by success rate
    let suggestedApproach = null;
    let bestApproachRate = -1;

    for (const [approach, counts] of approachCounts) {
      const rate = counts.total > 0 ? counts.success / counts.total : 0;
      if (rate > bestApproachRate || (rate === bestApproachRate && counts.total > 0)) {
        bestApproachRate = rate;
        suggestedApproach = approach;
      }
    }

    // Step 6: compute confidence from pattern match strength and delegation data volume
    const topPatternConfidence = this._matchLevelToConfidence(patternsToAnalyze[0].matchLevel);
    const hasDelegationData = agentTotalCounts.size > 0;
    let confidence;

    if (topPatternConfidence === 'high' && hasDelegationData) {
      confidence = 'high';
    } else if (topPatternConfidence === 'high' || (topPatternConfidence === 'medium' && hasDelegationData)) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    const result = {
      suggestedAgent,
      suggestedApproach,
      confidence,
      basedOn: basedOnIds.filter(Boolean),
    };

    this._setCache(cacheKey, result);
    return result;
  }

  // ================================================================
  // detectRecurringPatterns(options)
  // ================================================================

  /**
   * Detect patterns that recur frequently across business operations.
   *
   * Groups historical patterns by category, keywords, and agent, then
   * returns those appearing 3+ times (configurable) with frequency data.
   *
   * @param {object} [options={}]
   * @param {number} [options.minOccurrences=3] — Minimum times a pattern must appear
   * @param {string} [options.groupBy='keywords'] — Grouping strategy: 'keywords', 'category', 'agent'
   * @param {string} [options.domain] — Filter by domain before grouping
   * @returns {object[]} Array of { groupKey, occurrences, patterns, frequency, firstSeen, lastSeen }
   */
  detectRecurringPatterns(options = {}) {
    const minOccurrences = options.minOccurrences || MIN_RECURRING_COUNT;
    const groupBy = options.groupBy || 'keywords';
    const domainFilter = options.domain || null;

    const cacheKey = `recurring|${minOccurrences}|${groupBy}|${domainFilter || ''}`;
    const cached = this._getFromCache(cacheKey);
    if (cached) return cached;

    let allPatterns = this._businessMemory.query();

    // Filter by domain if specified
    if (domainFilter) {
      allPatterns = allPatterns.filter(
        (p) => p.domain && p.domain.toLowerCase() === domainFilter.toLowerCase(),
      );
    }

    // Group patterns
    const groups = new Map();

    for (const pattern of allPatterns) {
      const key = this._computeGroupKey(pattern, groupBy);
      if (!key) continue;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(pattern);
    }

    // Filter by minimum occurrences and build results
    const results = [];

    for (const [groupKey, patterns] of groups) {
      if (patterns.length < minOccurrences) continue;

      // Compute date range
      const timestamps = patterns
        .map((p) => p.timestamp || p.createdAt || p.date || null)
        .filter(Boolean)
        .map((ts) => new Date(ts).getTime())
        .filter((ts) => !isNaN(ts))
        .sort((a, b) => a - b);

      const firstSeen = timestamps.length > 0 ? new Date(timestamps[0]).toISOString() : null;
      const lastSeen = timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1]).toISOString() : null;

      // Calculate frequency (occurrences per day if date range available)
      let frequency = null;
      if (timestamps.length >= 2) {
        const spanDays = (timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60 * 60 * 24);
        frequency = spanDays > 0 ? this._round(patterns.length / spanDays) : null;
      }

      results.push({
        groupKey,
        occurrences: patterns.length,
        patterns: patterns.map((p) => ({
          id: p.id || p.patternId || null,
          description: p.description || p.purpose || '',
          category: p.category || null,
          domain: p.domain || null,
        })),
        frequency,
        firstSeen,
        lastSeen,
      });
    }

    // Sort by occurrences descending
    results.sort((a, b) => b.occurrences - a.occurrences);

    this._setCache(cacheKey, results);
    return results;
  }

  // ================================================================
  // learnFromOutcome(delegationId, outcome)
  // ================================================================

  /**
   * Capture an outcome pattern for future reference.
   *
   * Stores the delegation outcome as an insight in business memory so
   * future pattern recognition can learn from it.
   *
   * @param {string} delegationId — ID of the delegation that completed
   * @param {object} outcome
   * @param {string} outcome.status — 'success' | 'failure' | 'partial'
   * @param {string} [outcome.description] — What happened
   * @param {string} [outcome.agent] — Agent that handled it
   * @param {string} [outcome.approach] — Approach/method used
   * @param {string} [outcome.domain] — Business domain
   * @param {string[]} [outcome.keywords] — Keywords for matching
   * @param {object} [outcome.metadata] — Additional metadata
   * @returns {object} { captured: true, patternId }
   */
  learnFromOutcome(delegationId, outcome) {
    if (!delegationId || typeof delegationId !== 'string') {
      throw new Error('[Jarvis] learnFromOutcome requires a delegationId string');
    }
    if (!outcome || typeof outcome !== 'object') {
      throw new Error('[Jarvis] learnFromOutcome requires an outcome object');
    }
    if (!outcome.status) {
      throw new Error('[Jarvis] outcome must have a status field');
    }

    const description = outcome.description
      || `Delegation ${delegationId} completed with status: ${outcome.status}`;

    const keywords = outcome.keywords && outcome.keywords.length > 0
      ? outcome.keywords
      : this._extractKeywords(description);

    const patternData = {
      id: `insight-${delegationId}-${Date.now()}`,
      category: 'insight',
      description,
      keywords,
      domain: outcome.domain || null,
      purpose: description,
      metadata: {
        delegationId,
        status: outcome.status,
        agent: outcome.agent || null,
        approach: outcome.approach || null,
        ...(outcome.metadata || {}),
      },
      timestamp: new Date().toISOString(),
    };

    this._businessMemory.capture(patternData);

    // Invalidate caches since new data was added
    this.clearCache();

    return {
      captured: true,
      patternId: patternData.id,
    };
  }

  // ================================================================
  // getPatternInsights()
  // ================================================================

  /**
   * Return a summary of recognized patterns grouped by category, top agents,
   * and common domains.
   *
   * @returns {object} { byCategory, topAgents, commonDomains, totalPatterns, totalInsights }
   */
  getPatternInsights() {
    const cacheKey = 'insights|all';
    const cached = this._getFromCache(cacheKey);
    if (cached) return cached;

    const allPatterns = this._businessMemory.query();
    const delegationHistory = this._delegationStore.getDelegationHistory();

    // Group by category
    const byCategory = {};
    let totalInsights = 0;

    for (const pattern of allPatterns) {
      const cat = pattern.category || 'uncategorized';
      if (!byCategory[cat]) {
        byCategory[cat] = { count: 0, keywords: new Set() };
      }
      byCategory[cat].count++;

      if (cat === 'insight') {
        totalInsights++;
      }

      const kws = pattern.keywords || [];
      for (const kw of kws) {
        byCategory[cat].keywords.add(kw.toLowerCase());
      }
    }

    // Convert keyword sets to arrays with counts
    const byCategorySerialized = {};
    for (const [cat, data] of Object.entries(byCategory)) {
      byCategorySerialized[cat] = {
        count: data.count,
        topKeywords: [...data.keywords].slice(0, 10),
      };
    }

    // Gather agent performance from delegation history
    const agentStats = new Map();

    for (const delegation of delegationHistory) {
      const agent = delegation.agent || delegation.assignedTo || null;
      if (!agent) continue;

      if (!agentStats.has(agent)) {
        agentStats.set(agent, { total: 0, successes: 0 });
      }
      const stats = agentStats.get(agent);
      stats.total++;
      if (delegation.outcome === 'success' || delegation.status === 'completed') {
        stats.successes++;
      }
    }

    // Build top agents ranked by total delegations, include success rate
    const topAgents = [...agentStats.entries()]
      .map(([agent, stats]) => ({
        agent,
        totalDelegations: stats.total,
        successRate: stats.total > 0 ? this._round(stats.successes / stats.total) : 0,
      }))
      .sort((a, b) => b.totalDelegations - a.totalDelegations)
      .slice(0, 10);

    // Gather common domains
    const domainCounts = new Map();

    for (const pattern of allPatterns) {
      const domain = pattern.domain;
      if (domain) {
        const lower = domain.toLowerCase();
        domainCounts.set(lower, (domainCounts.get(lower) || 0) + 1);
      }
    }

    const commonDomains = [...domainCounts.entries()]
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const result = {
      byCategory: byCategorySerialized,
      topAgents,
      commonDomains,
      totalPatterns: allPatterns.length,
      totalInsights,
    };

    this._setCache(cacheKey, result);
    return result;
  }

  // ================================================================
  // getTopPatterns(n)
  // ================================================================

  /**
   * Return the N most frequently occurring patterns in business memory.
   *
   * Groups patterns by their normalized keyword signature and returns
   * those with the highest occurrence count.
   *
   * @param {number} [n=5] — Number of top patterns to return
   * @returns {object[]} Array of { groupKey, occurrences, representativeDescription, keywords }
   */
  getTopPatterns(n = 5) {
    const cacheKey = `topPatterns|${n}`;
    const cached = this._getFromCache(cacheKey);
    if (cached) return cached;

    const allPatterns = this._businessMemory.query();

    // Group by keyword signature
    const groups = new Map();

    for (const pattern of allPatterns) {
      const keywords = (pattern.keywords || []).map((k) => k.toLowerCase()).sort();
      const key = keywords.length > 0 ? keywords.join('|') : (pattern.category || 'unknown');

      if (!groups.has(key)) {
        groups.set(key, {
          patterns: [],
          keywords,
        });
      }
      groups.get(key).patterns.push(pattern);
    }

    // Sort groups by count, take top N
    const sorted = [...groups.entries()]
      .map(([groupKey, data]) => ({
        groupKey,
        occurrences: data.patterns.length,
        representativeDescription: data.patterns[0].description || data.patterns[0].purpose || '',
        keywords: data.keywords,
      }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, n);

    this._setCache(cacheKey, sorted);
    return sorted;
  }

  // ================================================================
  // Semantic Matching (adapted from IDS)
  // ================================================================

  /**
   * Extract keywords from text using stop-word filtered tokenization.
   * @param {string} text
   * @returns {string[]}
   */
  _extractKeywords(text) {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= MIN_KEYWORD_LENGTH && !STOP_WORDS.has(word))
      .slice(0, MAX_KEYWORDS_PER_ENTITY);
  }

  /**
   * Calculate TF-IDF weighted keyword overlap between context keywords and a pattern.
   * @param {string[]} contextKeywords — Keywords from the current context
   * @param {object} pattern — Pattern object with .keywords array
   * @returns {number} Score 0-1
   */
  _calculateKeywordOverlap(contextKeywords, pattern) {
    if (!contextKeywords.length) return 0;
    const patternKeywords = (pattern.keywords || []).map((k) => k.toLowerCase());
    if (!patternKeywords.length) return 0;

    const idfScores = this._getIdfScores();
    let overlapScore = 0;
    let maxPossibleScore = 0;

    for (const contextKw of contextKeywords) {
      const idf = idfScores.get(contextKw) || 1;
      maxPossibleScore += idf;

      // Exact match
      if (patternKeywords.includes(contextKw)) {
        overlapScore += idf;
        continue;
      }

      // Partial/prefix match (fuzzy fallback)
      const partialMatch = patternKeywords.some(
        (pkw) => pkw.startsWith(contextKw) || contextKw.startsWith(pkw),
      );
      if (partialMatch) {
        overlapScore += idf * 0.5;
      }
    }

    return maxPossibleScore > 0 ? overlapScore / maxPossibleScore : 0;
  }

  /**
   * Build IDF (Inverse Document Frequency) scores for all keywords in business memory.
   * Cached with TTL for performance.
   * @returns {Map<string, number>}
   */
  _getIdfScores() {
    const now = Date.now();
    if (this._idfCache && now - this._idfCacheTimestamp < CACHE_TTL_MS) {
      return this._idfCache;
    }

    const allPatterns = this._businessMemory.query();
    const totalDocs = allPatterns.length || 1;
    const keywordDocCount = new Map();

    for (const pattern of allPatterns) {
      const seen = new Set();
      for (const kw of pattern.keywords || []) {
        const lower = kw.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          keywordDocCount.set(lower, (keywordDocCount.get(lower) || 0) + 1);
        }
      }
    }

    const idfScores = new Map();
    for (const [keyword, count] of keywordDocCount) {
      idfScores.set(keyword, Math.log(totalDocs / count) + 1);
    }

    this._idfCache = idfScores;
    this._idfCacheTimestamp = now;
    return idfScores;
  }

  /**
   * Calculate context similarity using token overlap (Jaccard-like).
   * Compares the current context description against a pattern's purpose/description.
   * @param {string} contextPurpose — Lowercased context description
   * @param {object} pattern — Pattern object with .purpose or .description
   * @returns {number} Score 0-1
   */
  _calculateContextSimilarity(contextPurpose, pattern) {
    const patternPurpose = pattern.purpose || pattern.description || '';
    if (!contextPurpose || !patternPurpose) return 0;

    const contextTokens = this._extractKeywords(contextPurpose);
    const purposeTokens = this._extractKeywords(patternPurpose);
    if (!contextTokens.length || !purposeTokens.length) return 0;

    const contextSet = new Set(contextTokens);
    const purposeSet = new Set(purposeTokens);

    let matches = 0;
    for (const token of contextSet) {
      if (purposeSet.has(token)) {
        matches++;
        continue;
      }
      // Fuzzy: prefix match
      for (const pToken of purposeSet) {
        if (pToken.startsWith(token) || token.startsWith(pToken)) {
          matches += 0.5;
          break;
        }
      }
    }

    const denominator = Math.min(contextSet.size, purposeSet.size);
    return denominator > 0 ? Math.min(matches / denominator, 1) : 0;
  }

  // ================================================================
  // Match Level Classification
  // ================================================================

  /**
   * Classify a relevance score into a match level.
   * @param {number} relevanceScore — Score between 0 and 1
   * @returns {string} One of MatchLevel values
   */
  _classifyMatchLevel(relevanceScore) {
    if (relevanceScore >= 0.9) return MatchLevel.EXACT_MATCH;
    if (relevanceScore >= 0.7) return MatchLevel.STRONG_MATCH;
    if (relevanceScore >= 0.5) return MatchLevel.PARTIAL_MATCH;
    return MatchLevel.WEAK_MATCH;
  }

  /**
   * Convert a match level to a confidence string.
   * @param {string} matchLevel
   * @returns {string} 'high' | 'medium' | 'low'
   */
  _matchLevelToConfidence(matchLevel) {
    if (matchLevel === MatchLevel.EXACT_MATCH) return 'high';
    if (matchLevel === MatchLevel.STRONG_MATCH) return 'high';
    if (matchLevel === MatchLevel.PARTIAL_MATCH) return 'medium';
    return 'low';
  }

  // ================================================================
  // Suggestion Generation
  // ================================================================

  /**
   * Generate a human-readable suggestion based on the top match.
   * @param {object|null} topMatch — Top pattern match or null
   * @param {number} totalMatches — Total number of matches found
   * @returns {string} Suggestion text
   */
  _generateSuggestion(topMatch, totalMatches) {
    if (!topMatch) {
      return 'No matching patterns found. Consider recording this as a new pattern for future reference.';
    }

    if (topMatch.matchLevel === MatchLevel.EXACT_MATCH) {
      return `Exact match found: "${topMatch.description}". This pattern has been seen before with high confidence. Recommend following the same approach.`;
    }

    if (topMatch.matchLevel === MatchLevel.STRONG_MATCH) {
      return `Strong match (${this._pct(topMatch.relevanceScore)}) with pattern: "${topMatch.description}". Consider adapting the previous approach to fit the current context.`;
    }

    if (topMatch.matchLevel === MatchLevel.PARTIAL_MATCH) {
      return `Partial match (${this._pct(topMatch.relevanceScore)}) found across ${totalMatches} pattern(s). Review matches for relevant insights but expect to tailor the approach.`;
    }

    return `Weak match (${this._pct(topMatch.relevanceScore)}) found. Historical patterns provide limited guidance; a fresh approach may be needed.`;
  }

  // ================================================================
  // Grouping Helpers
  // ================================================================

  /**
   * Compute a group key for a pattern based on the chosen grouping strategy.
   * @param {object} pattern
   * @param {string} groupBy — 'keywords' | 'category' | 'agent'
   * @returns {string|null}
   */
  _computeGroupKey(pattern, groupBy) {
    if (groupBy === 'category') {
      return pattern.category || 'uncategorized';
    }

    if (groupBy === 'agent') {
      const agent = (pattern.metadata && pattern.metadata.agent) || pattern.agent || null;
      return agent || 'unassigned';
    }

    // Default: keywords
    const keywords = (pattern.keywords || []).map((k) => k.toLowerCase()).sort();
    return keywords.length > 0 ? keywords.join('|') : null;
  }

  /**
   * Compute a simple keyword overlap ratio between two keyword arrays.
   * Used for lightweight matching in suggestAction delegation comparison.
   * @param {string[]} keywordsA
   * @param {string[]} keywordsB
   * @returns {number} Overlap ratio 0-1
   */
  _computeSimpleOverlap(keywordsA, keywordsB) {
    if (!keywordsA || !keywordsB || keywordsA.length === 0 || keywordsB.length === 0) return 0;

    const setA = new Set(keywordsA.map((k) => k.toLowerCase()));
    const setB = new Set(keywordsB.map((k) => k.toLowerCase()));

    let matches = 0;
    for (const kw of setA) {
      if (setB.has(kw)) {
        matches++;
      }
    }

    const denominator = Math.min(setA.size, setB.size);
    return denominator > 0 ? matches / denominator : 0;
  }

  // ================================================================
  // Performance — Caching
  // ================================================================

  /**
   * Clear all internal caches.
   */
  clearCache() {
    this._analysisCache.clear();
    this._analysisCacheTimestamps.clear();
    this._idfCache = null;
    this._idfCacheTimestamp = 0;
  }

  _getFromCache(key) {
    const timestamp = this._analysisCacheTimestamps.get(key);
    if (timestamp && Date.now() - timestamp < CACHE_TTL_MS) {
      return this._analysisCache.get(key);
    }
    this._analysisCache.delete(key);
    this._analysisCacheTimestamps.delete(key);
    return null;
  }

  _setCache(key, value) {
    this._analysisCache.set(key, value);
    this._analysisCacheTimestamps.set(key, Date.now());
  }

  // ================================================================
  // Utilities
  // ================================================================

  _round(n) {
    return Math.round(n * 1000) / 1000;
  }

  _pct(n) {
    return `${(n * 100).toFixed(1)}%`;
  }
}

module.exports = {
  PatternRecognitionEngine,
  STOP_WORDS,
  MatchLevel,
  KEYWORD_OVERLAP_WEIGHT,
  CONTEXT_SIMILARITY_WEIGHT,
  CACHE_TTL_MS,
};
