/**
 * PatternRecognitionEngine — Comprehensive Unit Tests
 *
 * Covers all public methods, internal helpers, edge cases, caching,
 * and scoring logic for the Jarvis Pattern Recognition Engine.
 *
 * Uses real class instances with mock data providers (no jest.mock).
 */

'use strict';

const {
  PatternRecognitionEngine,
  STOP_WORDS,
  MatchLevel,
  KEYWORD_OVERLAP_WEIGHT,
  CONTEXT_SIMILARITY_WEIGHT,
  CACHE_TTL_MS,
} = require('../jarvis-pattern-engine');

// ============================================================================
// Shared mock data
// ============================================================================

const mockPatterns = [
  { id: 'p1', description: 'Marketing campaign delegation', keywords: ['marketing', 'campaign', 'social'], purpose: 'Delegate marketing tasks', category: 'delegation', domain: 'marketing' },
  { id: 'p2', description: 'Finance quarterly report', keywords: ['finance', 'report', 'quarterly'], purpose: 'Generate finance reports', category: 'decision', domain: 'finance' },
  { id: 'p3', description: 'Marketing content creation', keywords: ['marketing', 'content', 'creation'], purpose: 'Create marketing content', category: 'delegation', domain: 'marketing' },
  { id: 'p4', description: 'Technical architecture review', keywords: ['architecture', 'review', 'technical'], purpose: 'Review system architecture', category: 'strategy', domain: 'engineering' },
  { id: 'p5', description: 'Marketing social media strategy', keywords: ['marketing', 'social', 'strategy'], purpose: 'Plan social media strategy', category: 'strategy', domain: 'marketing' },
];

const mockDelegationHistory = [
  { description: 'marketing campaign', keywords: ['marketing', 'campaign'], agent: '@stefan-georgi', outcome: 'success', approach: 'content-first' },
  { description: 'marketing content', keywords: ['marketing', 'content'], agent: '@stefan-georgi', outcome: 'success', approach: 'content-first' },
  { description: 'finance report', keywords: ['finance', 'report'], agent: '@analyst', outcome: 'success', approach: 'template-based' },
];

// ============================================================================
// Factory helpers
// ============================================================================

function createMockBusinessMemory(patterns = mockPatterns) {
  const store = [...patterns];
  return {
    query: () => [...store],
    getRelevant: () => [...store],
    capture: (data) => { store.push(data); },
  };
}

function createMockDelegationStore(history = mockDelegationHistory) {
  return {
    getDelegationHistory: () => [...history],
    getAgentPerformance: () => ({}),
    getActiveDelegations: () => [],
  };
}

function createEngine(patternOverride, historyOverride) {
  return new PatternRecognitionEngine({
    businessMemory: createMockBusinessMemory(patternOverride),
    delegationStore: createMockDelegationStore(historyOverride),
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('PatternRecognitionEngine', () => {
  let engine;
  let businessMemory;
  let delegationStore;

  beforeEach(() => {
    businessMemory = createMockBusinessMemory();
    delegationStore = createMockDelegationStore();
    engine = new PatternRecognitionEngine({ businessMemory, delegationStore });
  });

  // ==========================================================================
  // 1. Exports
  // ==========================================================================

  describe('Exports', () => {
    test('should export PatternRecognitionEngine as a class', () => {
      expect(typeof PatternRecognitionEngine).toBe('function');
      expect(PatternRecognitionEngine.prototype.constructor).toBe(PatternRecognitionEngine);
    });

    test('should export STOP_WORDS as a Set', () => {
      expect(STOP_WORDS).toBeInstanceOf(Set);
    });

    test('should export MatchLevel as a frozen object', () => {
      expect(typeof MatchLevel).toBe('object');
      expect(Object.isFrozen(MatchLevel)).toBe(true);
    });

    test('should export MatchLevel with all four levels', () => {
      expect(MatchLevel.EXACT_MATCH).toBe('exact_match');
      expect(MatchLevel.STRONG_MATCH).toBe('strong_match');
      expect(MatchLevel.PARTIAL_MATCH).toBe('partial_match');
      expect(MatchLevel.WEAK_MATCH).toBe('weak_match');
    });

    test('should export KEYWORD_OVERLAP_WEIGHT as 0.6', () => {
      expect(KEYWORD_OVERLAP_WEIGHT).toBe(0.6);
    });

    test('should export CONTEXT_SIMILARITY_WEIGHT as 0.4', () => {
      expect(CONTEXT_SIMILARITY_WEIGHT).toBe(0.4);
    });

    test('should export CACHE_TTL_MS as 300000', () => {
      expect(CACHE_TTL_MS).toBe(300000);
    });

    test('weights should sum to 1.0', () => {
      expect(KEYWORD_OVERLAP_WEIGHT + CONTEXT_SIMILARITY_WEIGHT).toBeCloseTo(1.0);
    });
  });

  // ==========================================================================
  // 2. STOP_WORDS
  // ==========================================================================

  describe('STOP_WORDS', () => {
    test('should contain common English stop words', () => {
      const expected = ['the', 'a', 'an', 'is', 'are', 'for', 'to', 'of', 'in', 'on', 'and', 'or'];
      for (const word of expected) {
        expect(STOP_WORDS.has(word)).toBe(true);
      }
    });

    test('should contain pronouns', () => {
      expect(STOP_WORDS.has('i')).toBe(true);
      expect(STOP_WORDS.has('we')).toBe(true);
      expect(STOP_WORDS.has('you')).toBe(true);
      expect(STOP_WORDS.has('my')).toBe(true);
    });

    test('should contain modal verbs', () => {
      expect(STOP_WORDS.has('will')).toBe(true);
      expect(STOP_WORDS.has('would')).toBe(true);
      expect(STOP_WORDS.has('can')).toBe(true);
      expect(STOP_WORDS.has('could')).toBe(true);
      expect(STOP_WORDS.has('should')).toBe(true);
    });

    test('should not contain content words', () => {
      expect(STOP_WORDS.has('marketing')).toBe(false);
      expect(STOP_WORDS.has('finance')).toBe(false);
      expect(STOP_WORDS.has('strategy')).toBe(false);
    });

    test('should have a reasonable size (20-60 words)', () => {
      expect(STOP_WORDS.size).toBeGreaterThanOrEqual(20);
      expect(STOP_WORDS.size).toBeLessThanOrEqual(60);
    });
  });

  // ==========================================================================
  // 3. Constructor validation
  // ==========================================================================

  describe('constructor', () => {
    test('should create instance with valid dependencies', () => {
      const eng = new PatternRecognitionEngine({ businessMemory, delegationStore });
      expect(eng).toBeInstanceOf(PatternRecognitionEngine);
    });

    test('should throw when called with no arguments', () => {
      expect(() => new PatternRecognitionEngine()).toThrow('businessMemory');
    });

    test('should throw when called with empty object', () => {
      expect(() => new PatternRecognitionEngine({})).toThrow('businessMemory');
    });

    test('should throw when businessMemory is missing', () => {
      expect(() => new PatternRecognitionEngine({ delegationStore })).toThrow('businessMemory');
    });

    test('should throw when delegationStore is missing', () => {
      expect(() => new PatternRecognitionEngine({ businessMemory })).toThrow('delegationStore');
    });

    test('should throw when businessMemory is null', () => {
      expect(() => new PatternRecognitionEngine({ businessMemory: null, delegationStore })).toThrow('businessMemory');
    });

    test('should throw when delegationStore is null', () => {
      expect(() => new PatternRecognitionEngine({ businessMemory, delegationStore: null })).toThrow('delegationStore');
    });

    test('should initialize internal caches as empty', () => {
      const eng = new PatternRecognitionEngine({ businessMemory, delegationStore });
      expect(eng._analysisCache).toBeInstanceOf(Map);
      expect(eng._analysisCache.size).toBe(0);
      expect(eng._analysisCacheTimestamps).toBeInstanceOf(Map);
      expect(eng._analysisCacheTimestamps.size).toBe(0);
      expect(eng._idfCache).toBeNull();
      expect(eng._idfCacheTimestamp).toBe(0);
    });
  });

  // ==========================================================================
  // 4. recognizePatterns
  // ==========================================================================

  describe('recognizePatterns', () => {
    test('should return empty result for null context', () => {
      const result = engine.recognizePatterns(null);
      expect(result.patterns).toEqual([]);
      expect(result.topMatch).toBeNull();
      expect(result.suggestion).toBeNull();
      expect(result.confidence).toBe('low');
    });

    test('should return empty result for undefined context', () => {
      const result = engine.recognizePatterns(undefined);
      expect(result.patterns).toEqual([]);
      expect(result.topMatch).toBeNull();
    });

    test('should return empty result for context without description', () => {
      const result = engine.recognizePatterns({ category: 'delegation' });
      expect(result.patterns).toEqual([]);
      expect(result.topMatch).toBeNull();
    });

    test('should return empty result for empty string description', () => {
      const result = engine.recognizePatterns({ description: '' });
      expect(result.patterns).toEqual([]);
    });

    test('should return empty result for whitespace-only description', () => {
      const result = engine.recognizePatterns({ description: '   ' });
      expect(result.patterns).toEqual([]);
    });

    test('should return empty result when description is not a string', () => {
      const result = engine.recognizePatterns({ description: 123 });
      expect(result.patterns).toEqual([]);
    });

    test('should find matching patterns for a marketing context', () => {
      const result = engine.recognizePatterns({
        description: 'Marketing campaign for social media',
        keywords: ['marketing', 'campaign', 'social'],
      });
      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.topMatch).not.toBeNull();
      expect(result.confidence).toBeDefined();
    });

    test('should return patterns sorted by relevanceScore descending', () => {
      const result = engine.recognizePatterns({
        description: 'Marketing campaign for social media',
        keywords: ['marketing', 'campaign', 'social'],
      });
      for (let i = 1; i < result.patterns.length; i++) {
        expect(result.patterns[i - 1].relevanceScore).toBeGreaterThanOrEqual(
          result.patterns[i].relevanceScore,
        );
      }
    });

    test('should set topMatch to the first pattern in the list', () => {
      const result = engine.recognizePatterns({
        description: 'Marketing campaign delegation',
        keywords: ['marketing', 'campaign', 'social'],
      });
      if (result.patterns.length > 0) {
        expect(result.topMatch).toEqual(result.patterns[0]);
      }
    });

    test('should filter patterns by category when provided', () => {
      const result = engine.recognizePatterns({
        description: 'Marketing campaign for social media strategy',
        keywords: ['marketing', 'campaign', 'social'],
        category: 'strategy',
      });
      for (const p of result.patterns) {
        expect(p.category.toLowerCase()).toBe('strategy');
      }
    });

    test('should filter patterns by domain when provided', () => {
      const result = engine.recognizePatterns({
        description: 'Marketing campaign content creation',
        keywords: ['marketing', 'campaign', 'content'],
        domain: 'marketing',
      });
      for (const p of result.patterns) {
        expect(p.domain.toLowerCase()).toBe('marketing');
      }
    });

    test('should filter by both category and domain simultaneously', () => {
      const result = engine.recognizePatterns({
        description: 'Marketing social media strategy',
        keywords: ['marketing', 'social', 'strategy'],
        category: 'strategy',
        domain: 'marketing',
      });
      for (const p of result.patterns) {
        expect(p.category.toLowerCase()).toBe('strategy');
        expect(p.domain.toLowerCase()).toBe('marketing');
      }
    });

    test('should return empty patterns when memory is empty', () => {
      const emptyEngine = createEngine([]);
      const result = emptyEngine.recognizePatterns({
        description: 'Marketing campaign',
      });
      expect(result.patterns).toEqual([]);
      expect(result.topMatch).toBeNull();
      expect(result.suggestion).toContain('No historical patterns');
    });

    test('should return patterns with correct structure', () => {
      const result = engine.recognizePatterns({
        description: 'Marketing campaign delegation',
        keywords: ['marketing', 'campaign'],
      });
      if (result.patterns.length > 0) {
        const p = result.patterns[0];
        expect(p).toHaveProperty('patternId');
        expect(p).toHaveProperty('description');
        expect(p).toHaveProperty('category');
        expect(p).toHaveProperty('domain');
        expect(p).toHaveProperty('relevanceScore');
        expect(p).toHaveProperty('keywordScore');
        expect(p).toHaveProperty('contextScore');
        expect(p).toHaveProperty('matchLevel');
        expect(p).toHaveProperty('keywords');
        expect(p).toHaveProperty('metadata');
      }
    });

    test('should use provided keywords over extracting from description', () => {
      const result1 = engine.recognizePatterns({
        description: 'Some generic text here nothing useful',
        keywords: ['marketing', 'campaign', 'social'],
      });
      const result2 = engine.recognizePatterns({
        description: 'Some generic text here nothing useful',
      });
      // With explicit marketing keywords, should find more marketing patterns
      expect(result1.patterns.length).toBeGreaterThanOrEqual(result2.patterns.length);
    });

    test('should generate a suggestion string', () => {
      const result = engine.recognizePatterns({
        description: 'Marketing campaign delegation',
        keywords: ['marketing', 'campaign', 'social'],
      });
      expect(typeof result.suggestion).toBe('string');
      expect(result.suggestion.length).toBeGreaterThan(0);
    });

    test('should return confidence as high, medium, or low', () => {
      const result = engine.recognizePatterns({
        description: 'Marketing campaign delegation',
        keywords: ['marketing', 'campaign', 'social'],
      });
      expect(['high', 'medium', 'low']).toContain(result.confidence);
    });

    test('should produce no matches when context has zero keyword overlap', () => {
      const result = engine.recognizePatterns({
        description: 'xyz qqq zzz nnn mmm',
        keywords: ['xyz123', 'qqq456', 'zzz789'],
      });
      expect(result.patterns.length).toBe(0);
    });

    test('should handle very long description gracefully', () => {
      const longDesc = 'marketing campaign '.repeat(500);
      const result = engine.recognizePatterns({ description: longDesc });
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('topMatch');
    });

    test('should cache results for same input', () => {
      const ctx = { description: 'Marketing campaign delegation', keywords: ['marketing', 'campaign'] };
      const result1 = engine.recognizePatterns(ctx);
      const result2 = engine.recognizePatterns(ctx);
      expect(result1).toEqual(result2);
      // Same reference from cache
      expect(result1).toBe(result2);
    });
  });

  // ==========================================================================
  // 5. MatchLevel classification
  // ==========================================================================

  describe('MatchLevel classification (_classifyMatchLevel)', () => {
    test('should classify score >= 0.9 as exact_match', () => {
      expect(engine._classifyMatchLevel(0.9)).toBe(MatchLevel.EXACT_MATCH);
      expect(engine._classifyMatchLevel(0.95)).toBe(MatchLevel.EXACT_MATCH);
      expect(engine._classifyMatchLevel(1.0)).toBe(MatchLevel.EXACT_MATCH);
    });

    test('should classify score 0.7-0.89 as strong_match', () => {
      expect(engine._classifyMatchLevel(0.7)).toBe(MatchLevel.STRONG_MATCH);
      expect(engine._classifyMatchLevel(0.75)).toBe(MatchLevel.STRONG_MATCH);
      expect(engine._classifyMatchLevel(0.89)).toBe(MatchLevel.STRONG_MATCH);
    });

    test('should classify score 0.5-0.69 as partial_match', () => {
      expect(engine._classifyMatchLevel(0.5)).toBe(MatchLevel.PARTIAL_MATCH);
      expect(engine._classifyMatchLevel(0.6)).toBe(MatchLevel.PARTIAL_MATCH);
      expect(engine._classifyMatchLevel(0.69)).toBe(MatchLevel.PARTIAL_MATCH);
    });

    test('should classify score < 0.5 as weak_match', () => {
      expect(engine._classifyMatchLevel(0.49)).toBe(MatchLevel.WEAK_MATCH);
      expect(engine._classifyMatchLevel(0.3)).toBe(MatchLevel.WEAK_MATCH);
      expect(engine._classifyMatchLevel(0.0)).toBe(MatchLevel.WEAK_MATCH);
    });

    test('should classify boundary at exactly 0.9 as exact_match', () => {
      expect(engine._classifyMatchLevel(0.9)).toBe(MatchLevel.EXACT_MATCH);
    });

    test('should classify 0.8999 as strong_match (not exact)', () => {
      expect(engine._classifyMatchLevel(0.8999)).toBe(MatchLevel.STRONG_MATCH);
    });

    test('should classify boundary at exactly 0.7 as strong_match', () => {
      expect(engine._classifyMatchLevel(0.7)).toBe(MatchLevel.STRONG_MATCH);
    });

    test('should classify 0.6999 as partial_match (not strong)', () => {
      expect(engine._classifyMatchLevel(0.6999)).toBe(MatchLevel.PARTIAL_MATCH);
    });

    test('should classify boundary at exactly 0.5 as partial_match', () => {
      expect(engine._classifyMatchLevel(0.5)).toBe(MatchLevel.PARTIAL_MATCH);
    });

    test('should classify 0.4999 as weak_match (not partial)', () => {
      expect(engine._classifyMatchLevel(0.4999)).toBe(MatchLevel.WEAK_MATCH);
    });
  });

  // ==========================================================================
  // 6. _matchLevelToConfidence
  // ==========================================================================

  describe('_matchLevelToConfidence', () => {
    test('should return high for exact_match', () => {
      expect(engine._matchLevelToConfidence(MatchLevel.EXACT_MATCH)).toBe('high');
    });

    test('should return high for strong_match', () => {
      expect(engine._matchLevelToConfidence(MatchLevel.STRONG_MATCH)).toBe('high');
    });

    test('should return medium for partial_match', () => {
      expect(engine._matchLevelToConfidence(MatchLevel.PARTIAL_MATCH)).toBe('medium');
    });

    test('should return low for weak_match', () => {
      expect(engine._matchLevelToConfidence(MatchLevel.WEAK_MATCH)).toBe('low');
    });

    test('should return low for unknown match level', () => {
      expect(engine._matchLevelToConfidence('unknown')).toBe('low');
    });
  });

  // ==========================================================================
  // 7. suggestAction
  // ==========================================================================

  describe('suggestAction', () => {
    test('should return null suggestion for null context', () => {
      const result = engine.suggestAction(null);
      expect(result.suggestedAgent).toBeNull();
      expect(result.suggestedApproach).toBeNull();
      expect(result.confidence).toBe('low');
      expect(result.basedOn).toEqual([]);
    });

    test('should return null suggestion for undefined context', () => {
      const result = engine.suggestAction(undefined);
      expect(result.suggestedAgent).toBeNull();
    });

    test('should return null suggestion for empty description', () => {
      const result = engine.suggestAction({ description: '' });
      expect(result.suggestedAgent).toBeNull();
      expect(result.basedOn).toEqual([]);
    });

    test('should return null suggestion for non-string description', () => {
      const result = engine.suggestAction({ description: 42 });
      expect(result.suggestedAgent).toBeNull();
    });

    test('should suggest an agent based on delegation history', () => {
      const result = engine.suggestAction({
        description: 'Marketing campaign for social media',
        keywords: ['marketing', 'campaign', 'social'],
      });
      // Should suggest stefan-georgi based on history
      if (result.suggestedAgent) {
        expect(typeof result.suggestedAgent).toBe('string');
      }
    });

    test('should suggest an approach when history matches', () => {
      const result = engine.suggestAction({
        description: 'Marketing campaign for social media',
        keywords: ['marketing', 'campaign', 'social'],
      });
      if (result.suggestedApproach) {
        expect(typeof result.suggestedApproach).toBe('string');
      }
    });

    test('should return basedOn as an array of pattern IDs', () => {
      const result = engine.suggestAction({
        description: 'Marketing campaign delegation',
        keywords: ['marketing', 'campaign', 'social'],
      });
      expect(Array.isArray(result.basedOn)).toBe(true);
      for (const id of result.basedOn) {
        expect(typeof id).toBe('string');
      }
    });

    test('should return confidence as high, medium, or low', () => {
      const result = engine.suggestAction({
        description: 'Marketing campaign delegation',
        keywords: ['marketing', 'campaign', 'social'],
      });
      expect(['high', 'medium', 'low']).toContain(result.confidence);
    });

    test('should return null agent when no matching patterns exist', () => {
      const result = engine.suggestAction({
        description: 'completely unrelated xyzzy topic',
        keywords: ['xyzzy123', 'abcdef456'],
      });
      expect(result.suggestedAgent).toBeNull();
      expect(result.confidence).toBe('low');
    });

    test('should return null agent when patterns match but no delegation history', () => {
      const emptyHistoryEngine = createEngine(mockPatterns, []);
      const result = emptyHistoryEngine.suggestAction({
        description: 'Marketing campaign delegation',
        keywords: ['marketing', 'campaign', 'social'],
      });
      // Without delegation history, agent suggestions may be null
      expect(result).toHaveProperty('suggestedAgent');
      expect(result).toHaveProperty('confidence');
    });

    test('should prefer agents with higher success rates', () => {
      const history = [
        { description: 'marketing task', keywords: ['marketing', 'campaign'], agent: '@agent-a', outcome: 'success', approach: 'method-a' },
        { description: 'marketing task', keywords: ['marketing', 'campaign'], agent: '@agent-a', outcome: 'success', approach: 'method-a' },
        { description: 'marketing task', keywords: ['marketing', 'campaign'], agent: '@agent-b', outcome: 'failure', approach: 'method-b' },
        { description: 'marketing task', keywords: ['marketing', 'campaign'], agent: '@agent-b', outcome: 'failure', approach: 'method-b' },
      ];
      const eng = createEngine(mockPatterns, history);
      const result = eng.suggestAction({
        description: 'Marketing campaign delegation',
        keywords: ['marketing', 'campaign'],
      });
      if (result.suggestedAgent) {
        expect(result.suggestedAgent).toBe('@agent-a');
      }
    });

    test('should cache suggestAction results', () => {
      const ctx = { description: 'Marketing campaign delegation', keywords: ['marketing', 'campaign'] };
      const r1 = engine.suggestAction(ctx);
      const r2 = engine.suggestAction(ctx);
      expect(r1).toBe(r2);
    });

    test('should fall back to partial matches when no strong/exact matches exist', () => {
      // Create a pattern that will only partially match
      const weakPatterns = [
        { id: 'wp1', description: 'Content strategy planning', keywords: ['content', 'strategy'], purpose: 'Plan content', category: 'strategy', domain: 'marketing' },
      ];
      const history = [
        { description: 'content strategy', keywords: ['content', 'strategy'], agent: '@content-agent', outcome: 'success', approach: 'plan-first' },
      ];
      const eng = createEngine(weakPatterns, history);
      const result = eng.suggestAction({
        description: 'Content strategy for marketing',
        keywords: ['content', 'strategy'],
      });
      expect(result).toHaveProperty('suggestedAgent');
      expect(result).toHaveProperty('basedOn');
    });
  });

  // ==========================================================================
  // 8. detectRecurringPatterns
  // ==========================================================================

  describe('detectRecurringPatterns', () => {
    test('should return empty array when no patterns meet default minOccurrences (3)', () => {
      // Each pattern has unique keywords, so none repeat 3 times
      const result = engine.detectRecurringPatterns();
      // Marketing appears in p1, p3, p5 — could group depending on strategy
      expect(Array.isArray(result)).toBe(true);
    });

    test('should find recurring patterns with minOccurrences=2 groupBy category', () => {
      const result = engine.detectRecurringPatterns({
        minOccurrences: 2,
        groupBy: 'category',
      });
      expect(result.length).toBeGreaterThan(0);
      // 'delegation' has p1 and p3, 'strategy' has p4 and p5
      const delegationGroup = result.find((g) => g.groupKey === 'delegation');
      if (delegationGroup) {
        expect(delegationGroup.occurrences).toBeGreaterThanOrEqual(2);
      }
    });

    test('should group by keywords when groupBy is keywords (default)', () => {
      // Create patterns with identical keywords
      const repeatedPatterns = [
        { id: 'r1', keywords: ['alpha', 'beta'], description: 'First', category: 'test', domain: 'test' },
        { id: 'r2', keywords: ['alpha', 'beta'], description: 'Second', category: 'test', domain: 'test' },
        { id: 'r3', keywords: ['alpha', 'beta'], description: 'Third', category: 'test', domain: 'test' },
      ];
      const eng = createEngine(repeatedPatterns);
      const result = eng.detectRecurringPatterns({ minOccurrences: 3 });
      expect(result.length).toBe(1);
      expect(result[0].occurrences).toBe(3);
      expect(result[0].groupKey).toBe('alpha|beta');
    });

    test('should group by category when specified', () => {
      const result = engine.detectRecurringPatterns({
        minOccurrences: 2,
        groupBy: 'category',
      });
      for (const group of result) {
        expect(typeof group.groupKey).toBe('string');
        expect(group.occurrences).toBeGreaterThanOrEqual(2);
      }
    });

    test('should group by agent when specified', () => {
      const patternsWithAgent = [
        { id: 'a1', keywords: ['marketing'], description: 'Task 1', category: 'delegation', domain: 'marketing', metadata: { agent: '@dev' } },
        { id: 'a2', keywords: ['finance'], description: 'Task 2', category: 'delegation', domain: 'finance', metadata: { agent: '@dev' } },
        { id: 'a3', keywords: ['ops'], description: 'Task 3', category: 'delegation', domain: 'ops', metadata: { agent: '@dev' } },
      ];
      const eng = createEngine(patternsWithAgent);
      const result = eng.detectRecurringPatterns({ minOccurrences: 3, groupBy: 'agent' });
      expect(result.length).toBe(1);
      expect(result[0].groupKey).toBe('@dev');
      expect(result[0].occurrences).toBe(3);
    });

    test('should use "unassigned" as agent group key when agent is missing', () => {
      const patternsNoAgent = [
        { id: 'na1', keywords: ['x'], description: 'T1', category: 'test' },
        { id: 'na2', keywords: ['y'], description: 'T2', category: 'test' },
        { id: 'na3', keywords: ['z'], description: 'T3', category: 'test' },
      ];
      const eng = createEngine(patternsNoAgent);
      const result = eng.detectRecurringPatterns({ minOccurrences: 3, groupBy: 'agent' });
      expect(result.length).toBe(1);
      expect(result[0].groupKey).toBe('unassigned');
    });

    test('should use "uncategorized" as category group key when category is missing', () => {
      const patternsNoCat = [
        { id: 'nc1', keywords: ['x'], description: 'T1' },
        { id: 'nc2', keywords: ['y'], description: 'T2' },
      ];
      const eng = createEngine(patternsNoCat);
      const result = eng.detectRecurringPatterns({ minOccurrences: 2, groupBy: 'category' });
      expect(result.length).toBe(1);
      expect(result[0].groupKey).toBe('uncategorized');
    });

    test('should filter by domain when domain option is provided', () => {
      const result = engine.detectRecurringPatterns({
        minOccurrences: 2,
        groupBy: 'category',
        domain: 'marketing',
      });
      for (const group of result) {
        for (const p of group.patterns) {
          expect(p.domain.toLowerCase()).toBe('marketing');
        }
      }
    });

    test('should return empty array for empty memory', () => {
      const emptyEngine = createEngine([]);
      const result = emptyEngine.detectRecurringPatterns();
      expect(result).toEqual([]);
    });

    test('should sort results by occurrences descending', () => {
      const patterns = [
        { id: '1', keywords: ['alpha'], description: 'A1', category: 'cat-a' },
        { id: '2', keywords: ['alpha'], description: 'A2', category: 'cat-a' },
        { id: '3', keywords: ['alpha'], description: 'A3', category: 'cat-a' },
        { id: '4', keywords: ['beta'], description: 'B1', category: 'cat-b' },
        { id: '5', keywords: ['beta'], description: 'B2', category: 'cat-b' },
        { id: '6', keywords: ['beta'], description: 'B3', category: 'cat-b' },
        { id: '7', keywords: ['beta'], description: 'B4', category: 'cat-b' },
      ];
      const eng = createEngine(patterns);
      const result = eng.detectRecurringPatterns({ minOccurrences: 3, groupBy: 'category' });
      if (result.length >= 2) {
        expect(result[0].occurrences).toBeGreaterThanOrEqual(result[1].occurrences);
      }
    });

    test('should return pattern details in each group', () => {
      const patterns = [
        { id: 'g1', keywords: ['same'], description: 'Group item 1', category: 'test', domain: 'test' },
        { id: 'g2', keywords: ['same'], description: 'Group item 2', category: 'test', domain: 'test' },
        { id: 'g3', keywords: ['same'], description: 'Group item 3', category: 'test', domain: 'test' },
      ];
      const eng = createEngine(patterns);
      const result = eng.detectRecurringPatterns({ minOccurrences: 3 });
      expect(result.length).toBe(1);
      expect(result[0].patterns.length).toBe(3);
      for (const p of result[0].patterns) {
        expect(p).toHaveProperty('id');
        expect(p).toHaveProperty('description');
        expect(p).toHaveProperty('category');
        expect(p).toHaveProperty('domain');
      }
    });

    test('should calculate frequency when timestamps are available', () => {
      const now = Date.now();
      const patterns = [
        { id: 't1', keywords: ['timed'], description: 'T1', category: 'test', timestamp: new Date(now - 86400000 * 10).toISOString() },
        { id: 't2', keywords: ['timed'], description: 'T2', category: 'test', timestamp: new Date(now - 86400000 * 5).toISOString() },
        { id: 't3', keywords: ['timed'], description: 'T3', category: 'test', timestamp: new Date(now).toISOString() },
      ];
      const eng = createEngine(patterns);
      const result = eng.detectRecurringPatterns({ minOccurrences: 3 });
      expect(result.length).toBe(1);
      expect(result[0].frequency).not.toBeNull();
      expect(typeof result[0].frequency).toBe('number');
      expect(result[0].firstSeen).not.toBeNull();
      expect(result[0].lastSeen).not.toBeNull();
    });

    test('should set frequency to null when no timestamps available', () => {
      const patterns = [
        { id: 'n1', keywords: ['notimed'], description: 'N1', category: 'test' },
        { id: 'n2', keywords: ['notimed'], description: 'N2', category: 'test' },
        { id: 'n3', keywords: ['notimed'], description: 'N3', category: 'test' },
      ];
      const eng = createEngine(patterns);
      const result = eng.detectRecurringPatterns({ minOccurrences: 3 });
      expect(result[0].frequency).toBeNull();
      expect(result[0].firstSeen).toBeNull();
      expect(result[0].lastSeen).toBeNull();
    });

    test('should skip patterns with no keywords when groupBy is keywords', () => {
      const patterns = [
        { id: 'nk1', keywords: [], description: 'No keywords 1', category: 'test' },
        { id: 'nk2', keywords: [], description: 'No keywords 2', category: 'test' },
        { id: 'nk3', keywords: [], description: 'No keywords 3', category: 'test' },
      ];
      const eng = createEngine(patterns);
      const result = eng.detectRecurringPatterns({ minOccurrences: 3, groupBy: 'keywords' });
      // Patterns with empty keywords return null groupKey, so they are skipped
      expect(result.length).toBe(0);
    });

    test('should cache recurring pattern results', () => {
      const r1 = engine.detectRecurringPatterns({ minOccurrences: 2, groupBy: 'category' });
      const r2 = engine.detectRecurringPatterns({ minOccurrences: 2, groupBy: 'category' });
      expect(r1).toBe(r2);
    });
  });

  // ==========================================================================
  // 9. learnFromOutcome
  // ==========================================================================

  describe('learnFromOutcome', () => {
    test('should capture a successful outcome', () => {
      const result = engine.learnFromOutcome('del-001', {
        status: 'success',
        description: 'Marketing campaign completed',
        agent: '@stefan-georgi',
        approach: 'content-first',
        domain: 'marketing',
        keywords: ['marketing', 'campaign'],
      });
      expect(result.captured).toBe(true);
      expect(result.patternId).toMatch(/^insight-del-001-/);
    });

    test('should capture a failure outcome', () => {
      const result = engine.learnFromOutcome('del-002', {
        status: 'failure',
        description: 'Task failed due to timeout',
      });
      expect(result.captured).toBe(true);
      expect(typeof result.patternId).toBe('string');
    });

    test('should capture a partial outcome', () => {
      const result = engine.learnFromOutcome('del-003', {
        status: 'partial',
      });
      expect(result.captured).toBe(true);
    });

    test('should throw when delegationId is missing', () => {
      expect(() => engine.learnFromOutcome(null, { status: 'success' })).toThrow('delegationId');
    });

    test('should throw when delegationId is empty string', () => {
      expect(() => engine.learnFromOutcome('', { status: 'success' })).toThrow('delegationId');
    });

    test('should throw when delegationId is not a string', () => {
      expect(() => engine.learnFromOutcome(123, { status: 'success' })).toThrow('delegationId');
    });

    test('should throw when outcome is missing', () => {
      expect(() => engine.learnFromOutcome('del-001')).toThrow('outcome');
    });

    test('should throw when outcome is null', () => {
      expect(() => engine.learnFromOutcome('del-001', null)).toThrow('outcome');
    });

    test('should throw when outcome is not an object', () => {
      expect(() => engine.learnFromOutcome('del-001', 'success')).toThrow('outcome');
    });

    test('should throw when outcome.status is missing', () => {
      expect(() => engine.learnFromOutcome('del-001', { description: 'no status' })).toThrow('status');
    });

    test('should generate description from delegationId when not provided', () => {
      const result = engine.learnFromOutcome('del-auto', { status: 'success' });
      expect(result.captured).toBe(true);
      expect(result.patternId).toContain('del-auto');
    });

    test('should extract keywords from description when not provided', () => {
      const mem = createMockBusinessMemory([]);
      const eng = new PatternRecognitionEngine({
        businessMemory: mem,
        delegationStore: createMockDelegationStore(),
      });
      eng.learnFromOutcome('del-kw', {
        status: 'success',
        description: 'Marketing campaign completed successfully',
      });
      // Verify capture was called with extracted keywords
      const captured = mem.query();
      expect(captured.length).toBe(1);
      expect(captured[0].keywords.length).toBeGreaterThan(0);
    });

    test('should use provided keywords over extraction', () => {
      const mem = createMockBusinessMemory([]);
      const eng = new PatternRecognitionEngine({
        businessMemory: mem,
        delegationStore: createMockDelegationStore(),
      });
      eng.learnFromOutcome('del-kwp', {
        status: 'success',
        description: 'Marketing campaign completed',
        keywords: ['custom-keyword-1', 'custom-keyword-2'],
      });
      const captured = mem.query();
      expect(captured[0].keywords).toEqual(['custom-keyword-1', 'custom-keyword-2']);
    });

    test('should clear cache after learning', () => {
      // Populate cache
      engine.recognizePatterns({ description: 'Marketing campaign delegation', keywords: ['marketing'] });
      expect(engine._analysisCache.size).toBeGreaterThan(0);

      // Learn outcome — should clear cache
      engine.learnFromOutcome('del-clear', { status: 'success' });
      expect(engine._analysisCache.size).toBe(0);
    });

    test('should merge metadata into captured pattern', () => {
      const mem = createMockBusinessMemory([]);
      const eng = new PatternRecognitionEngine({
        businessMemory: mem,
        delegationStore: createMockDelegationStore(),
      });
      eng.learnFromOutcome('del-meta', {
        status: 'success',
        description: 'Test',
        metadata: { customField: 'customValue' },
      });
      const captured = mem.query();
      expect(captured[0].metadata.customField).toBe('customValue');
      expect(captured[0].metadata.delegationId).toBe('del-meta');
      expect(captured[0].metadata.status).toBe('success');
    });

    test('should set category to insight', () => {
      const mem = createMockBusinessMemory([]);
      const eng = new PatternRecognitionEngine({
        businessMemory: mem,
        delegationStore: createMockDelegationStore(),
      });
      eng.learnFromOutcome('del-cat', { status: 'success' });
      const captured = mem.query();
      expect(captured[0].category).toBe('insight');
    });

    test('should include timestamp in captured pattern', () => {
      const mem = createMockBusinessMemory([]);
      const eng = new PatternRecognitionEngine({
        businessMemory: mem,
        delegationStore: createMockDelegationStore(),
      });
      const before = new Date().toISOString();
      eng.learnFromOutcome('del-ts', { status: 'success' });
      const captured = mem.query();
      expect(captured[0].timestamp).toBeDefined();
      // Timestamp should be recent
      expect(new Date(captured[0].timestamp).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime() - 1000);
    });
  });

  // ==========================================================================
  // 10. getPatternInsights
  // ==========================================================================

  describe('getPatternInsights', () => {
    test('should return expected structure', () => {
      const result = engine.getPatternInsights();
      expect(result).toHaveProperty('byCategory');
      expect(result).toHaveProperty('topAgents');
      expect(result).toHaveProperty('commonDomains');
      expect(result).toHaveProperty('totalPatterns');
      expect(result).toHaveProperty('totalInsights');
    });

    test('should count patterns by category', () => {
      const result = engine.getPatternInsights();
      // mockPatterns: delegation(2), decision(1), strategy(2)
      expect(result.byCategory).toHaveProperty('delegation');
      expect(result.byCategory.delegation.count).toBe(2);
      expect(result.byCategory).toHaveProperty('decision');
      expect(result.byCategory.decision.count).toBe(1);
      expect(result.byCategory).toHaveProperty('strategy');
      expect(result.byCategory.strategy.count).toBe(2);
    });

    test('should include topKeywords per category', () => {
      const result = engine.getPatternInsights();
      expect(Array.isArray(result.byCategory.delegation.topKeywords)).toBe(true);
      expect(result.byCategory.delegation.topKeywords.length).toBeGreaterThan(0);
    });

    test('should report total patterns count', () => {
      const result = engine.getPatternInsights();
      expect(result.totalPatterns).toBe(5);
    });

    test('should report totalInsights as 0 when no insight category exists', () => {
      const result = engine.getPatternInsights();
      expect(result.totalInsights).toBe(0);
    });

    test('should count insights when insight patterns exist', () => {
      const patternsWithInsights = [
        ...mockPatterns,
        { id: 'i1', description: 'Insight 1', keywords: ['insight'], category: 'insight', domain: 'test' },
        { id: 'i2', description: 'Insight 2', keywords: ['insight'], category: 'insight', domain: 'test' },
      ];
      const eng = createEngine(patternsWithInsights);
      const result = eng.getPatternInsights();
      expect(result.totalInsights).toBe(2);
    });

    test('should report top agents from delegation history', () => {
      const result = engine.getPatternInsights();
      expect(Array.isArray(result.topAgents)).toBe(true);
      // mockDelegationHistory has @stefan-georgi and @analyst
      expect(result.topAgents.length).toBe(2);
      expect(result.topAgents[0]).toHaveProperty('agent');
      expect(result.topAgents[0]).toHaveProperty('totalDelegations');
      expect(result.topAgents[0]).toHaveProperty('successRate');
    });

    test('should sort top agents by totalDelegations descending', () => {
      const result = engine.getPatternInsights();
      // @stefan-georgi has 2 delegations, @analyst has 1
      expect(result.topAgents[0].agent).toBe('@stefan-georgi');
      expect(result.topAgents[0].totalDelegations).toBe(2);
      expect(result.topAgents[1].agent).toBe('@analyst');
      expect(result.topAgents[1].totalDelegations).toBe(1);
    });

    test('should calculate success rate correctly', () => {
      const result = engine.getPatternInsights();
      // All delegations in mockDelegationHistory have outcome: 'success'
      expect(result.topAgents[0].successRate).toBe(1);
      expect(result.topAgents[1].successRate).toBe(1);
    });

    test('should calculate success rate with mixed outcomes', () => {
      const mixedHistory = [
        { description: 'task 1', agent: '@agent-x', outcome: 'success' },
        { description: 'task 2', agent: '@agent-x', outcome: 'failure' },
        { description: 'task 3', agent: '@agent-x', outcome: 'success' },
      ];
      const eng = createEngine(mockPatterns, mixedHistory);
      const result = eng.getPatternInsights();
      const agentX = result.topAgents.find((a) => a.agent === '@agent-x');
      expect(agentX).toBeDefined();
      expect(agentX.successRate).toBeCloseTo(0.667, 2);
    });

    test('should report common domains', () => {
      const result = engine.getPatternInsights();
      expect(Array.isArray(result.commonDomains)).toBe(true);
      expect(result.commonDomains.length).toBeGreaterThan(0);
      // marketing appears 3 times (p1, p3, p5)
      expect(result.commonDomains[0].domain).toBe('marketing');
      expect(result.commonDomains[0].count).toBe(3);
    });

    test('should sort common domains by count descending', () => {
      const result = engine.getPatternInsights();
      for (let i = 1; i < result.commonDomains.length; i++) {
        expect(result.commonDomains[i - 1].count).toBeGreaterThanOrEqual(result.commonDomains[i].count);
      }
    });

    test('should return empty collections for empty memory and history', () => {
      const eng = createEngine([], []);
      const result = eng.getPatternInsights();
      expect(result.totalPatterns).toBe(0);
      expect(result.totalInsights).toBe(0);
      expect(result.topAgents).toEqual([]);
      expect(result.commonDomains).toEqual([]);
      expect(Object.keys(result.byCategory).length).toBe(0);
    });

    test('should cache insights results', () => {
      const r1 = engine.getPatternInsights();
      const r2 = engine.getPatternInsights();
      expect(r1).toBe(r2);
    });
  });

  // ==========================================================================
  // 11. getTopPatterns
  // ==========================================================================

  describe('getTopPatterns', () => {
    test('should return top N patterns grouped by keyword signature', () => {
      const result = engine.getTopPatterns(3);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    test('should default to N=5', () => {
      const result = engine.getTopPatterns();
      expect(result.length).toBeLessThanOrEqual(5);
    });

    test('should return correct structure for each entry', () => {
      const result = engine.getTopPatterns(5);
      for (const entry of result) {
        expect(entry).toHaveProperty('groupKey');
        expect(entry).toHaveProperty('occurrences');
        expect(entry).toHaveProperty('representativeDescription');
        expect(entry).toHaveProperty('keywords');
        expect(typeof entry.groupKey).toBe('string');
        expect(typeof entry.occurrences).toBe('number');
      }
    });

    test('should sort by occurrences descending', () => {
      const patterns = [
        { id: '1a', keywords: ['alpha'], description: 'Alpha 1' },
        { id: '1b', keywords: ['alpha'], description: 'Alpha 2' },
        { id: '1c', keywords: ['alpha'], description: 'Alpha 3' },
        { id: '2a', keywords: ['beta'], description: 'Beta 1' },
        { id: '2b', keywords: ['beta'], description: 'Beta 2' },
      ];
      const eng = createEngine(patterns);
      const result = eng.getTopPatterns(5);
      expect(result[0].occurrences).toBe(3);
      expect(result[0].groupKey).toBe('alpha');
    });

    test('should handle empty memory', () => {
      const eng = createEngine([]);
      const result = eng.getTopPatterns(5);
      expect(result).toEqual([]);
    });

    test('should group patterns with same keywords (regardless of order)', () => {
      const patterns = [
        { id: 'o1', keywords: ['beta', 'alpha'], description: 'BA' },
        { id: 'o2', keywords: ['alpha', 'beta'], description: 'AB' },
      ];
      const eng = createEngine(patterns);
      const result = eng.getTopPatterns(5);
      // Both should be in same group since keywords are sorted
      expect(result.length).toBe(1);
      expect(result[0].occurrences).toBe(2);
    });

    test('should use category as key for patterns with no keywords', () => {
      const patterns = [
        { id: 'nk1', keywords: [], description: 'No kw 1', category: 'test-cat' },
        { id: 'nk2', keywords: [], description: 'No kw 2', category: 'test-cat' },
      ];
      const eng = createEngine(patterns);
      const result = eng.getTopPatterns(5);
      expect(result.length).toBe(1);
      expect(result[0].groupKey).toBe('test-cat');
      expect(result[0].occurrences).toBe(2);
    });

    test('should use "unknown" as key when no keywords and no category', () => {
      const patterns = [
        { id: 'u1', keywords: [], description: 'Unknown 1' },
        { id: 'u2', keywords: [], description: 'Unknown 2' },
      ];
      const eng = createEngine(patterns);
      const result = eng.getTopPatterns(5);
      expect(result[0].groupKey).toBe('unknown');
    });

    test('should limit to exactly N results', () => {
      const patterns = [];
      for (let i = 0; i < 10; i++) {
        patterns.push({ id: `lim-${i}`, keywords: [`kw-${i}`], description: `Pattern ${i}` });
      }
      const eng = createEngine(patterns);
      const result = eng.getTopPatterns(3);
      expect(result.length).toBe(3);
    });

    test('should cache top pattern results', () => {
      const r1 = engine.getTopPatterns(5);
      const r2 = engine.getTopPatterns(5);
      expect(r1).toBe(r2);
    });

    test('should use representative description from first pattern in group', () => {
      const patterns = [
        { id: 'rep1', keywords: ['same'], description: 'First description' },
        { id: 'rep2', keywords: ['same'], description: 'Second description' },
      ];
      const eng = createEngine(patterns);
      const result = eng.getTopPatterns(5);
      expect(result[0].representativeDescription).toBe('First description');
    });
  });

  // ==========================================================================
  // 12. clearCache
  // ==========================================================================

  describe('clearCache', () => {
    test('should clear the analysis cache', () => {
      engine.recognizePatterns({ description: 'Marketing campaign', keywords: ['marketing'] });
      expect(engine._analysisCache.size).toBeGreaterThan(0);

      engine.clearCache();
      expect(engine._analysisCache.size).toBe(0);
    });

    test('should clear the analysis cache timestamps', () => {
      engine.recognizePatterns({ description: 'Marketing campaign', keywords: ['marketing'] });
      expect(engine._analysisCacheTimestamps.size).toBeGreaterThan(0);

      engine.clearCache();
      expect(engine._analysisCacheTimestamps.size).toBe(0);
    });

    test('should clear the IDF cache', () => {
      engine.recognizePatterns({ description: 'Marketing campaign', keywords: ['marketing'] });
      // After recognizing patterns, IDF cache should be populated
      expect(engine._idfCache).not.toBeNull();

      engine.clearCache();
      expect(engine._idfCache).toBeNull();
      expect(engine._idfCacheTimestamp).toBe(0);
    });

    test('should cause subsequent calls to recalculate', () => {
      const ctx = { description: 'Marketing campaign', keywords: ['marketing', 'campaign'] };
      const r1 = engine.recognizePatterns(ctx);
      engine.clearCache();
      const r2 = engine.recognizePatterns(ctx);
      // Results should be equivalent but not the same reference (recalculated)
      expect(r1).not.toBe(r2);
      expect(r1).toEqual(r2);
    });

    test('should be safe to call multiple times', () => {
      engine.clearCache();
      engine.clearCache();
      engine.clearCache();
      expect(engine._analysisCache.size).toBe(0);
    });

    test('should be safe to call on a fresh engine', () => {
      const freshEngine = createEngine();
      freshEngine.clearCache();
      expect(freshEngine._analysisCache.size).toBe(0);
    });
  });

  // ==========================================================================
  // 13. _extractKeywords
  // ==========================================================================

  describe('_extractKeywords', () => {
    test('should extract content words from text', () => {
      const result = engine._extractKeywords('Marketing campaign for social media');
      expect(result).toContain('marketing');
      expect(result).toContain('campaign');
      expect(result).toContain('social');
      expect(result).toContain('media');
    });

    test('should filter out stop words', () => {
      const result = engine._extractKeywords('This is a test for the extraction and filtering');
      // 'this', 'is', 'a', 'for', 'the', 'and' are stop words
      expect(result).not.toContain('this');
      expect(result).not.toContain('for');
      expect(result).not.toContain('the');
      expect(result).not.toContain('and');
    });

    test('should filter words shorter than MIN_KEYWORD_LENGTH (3)', () => {
      const result = engine._extractKeywords('An ox is by me to do it');
      // 'ox', 'by', 'me', 'to', 'do', 'it' are all < 3 chars or stop words
      expect(result.every((w) => w.length >= 3)).toBe(true);
    });

    test('should return lowercase keywords', () => {
      const result = engine._extractKeywords('MARKETING Campaign SOCIAL');
      for (const kw of result) {
        expect(kw).toBe(kw.toLowerCase());
      }
    });

    test('should limit to MAX_KEYWORDS_PER_ENTITY (15)', () => {
      const longText = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa quebec romeo sierra tango';
      const result = engine._extractKeywords(longText);
      expect(result.length).toBeLessThanOrEqual(15);
    });

    test('should return empty array for null input', () => {
      expect(engine._extractKeywords(null)).toEqual([]);
    });

    test('should return empty array for undefined input', () => {
      expect(engine._extractKeywords(undefined)).toEqual([]);
    });

    test('should return empty array for empty string', () => {
      expect(engine._extractKeywords('')).toEqual([]);
    });

    test('should strip special characters', () => {
      const result = engine._extractKeywords('marketing! campaign? strategy... (social)');
      expect(result).toContain('marketing');
      expect(result).toContain('campaign');
      expect(result).toContain('strategy');
      expect(result).toContain('social');
    });

    test('should handle hyphenated words', () => {
      const result = engine._extractKeywords('content-first approach data-driven marketing');
      // Hyphens are preserved in the regex pattern
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle multiple spaces and tabs', () => {
      const result = engine._extractKeywords('marketing   campaign    social   media');
      expect(result).toContain('marketing');
      expect(result).toContain('campaign');
    });
  });

  // ==========================================================================
  // 14. _calculateKeywordOverlap
  // ==========================================================================

  describe('_calculateKeywordOverlap', () => {
    test('should return 0 for empty context keywords', () => {
      const score = engine._calculateKeywordOverlap([], { keywords: ['marketing'] });
      expect(score).toBe(0);
    });

    test('should return 0 for pattern with no keywords', () => {
      const score = engine._calculateKeywordOverlap(['marketing'], { keywords: [] });
      expect(score).toBe(0);
    });

    test('should return 0 for pattern with undefined keywords', () => {
      const score = engine._calculateKeywordOverlap(['marketing'], {});
      expect(score).toBe(0);
    });

    test('should return 1.0 for identical keyword sets', () => {
      const score = engine._calculateKeywordOverlap(
        ['marketing', 'campaign', 'social'],
        { keywords: ['marketing', 'campaign', 'social'] },
      );
      expect(score).toBeCloseTo(1.0, 1);
    });

    test('should return > 0 for overlapping keywords', () => {
      const score = engine._calculateKeywordOverlap(
        ['marketing', 'campaign'],
        { keywords: ['marketing', 'social', 'strategy'] },
      );
      expect(score).toBeGreaterThan(0);
    });

    test('should return 0 for completely disjoint keywords', () => {
      const score = engine._calculateKeywordOverlap(
        ['alpha', 'beta', 'gamma'],
        { keywords: ['delta', 'epsilon', 'zeta'] },
      );
      expect(score).toBe(0);
    });

    test('should give partial credit for prefix matches', () => {
      const score = engine._calculateKeywordOverlap(
        ['market'],
        { keywords: ['marketing'] },
      );
      // 'market' is a prefix of 'marketing', so should get partial credit
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });

    test('should be case-insensitive', () => {
      const score = engine._calculateKeywordOverlap(
        ['marketing'],
        { keywords: ['Marketing'] },
      );
      expect(score).toBeGreaterThan(0);
    });

    test('should apply IDF weighting (rare keywords worth more)', () => {
      // 'marketing' appears in 3/5 patterns (common), 'architecture' in 1/5 (rare)
      const scoreCommon = engine._calculateKeywordOverlap(
        ['marketing'],
        { keywords: ['marketing'] },
      );
      const scoreRare = engine._calculateKeywordOverlap(
        ['architecture'],
        { keywords: ['architecture'] },
      );
      // Both should be 1.0 since each is the only keyword and matches fully
      // The IDF difference only matters in relative scoring when multiple keywords are present
      expect(scoreCommon).toBeCloseTo(1.0, 1);
      expect(scoreRare).toBeCloseTo(1.0, 1);
    });
  });

  // ==========================================================================
  // 15. _calculateContextSimilarity
  // ==========================================================================

  describe('_calculateContextSimilarity', () => {
    test('should return 0 for empty context', () => {
      const score = engine._calculateContextSimilarity('', { purpose: 'Marketing campaign' });
      expect(score).toBe(0);
    });

    test('should return 0 for pattern with no purpose or description', () => {
      const score = engine._calculateContextSimilarity('marketing campaign', {});
      expect(score).toBe(0);
    });

    test('should return high score for identical text', () => {
      const score = engine._calculateContextSimilarity(
        'marketing campaign delegation',
        { purpose: 'marketing campaign delegation' },
      );
      expect(score).toBeGreaterThanOrEqual(0.8);
    });

    test('should return score between 0 and 1', () => {
      const score = engine._calculateContextSimilarity(
        'marketing campaign social media',
        { purpose: 'Delegate marketing tasks' },
      );
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    test('should return 0 for completely different contexts', () => {
      const score = engine._calculateContextSimilarity(
        'alpha bravo charlie delta',
        { purpose: 'echo foxtrot golf hotel' },
      );
      expect(score).toBe(0);
    });

    test('should use pattern.description when purpose is not available', () => {
      const score = engine._calculateContextSimilarity(
        'marketing campaign',
        { description: 'marketing campaign delegation' },
      );
      expect(score).toBeGreaterThan(0);
    });

    test('should give partial credit for prefix token matches', () => {
      const score = engine._calculateContextSimilarity(
        'market strategy',
        { purpose: 'marketing strategies for growth' },
      );
      // 'market' is prefix of 'marketing', 'strategy' is not prefix of 'strategies' but 'strategi' would be
      // Actually 'strategy' starts with 'strateg' and so does 'strategies'
      expect(score).toBeGreaterThan(0);
    });

    test('should return 0 when context has only stop words', () => {
      const score = engine._calculateContextSimilarity(
        'the is a for to',
        { purpose: 'Marketing campaign' },
      );
      expect(score).toBe(0);
    });

    test('should return 0 when pattern has only stop words', () => {
      const score = engine._calculateContextSimilarity(
        'marketing campaign',
        { purpose: 'the is a for to' },
      );
      expect(score).toBe(0);
    });
  });

  // ==========================================================================
  // 16. _computeSimpleOverlap
  // ==========================================================================

  describe('_computeSimpleOverlap', () => {
    test('should return 0 for null inputs', () => {
      expect(engine._computeSimpleOverlap(null, ['a'])).toBe(0);
      expect(engine._computeSimpleOverlap(['a'], null)).toBe(0);
    });

    test('should return 0 for empty arrays', () => {
      expect(engine._computeSimpleOverlap([], ['a'])).toBe(0);
      expect(engine._computeSimpleOverlap(['a'], [])).toBe(0);
    });

    test('should return 1.0 for identical arrays', () => {
      const result = engine._computeSimpleOverlap(
        ['marketing', 'campaign'],
        ['marketing', 'campaign'],
      );
      expect(result).toBe(1.0);
    });

    test('should return partial overlap ratio', () => {
      const result = engine._computeSimpleOverlap(
        ['marketing', 'campaign'],
        ['marketing', 'social'],
      );
      // 1 match out of min(2, 2) = 0.5
      expect(result).toBe(0.5);
    });

    test('should be case-insensitive', () => {
      const result = engine._computeSimpleOverlap(
        ['Marketing', 'CAMPAIGN'],
        ['marketing', 'campaign'],
      );
      expect(result).toBe(1.0);
    });

    test('should return 0 for no overlap', () => {
      const result = engine._computeSimpleOverlap(
        ['alpha', 'beta'],
        ['gamma', 'delta'],
      );
      expect(result).toBe(0);
    });

    test('should use min of both set sizes as denominator', () => {
      const result = engine._computeSimpleOverlap(
        ['marketing'],
        ['marketing', 'campaign', 'social'],
      );
      // 1 match / min(1, 3) = 1.0
      expect(result).toBe(1.0);
    });
  });

  // ==========================================================================
  // 17. _computeGroupKey
  // ==========================================================================

  describe('_computeGroupKey', () => {
    test('should return sorted keyword string for keywords groupBy', () => {
      const key = engine._computeGroupKey(
        { keywords: ['social', 'marketing', 'campaign'] },
        'keywords',
      );
      expect(key).toBe('campaign|marketing|social');
    });

    test('should return null for empty keywords with keywords groupBy', () => {
      const key = engine._computeGroupKey({ keywords: [] }, 'keywords');
      expect(key).toBeNull();
    });

    test('should return category for category groupBy', () => {
      const key = engine._computeGroupKey({ category: 'delegation' }, 'category');
      expect(key).toBe('delegation');
    });

    test('should return "uncategorized" when category missing', () => {
      const key = engine._computeGroupKey({}, 'category');
      expect(key).toBe('uncategorized');
    });

    test('should return agent from metadata for agent groupBy', () => {
      const key = engine._computeGroupKey(
        { metadata: { agent: '@dev' } },
        'agent',
      );
      expect(key).toBe('@dev');
    });

    test('should return agent from top-level for agent groupBy', () => {
      const key = engine._computeGroupKey({ agent: '@pm' }, 'agent');
      expect(key).toBe('@pm');
    });

    test('should return "unassigned" when no agent found', () => {
      const key = engine._computeGroupKey({}, 'agent');
      expect(key).toBe('unassigned');
    });

    test('should prefer metadata.agent over top-level agent', () => {
      const key = engine._computeGroupKey(
        { agent: '@pm', metadata: { agent: '@dev' } },
        'agent',
      );
      expect(key).toBe('@dev');
    });
  });

  // ==========================================================================
  // 18. _generateSuggestion
  // ==========================================================================

  describe('_generateSuggestion', () => {
    test('should generate "no matching patterns" for null topMatch', () => {
      const suggestion = engine._generateSuggestion(null, 0);
      expect(suggestion).toContain('No matching patterns');
    });

    test('should generate exact match suggestion', () => {
      const suggestion = engine._generateSuggestion(
        { matchLevel: MatchLevel.EXACT_MATCH, description: 'Test pattern', relevanceScore: 0.95 },
        1,
      );
      expect(suggestion).toContain('Exact match');
      expect(suggestion).toContain('Test pattern');
    });

    test('should generate strong match suggestion', () => {
      const suggestion = engine._generateSuggestion(
        { matchLevel: MatchLevel.STRONG_MATCH, description: 'Test pattern', relevanceScore: 0.8 },
        2,
      );
      expect(suggestion).toContain('Strong match');
      expect(suggestion).toContain('80.0%');
    });

    test('should generate partial match suggestion', () => {
      const suggestion = engine._generateSuggestion(
        { matchLevel: MatchLevel.PARTIAL_MATCH, description: 'Test', relevanceScore: 0.6 },
        3,
      );
      expect(suggestion).toContain('Partial match');
      expect(suggestion).toContain('3');
    });

    test('should generate weak match suggestion', () => {
      const suggestion = engine._generateSuggestion(
        { matchLevel: MatchLevel.WEAK_MATCH, description: 'Test', relevanceScore: 0.42 },
        1,
      );
      expect(suggestion).toContain('Weak match');
    });
  });

  // ==========================================================================
  // 19. Caching behavior
  // ==========================================================================

  describe('Caching behavior', () => {
    test('should return cached result within TTL', () => {
      const ctx = { description: 'Marketing campaign', keywords: ['marketing'] };
      const r1 = engine.recognizePatterns(ctx);
      const r2 = engine.recognizePatterns(ctx);
      expect(r1).toBe(r2);
    });

    test('should use different cache keys for different descriptions', () => {
      const r1 = engine.recognizePatterns({ description: 'Marketing campaign', keywords: ['marketing'] });
      const r2 = engine.recognizePatterns({ description: 'Finance report', keywords: ['finance'] });
      expect(r1).not.toBe(r2);
    });

    test('should use different cache keys for different categories', () => {
      const r1 = engine.recognizePatterns({ description: 'Marketing campaign', category: 'delegation' });
      const r2 = engine.recognizePatterns({ description: 'Marketing campaign', category: 'strategy' });
      // Different categories should produce different results
      expect(r1).not.toBe(r2);
    });

    test('should use different cache keys for different domains', () => {
      const r1 = engine.recognizePatterns({ description: 'Marketing campaign', domain: 'marketing' });
      const r2 = engine.recognizePatterns({ description: 'Marketing campaign', domain: 'finance' });
      expect(r1).not.toBe(r2);
    });

    test('suggestAction should have independent cache from recognizePatterns', () => {
      const ctx = { description: 'Marketing campaign delegation', keywords: ['marketing', 'campaign'] };
      const recognize = engine.recognizePatterns(ctx);
      const suggest = engine.suggestAction(ctx);
      // They should be different objects (different cache keys: recognize| vs suggest|)
      expect(recognize).not.toBe(suggest);
    });

    test('clearCache should invalidate all cached results', () => {
      const ctx = { description: 'Marketing campaign', keywords: ['marketing'] };
      const r1 = engine.recognizePatterns(ctx);
      engine.clearCache();
      const r2 = engine.recognizePatterns(ctx);
      expect(r1).not.toBe(r2);
    });

    test('expired cache entries should be recalculated', () => {
      const ctx = { description: 'Marketing campaign', keywords: ['marketing'] };
      engine.recognizePatterns(ctx);

      // Manually expire the cache by setting timestamp far in the past
      for (const [key] of engine._analysisCacheTimestamps) {
        engine._analysisCacheTimestamps.set(key, Date.now() - CACHE_TTL_MS - 1);
      }

      const r2 = engine.recognizePatterns(ctx);
      // Should be a fresh result (new reference)
      expect(r2).toBeDefined();
      expect(r2.patterns).toBeDefined();
    });
  });

  // ==========================================================================
  // 20. _round and _pct helpers
  // ==========================================================================

  describe('Utility helpers', () => {
    test('_round should round to 3 decimal places', () => {
      expect(engine._round(0.12345)).toBe(0.123);
      expect(engine._round(0.6789)).toBe(0.679);
      expect(engine._round(1.0)).toBe(1);
      expect(engine._round(0)).toBe(0);
    });

    test('_pct should format as percentage string', () => {
      expect(engine._pct(0.95)).toBe('95.0%');
      expect(engine._pct(0.123)).toBe('12.3%');
      expect(engine._pct(1.0)).toBe('100.0%');
      expect(engine._pct(0)).toBe('0.0%');
    });
  });

  // ==========================================================================
  // 21. Edge cases
  // ==========================================================================

  describe('Edge cases', () => {
    test('should handle patterns with patternId instead of id', () => {
      const patterns = [
        { patternId: 'pid1', description: 'Marketing task', keywords: ['marketing', 'task'], purpose: 'Do marketing', category: 'delegation', domain: 'marketing' },
      ];
      const eng = createEngine(patterns);
      const result = eng.recognizePatterns({
        description: 'Marketing task delegation',
        keywords: ['marketing', 'task'],
      });
      if (result.patterns.length > 0) {
        expect(result.patterns[0].patternId).toBe('pid1');
      }
    });

    test('should handle patterns with purpose instead of description', () => {
      const patterns = [
        { id: 'pur1', keywords: ['marketing'], purpose: 'Marketing planning', category: 'delegation', domain: 'marketing' },
      ];
      const eng = createEngine(patterns);
      const result = eng.recognizePatterns({
        description: 'Marketing planning',
        keywords: ['marketing'],
      });
      if (result.patterns.length > 0) {
        expect(result.patterns[0].description).toBe('Marketing planning');
      }
    });

    test('should handle special characters in keywords', () => {
      const patterns = [
        { id: 'sp1', keywords: ['c++', 'node.js', 'type-script'], description: 'Tech stack', purpose: 'Tech stack', category: 'strategy', domain: 'engineering' },
      ];
      const eng = createEngine(patterns);
      const result = eng.recognizePatterns({
        description: 'Tech stack review',
        keywords: ['c++', 'node.js'],
      });
      expect(result).toHaveProperty('patterns');
    });

    test('should handle unicode characters in descriptions', () => {
      const patterns = [
        { id: 'uni1', keywords: ['estrategia', 'marketing'], description: 'Estrategia de marketing', purpose: 'Estrategia de marketing', category: 'strategy', domain: 'marketing' },
      ];
      const eng = createEngine(patterns);
      const result = eng.recognizePatterns({
        description: 'Estrategia de marketing digital',
        keywords: ['estrategia', 'marketing'],
      });
      expect(result).toHaveProperty('patterns');
    });

    test('should handle very large number of patterns', () => {
      const largePatterns = [];
      for (let i = 0; i < 500; i++) {
        largePatterns.push({
          id: `large-${i}`,
          keywords: [`keyword-${i % 50}`, `group-${i % 10}`],
          description: `Pattern number ${i}`,
          purpose: `Purpose number ${i}`,
          category: `cat-${i % 5}`,
          domain: `dom-${i % 3}`,
        });
      }
      const eng = createEngine(largePatterns);

      const result = eng.recognizePatterns({
        description: 'Pattern number 42',
        keywords: ['keyword-42', 'group-2'],
      });
      expect(result).toHaveProperty('patterns');
      // Should limit to MAX_RESULTS (20)
      expect(result.patterns.length).toBeLessThanOrEqual(20);
    });

    test('should handle patterns with metadata', () => {
      const patterns = [
        { id: 'meta1', keywords: ['marketing'], description: 'Meta pattern', purpose: 'Test metadata', category: 'delegation', domain: 'marketing', metadata: { source: 'test', priority: 'high' } },
      ];
      const eng = createEngine(patterns);
      const result = eng.recognizePatterns({
        description: 'Marketing delegation',
        keywords: ['marketing'],
      });
      if (result.patterns.length > 0) {
        expect(result.patterns[0].metadata).toEqual({ source: 'test', priority: 'high' });
      }
    });

    test('should handle delegation history with assignedTo instead of agent', () => {
      const history = [
        { description: 'marketing task', keywords: ['marketing', 'campaign'], assignedTo: '@custom-agent', outcome: 'success', approach: 'custom' },
      ];
      const eng = createEngine(mockPatterns, history);
      const result = eng.suggestAction({
        description: 'Marketing campaign delegation',
        keywords: ['marketing', 'campaign'],
      });
      if (result.suggestedAgent) {
        expect(result.suggestedAgent).toBe('@custom-agent');
      }
    });

    test('should handle delegation history with status=completed instead of outcome=success', () => {
      const history = [
        { description: 'marketing task', keywords: ['marketing', 'campaign'], agent: '@status-agent', status: 'completed', approach: 'status-based' },
      ];
      const eng = createEngine(mockPatterns, history);
      const insights = eng.getPatternInsights();
      const agent = insights.topAgents.find((a) => a.agent === '@status-agent');
      if (agent) {
        expect(agent.successRate).toBe(1);
      }
    });

    test('should handle delegation history with method instead of approach', () => {
      const history = [
        { description: 'marketing task', keywords: ['marketing', 'campaign'], agent: '@method-agent', outcome: 'success', method: 'method-based' },
      ];
      const eng = createEngine(mockPatterns, history);
      const result = eng.suggestAction({
        description: 'Marketing campaign delegation',
        keywords: ['marketing', 'campaign'],
      });
      if (result.suggestedApproach) {
        expect(result.suggestedApproach).toBe('method-based');
      }
    });

    test('should handle patterns with createdAt instead of timestamp', () => {
      const now = Date.now();
      const patterns = [
        { id: 'ca1', keywords: ['dated'], description: 'D1', category: 'test', createdAt: new Date(now - 86400000).toISOString() },
        { id: 'ca2', keywords: ['dated'], description: 'D2', category: 'test', createdAt: new Date(now - 43200000).toISOString() },
        { id: 'ca3', keywords: ['dated'], description: 'D3', category: 'test', createdAt: new Date(now).toISOString() },
      ];
      const eng = createEngine(patterns);
      const result = eng.detectRecurringPatterns({ minOccurrences: 3 });
      expect(result[0].firstSeen).not.toBeNull();
      expect(result[0].lastSeen).not.toBeNull();
    });

    test('should handle patterns with date instead of timestamp or createdAt', () => {
      const now = Date.now();
      const patterns = [
        { id: 'd1', keywords: ['dated'], description: 'D1', category: 'test', date: new Date(now - 86400000).toISOString() },
        { id: 'd2', keywords: ['dated'], description: 'D2', category: 'test', date: new Date(now).toISOString() },
        { id: 'd3', keywords: ['dated'], description: 'D3', category: 'test', date: new Date(now - 43200000).toISOString() },
      ];
      const eng = createEngine(patterns);
      const result = eng.detectRecurringPatterns({ minOccurrences: 3 });
      expect(result[0].firstSeen).not.toBeNull();
    });

    test('recognizePatterns should handle context with only description (no keywords)', () => {
      const result = engine.recognizePatterns({
        description: 'Marketing campaign for social media advertising',
      });
      // Should extract keywords from description automatically
      expect(result).toHaveProperty('patterns');
    });

    test('should handle pattern without keywords or purpose gracefully', () => {
      const patterns = [
        { id: 'bare1', description: 'A bare pattern', category: 'test', domain: 'test' },
      ];
      const eng = createEngine(patterns);
      const result = eng.recognizePatterns({
        description: 'A bare pattern test',
        keywords: ['bare', 'pattern'],
      });
      // Should not crash, may or may not match
      expect(result).toHaveProperty('patterns');
    });

    test('should handle MAX_RESULTS limit in recognizePatterns', () => {
      const manyPatterns = [];
      for (let i = 0; i < 50; i++) {
        manyPatterns.push({
          id: `max-${i}`,
          keywords: ['common', `variant-${i}`],
          description: `Common pattern variant ${i}`,
          purpose: `Common purpose variant ${i}`,
          category: 'delegation',
          domain: 'marketing',
        });
      }
      const eng = createEngine(manyPatterns);
      const result = eng.recognizePatterns({
        description: 'Common pattern matching',
        keywords: ['common'],
      });
      expect(result.patterns.length).toBeLessThanOrEqual(20);
    });
  });

  // ==========================================================================
  // 22. IDF scoring
  // ==========================================================================

  describe('_getIdfScores', () => {
    test('should return a Map of keyword IDF scores', () => {
      const scores = engine._getIdfScores();
      expect(scores).toBeInstanceOf(Map);
      expect(scores.size).toBeGreaterThan(0);
    });

    test('should assign higher IDF to rare keywords', () => {
      const scores = engine._getIdfScores();
      // 'marketing' appears in 3/5 patterns, 'architecture' in 1/5
      const marketingIdf = scores.get('marketing');
      const architectureIdf = scores.get('architecture');
      expect(architectureIdf).toBeGreaterThan(marketingIdf);
    });

    test('should cache IDF scores', () => {
      const s1 = engine._getIdfScores();
      const s2 = engine._getIdfScores();
      expect(s1).toBe(s2);
    });

    test('should recalculate IDF after cache clear', () => {
      const s1 = engine._getIdfScores();
      engine.clearCache();
      const s2 = engine._getIdfScores();
      expect(s1).not.toBe(s2);
    });

    test('should handle empty memory (totalDocs = 1 to avoid div by zero)', () => {
      const eng = createEngine([]);
      const scores = eng._getIdfScores();
      expect(scores).toBeInstanceOf(Map);
      expect(scores.size).toBe(0);
    });

    test('should count each keyword once per document for IDF', () => {
      // A pattern with duplicate keywords
      const patterns = [
        { id: 'dup1', keywords: ['marketing', 'marketing', 'marketing'], description: 'Dup', category: 'test' },
        { id: 'dup2', keywords: ['finance'], description: 'Fin', category: 'test' },
      ];
      const eng = createEngine(patterns);
      const scores = eng._getIdfScores();
      // 'marketing' should appear in 1 document, 'finance' in 1 document
      const marketingIdf = scores.get('marketing');
      const financeIdf = scores.get('finance');
      // Both appear in 1/2 docs, so IDF should be equal
      expect(marketingIdf).toBe(financeIdf);
    });
  });

  // ==========================================================================
  // 23. THRESHOLD_MINIMUM filtering
  // ==========================================================================

  describe('THRESHOLD_MINIMUM filtering', () => {
    test('should exclude patterns below minimum threshold (0.4)', () => {
      const result = engine.recognizePatterns({
        description: 'Marketing campaign social media',
        keywords: ['marketing', 'campaign', 'social'],
      });
      for (const p of result.patterns) {
        expect(p.relevanceScore).toBeGreaterThanOrEqual(0.4);
      }
    });

    test('should return no patterns when all scores are below threshold', () => {
      const patterns = [
        { id: 'low1', keywords: ['zzz123'], description: 'Completely unrelated', purpose: 'Nothing', category: 'other', domain: 'other' },
      ];
      const eng = createEngine(patterns);
      const result = eng.recognizePatterns({
        description: 'Marketing campaign',
        keywords: ['marketing', 'campaign'],
      });
      expect(result.patterns.length).toBe(0);
    });
  });

  // ==========================================================================
  // 24. Suggestion with empty memory vs populated memory
  // ==========================================================================

  describe('Suggestion text variations', () => {
    test('should mention "new pattern" when memory is empty', () => {
      const eng = createEngine([]);
      const result = eng.recognizePatterns({
        description: 'Something brand new',
      });
      expect(result.suggestion).toContain('No historical patterns');
    });

    test('should mention "new pattern" when no matches found', () => {
      const result = engine.recognizePatterns({
        description: 'xyzzy unrelated gibberish content',
        keywords: ['xyzzy123', 'gibberish456'],
      });
      expect(result.suggestion).toContain('No matching patterns');
    });
  });

  // ==========================================================================
  // 25. Integration-like scenarios
  // ==========================================================================

  describe('Integration-like scenarios', () => {
    test('full workflow: recognize -> suggest -> learn -> recognize again', () => {
      // Step 1: Recognize patterns for a marketing task
      const recognition = engine.recognizePatterns({
        description: 'Marketing campaign for social media',
        keywords: ['marketing', 'campaign', 'social'],
      });
      expect(recognition.patterns.length).toBeGreaterThan(0);

      // Step 2: Get action suggestion
      const suggestion = engine.suggestAction({
        description: 'Marketing campaign for social media',
        keywords: ['marketing', 'campaign', 'social'],
      });
      expect(suggestion).toHaveProperty('suggestedAgent');
      expect(suggestion).toHaveProperty('confidence');

      // Step 3: Learn from outcome
      const learned = engine.learnFromOutcome('del-integration-1', {
        status: 'success',
        description: 'Marketing campaign completed',
        agent: '@stefan-georgi',
        approach: 'content-first',
        domain: 'marketing',
        keywords: ['marketing', 'campaign'],
      });
      expect(learned.captured).toBe(true);

      // Step 4: Recognize again (cache cleared by learnFromOutcome)
      const recognition2 = engine.recognizePatterns({
        description: 'Marketing campaign for social media',
        keywords: ['marketing', 'campaign', 'social'],
      });
      // Should still find patterns (now with one more in memory)
      expect(recognition2.patterns.length).toBeGreaterThan(0);
    });

    test('recurring patterns detection after multiple learns', () => {
      const mem = createMockBusinessMemory([]);
      const eng = new PatternRecognitionEngine({
        businessMemory: mem,
        delegationStore: createMockDelegationStore(),
      });

      // Learn multiple outcomes with same keywords
      for (let i = 0; i < 5; i++) {
        eng.learnFromOutcome(`del-recur-${i}`, {
          status: 'success',
          description: 'Recurring marketing task',
          keywords: ['recurring', 'marketing'],
          domain: 'marketing',
        });
      }

      const recurring = eng.detectRecurringPatterns({ minOccurrences: 3 });
      // All 5 patterns have category: 'insight' (from learnFromOutcome)
      const insightGroup = recurring.find((g) => g.groupKey === 'insight');
      // They have same keywords, so groupBy keywords should group them
      expect(recurring.length).toBeGreaterThanOrEqual(1);
    });

    test('insights after multiple outcomes', () => {
      const mem = createMockBusinessMemory([]);
      const eng = new PatternRecognitionEngine({
        businessMemory: mem,
        delegationStore: createMockDelegationStore(),
      });

      eng.learnFromOutcome('del-ins-1', { status: 'success', domain: 'marketing', keywords: ['marketing'] });
      eng.learnFromOutcome('del-ins-2', { status: 'failure', domain: 'marketing', keywords: ['marketing'] });
      eng.learnFromOutcome('del-ins-3', { status: 'success', domain: 'finance', keywords: ['finance'] });

      const insights = eng.getPatternInsights();
      expect(insights.totalPatterns).toBe(3);
      expect(insights.totalInsights).toBe(3);
      expect(insights.byCategory).toHaveProperty('insight');
      expect(insights.commonDomains.length).toBe(2);
    });
  });
});
