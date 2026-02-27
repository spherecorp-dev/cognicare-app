/**
 * Jarvis Business Memory - Unit Tests
 *
 * Comprehensive tests for the JarvisBusinessMemory class.
 * Covers: constructor, capture, query, getRelevant, search,
 * summarize, resolvePattern, trackDelegation, formatForPrompt,
 * statistics, and export.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  JarvisBusinessMemory,
  BusinessCategory,
  Importance,
  Events,
  CONFIG,
} = require('../jarvis-business-memory');

describe('JarvisBusinessMemory', () => {
  let memory;
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-biz-mem-'));
    memory = new JarvisBusinessMemory(testDir, { quiet: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  1. Constructor & Initialization
  // ═══════════════════════════════════════════════════════════════════════════

  describe('constructor', () => {
    test('should create instance with default options', () => {
      const mem = new JarvisBusinessMemory(testDir, { quiet: true });

      expect(mem.rootPath).toBe(testDir);
      expect(mem.options.repeatThreshold).toBe(CONFIG.repeatThreshold);
      expect(mem.options.delegationWindowMs).toBe(CONFIG.delegationWindowMs);
      expect(mem.options.quiet).toBe(true);
      expect(mem.patterns).toBeInstanceOf(Map);
      expect(mem.patterns.size).toBe(0);
      expect(mem.delegationTracking).toBeInstanceOf(Map);
      expect(mem.delegationTracking.size).toBe(0);
    });

    test('should create instance with custom options', () => {
      const mem = new JarvisBusinessMemory(testDir, {
        repeatThreshold: 5,
        delegationWindowMs: 1000,
        quiet: true,
      });

      expect(mem.options.repeatThreshold).toBe(5);
      expect(mem.options.delegationWindowMs).toBe(1000);
    });

    test('should load existing patterns from disk on init', () => {
      // First, capture some patterns
      memory.capture({
        title: 'Persisted pattern',
        description: 'This should persist to disk',
        category: BusinessCategory.STRATEGY,
        importance: 'high',
      });

      memory.capture({
        title: 'Another pattern',
        description: 'Second persisted pattern',
        category: BusinessCategory.DECISION,
      });

      // Create a new instance pointing at the same directory
      const mem2 = new JarvisBusinessMemory(testDir, { quiet: true });

      expect(mem2.patterns.size).toBe(2);
      const titles = [...mem2.patterns.values()].map((p) => p.title);
      expect(titles).toContain('Persisted pattern');
      expect(titles).toContain('Another pattern');
    });

    test('should set correct file paths', () => {
      expect(memory.businessMemoryJsonPath).toBe(
        path.join(testDir, '.aios/jarvis/business-memory.json'),
      );
      expect(memory.businessMemoryMdPath).toBe(
        path.join(testDir, '.aios/jarvis/business-memory.md'),
      );
      expect(memory.delegationTrackingPath).toBe(
        path.join(testDir, '.aios/jarvis/delegation-tracking.json'),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  2. capture() — Core Operation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('capture', () => {
    test('should capture a business pattern with all fields', () => {
      const pattern = memory.capture({
        title: 'Q1 Roadmap Decision',
        description: 'Decided to focus on AI integrations for Q1',
        category: BusinessCategory.STRATEGY,
        importance: 'high',
        context: {
          agents_involved: ['@architect', '@pm'],
          related_stories: ['STORY-42'],
          related_epics: ['EPIC-5'],
          business_domain: 'product-development',
        },
        outcome: 'Team aligned on Q1 goals',
        learned_pattern: 'Early alignment reduces rework',
        tags: ['q1', 'roadmap', 'strategy'],
      });

      expect(pattern.title).toBe('Q1 Roadmap Decision');
      expect(pattern.description).toBe('Decided to focus on AI integrations for Q1');
      expect(pattern.category).toBe(BusinessCategory.STRATEGY);
      expect(pattern.importance).toBe(Importance.HIGH);
      expect(pattern.context.agents_involved).toEqual(['@architect', '@pm']);
      expect(pattern.context.related_stories).toEqual(['STORY-42']);
      expect(pattern.context.related_epics).toEqual(['EPIC-5']);
      expect(pattern.context.business_domain).toBe('product-development');
      expect(pattern.outcome).toBe('Team aligned on Q1 goals');
      expect(pattern.learned_pattern).toBe('Early alignment reduces rework');
      expect(pattern.tags).toEqual(['q1', 'roadmap', 'strategy']);
      expect(pattern.resolved).toBe(false);
      expect(pattern.resolvedAt).toBeNull();
      expect(pattern.source.type).toBe('ceo_input');
      expect(pattern.created_at).toBeDefined();
    });

    test('should auto-detect category from description when not provided', () => {
      const strategyPattern = memory.capture({
        title: 'New vision',
        description: 'Our strategy is to dominate the market with AI tools',
      });
      expect(strategyPattern.category).toBe(BusinessCategory.STRATEGY);

      const delegationPattern = memory.capture({
        title: 'Assign task',
        description: 'Delegate the code review to the agent team',
      });
      expect(delegationPattern.category).toBe(BusinessCategory.DELEGATION);

      const feedbackPattern = memory.capture({
        title: 'Quality check',
        description: 'The feedback on the last review was positive',
      });
      expect(feedbackPattern.category).toBe(BusinessCategory.FEEDBACK);

      const preferencePattern = memory.capture({
        title: 'Default approach',
        description: 'Always prefer using TypeScript for new projects',
      });
      expect(preferencePattern.category).toBe(BusinessCategory.PREFERENCE);

      const decisionPattern = memory.capture({
        title: 'Tech choice',
        description: 'We decide to choose React over Vue for the frontend',
      });
      expect(decisionPattern.category).toBe(BusinessCategory.DECISION);

      const insightPattern = memory.capture({
        title: 'Market trend',
        description: 'We notice a pattern in customer behavior',
      });
      expect(insightPattern.category).toBe(BusinessCategory.INSIGHT);
    });

    test('should normalize importance levels', () => {
      const highPattern = memory.capture({
        title: 'Critical issue',
        description: 'A critical matter',
        importance: 'critical',
      });
      expect(highPattern.importance).toBe(Importance.HIGH);

      const urgentPattern = memory.capture({
        title: 'Urgent matter',
        description: 'An urgent issue',
        importance: 'urgent',
      });
      expect(urgentPattern.importance).toBe(Importance.HIGH);

      const lowPattern = memory.capture({
        title: 'Minor note',
        description: 'A minor observation',
        importance: 'minor',
      });
      expect(lowPattern.importance).toBe(Importance.LOW);

      const trivialPattern = memory.capture({
        title: 'Trivial note',
        description: 'A trivial detail',
        importance: 'trivial',
      });
      expect(trivialPattern.importance).toBe(Importance.LOW);

      const defaultPattern = memory.capture({
        title: 'Normal note',
        description: 'Something normal',
      });
      expect(defaultPattern.importance).toBe(Importance.MEDIUM);
    });

    test('should generate unique IDs with biz- prefix', () => {
      const p1 = memory.capture({ title: 'First', description: 'First pattern' });
      const p2 = memory.capture({ title: 'Second', description: 'Second pattern' });

      expect(p1.id).toMatch(/^biz-/);
      expect(p2.id).toMatch(/^biz-/);
      expect(p1.id).not.toBe(p2.id);
    });

    test('should emit PATTERN_CAPTURED event', () => {
      const handler = jest.fn();
      memory.on(Events.PATTERN_CAPTURED, handler);

      const pattern = memory.capture({
        title: 'Event test',
        description: 'Testing events',
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(pattern);
    });

    test('should save to disk after capture (JSON + MD files)', () => {
      memory.capture({
        title: 'Disk save test',
        description: 'This should be saved to disk',
      });

      expect(fs.existsSync(memory.businessMemoryJsonPath)).toBe(true);
      expect(fs.existsSync(memory.businessMemoryMdPath)).toBe(true);

      const jsonContent = JSON.parse(
        fs.readFileSync(memory.businessMemoryJsonPath, 'utf-8'),
      );
      expect(jsonContent.patterns).toHaveLength(1);
      expect(jsonContent.patterns[0].title).toBe('Disk save test');

      const mdContent = fs.readFileSync(memory.businessMemoryMdPath, 'utf-8');
      expect(mdContent).toContain('Disk save test');
    });

    test('should default empty fields gracefully', () => {
      const pattern = memory.capture({
        title: 'Minimal',
        description: 'Minimal pattern',
      });

      expect(pattern.context.agents_involved).toEqual([]);
      expect(pattern.context.related_stories).toEqual([]);
      expect(pattern.context.related_epics).toEqual([]);
      expect(pattern.context.business_domain).toBeNull();
      expect(pattern.outcome).toBeNull();
      expect(pattern.learned_pattern).toBeNull();
      expect(pattern.tags).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  3. query() — Filtering
  // ═══════════════════════════════════════════════════════════════════════════

  describe('query', () => {
    beforeEach(() => {
      memory.capture({
        title: 'Strategy A',
        description: 'Our vision for the year',
        category: BusinessCategory.STRATEGY,
        importance: 'high',
        context: { agents_involved: ['@architect'] },
      });
      memory.capture({
        title: 'Delegation B',
        description: 'Delegate code review',
        category: BusinessCategory.DELEGATION,
        importance: 'medium',
        context: { agents_involved: ['@dev'] },
      });
      memory.capture({
        title: 'Feedback C',
        description: 'Feedback on sprint',
        category: BusinessCategory.FEEDBACK,
        importance: 'low',
        context: { agents_involved: ['@qa'] },
      });
      memory.capture({
        title: 'Decision D',
        description: 'Decided on React',
        category: BusinessCategory.DECISION,
        importance: 'high',
        context: { agents_involved: ['@architect', '@dev'] },
      });
    });

    test('should list all patterns when no filters provided', () => {
      const results = memory.query();
      expect(results).toHaveLength(4);
    });

    test('should filter by category', () => {
      const results = memory.query({ category: BusinessCategory.STRATEGY });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Strategy A');
    });

    test('should filter by importance', () => {
      const results = memory.query({ importance: Importance.HIGH });
      expect(results).toHaveLength(2);
      const titles = results.map((p) => p.title);
      expect(titles).toContain('Strategy A');
      expect(titles).toContain('Decision D');
    });

    test('should filter unresolved only', () => {
      // Resolve one pattern
      const allPatterns = memory.query();
      memory.resolvePattern(allPatterns[0].id);

      const unresolvedResults = memory.query({ unresolved: true });
      expect(unresolvedResults).toHaveLength(3);
    });

    test('should filter by agent involved', () => {
      const results = memory.query({ agent: '@dev' });
      expect(results).toHaveLength(2);
      const titles = results.map((p) => p.title);
      expect(titles).toContain('Delegation B');
      expect(titles).toContain('Decision D');
    });

    test('should sort by importance (high first) then by recency', () => {
      const results = memory.query();

      expect(results).toHaveLength(4);

      // Verify correct importance ordering: high < medium < low
      // Within same importance, most recent first
      const importances = results.map((p) => p.importance);
      const firstHighIdx = importances.indexOf('high');
      const firstMediumIdx = importances.indexOf('medium');
      const firstLowIdx = importances.indexOf('low');

      // high patterns should appear before medium, medium before low
      if (firstHighIdx !== -1 && firstMediumIdx !== -1) {
        expect(firstHighIdx).toBeLessThan(firstMediumIdx);
      }
      if (firstMediumIdx !== -1 && firstLowIdx !== -1) {
        expect(firstMediumIdx).toBeLessThan(firstLowIdx);
      }

      // All results should have valid importance values
      for (const pattern of results) {
        expect(['high', 'medium', 'low']).toContain(pattern.importance);
      }
    });

    test('should combine multiple filters', () => {
      const results = memory.query({
        importance: Importance.HIGH,
        agent: '@architect',
      });
      expect(results).toHaveLength(2);
    });

    test('should filter by tags', () => {
      memory.capture({
        title: 'Tagged pattern',
        description: 'A tagged business insight',
        category: BusinessCategory.INSIGHT,
        tags: ['sprint-review', 'performance'],
      });

      const results = memory.query({ tags: ['sprint-review'] });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Tagged pattern');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  4. getRelevant() — Context Injection
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getRelevant', () => {
    beforeEach(() => {
      memory.capture({
        title: 'Roadmap strategy',
        description: 'Focus on AI integrations for Q1 roadmap',
        category: BusinessCategory.STRATEGY,
        importance: 'high',
        context: { agents_involved: ['@architect'] },
        tags: ['q1', 'ai'],
      });
      memory.capture({
        title: 'Sprint feedback',
        description: 'Quality of code review was excellent in sprint 5',
        category: BusinessCategory.FEEDBACK,
        importance: 'medium',
        context: { agents_involved: ['@qa'] },
        tags: ['sprint-5'],
      });
      memory.capture({
        title: 'Code style preference',
        description: 'Always prefer functional approach with TypeScript',
        category: BusinessCategory.PREFERENCE,
        importance: 'medium',
        tags: ['typescript', 'code-style'],
      });
      memory.capture({
        title: 'Delegation to dev',
        description: 'Delegate refactoring tasks to @dev agent',
        category: BusinessCategory.DELEGATION,
        importance: 'low',
        context: { agents_involved: ['@dev'] },
      });
    });

    test('should return relevant patterns for business context', () => {
      const results = memory.getRelevant('planning the Q1 roadmap and strategy');
      expect(results.length).toBeGreaterThan(0);

      // The strategy pattern should be highly relevant
      const strategyResult = results.find((r) => r.title === 'Roadmap strategy');
      expect(strategyResult).toBeDefined();
    });

    test('should score based on category match', () => {
      // Context about strategy should rank strategy patterns higher
      const results = memory.getRelevant('our strategic vision and roadmap goals');
      const strategyResult = results.find((r) => r.title === 'Roadmap strategy');
      expect(strategyResult).toBeDefined();
      expect(strategyResult.relevanceScore).toBeGreaterThanOrEqual(3);
    });

    test('should score based on keyword matches', () => {
      const results = memory.getRelevant('AI integrations for the roadmap');
      const matched = results.find((r) => r.title === 'Roadmap strategy');
      expect(matched).toBeDefined();
      // Should have keyword matches boosting the score
      expect(matched.relevanceScore).toBeGreaterThan(0);
    });

    test('should score based on agent matches', () => {
      const results = memory.getRelevant('planning architecture', ['@architect']);
      const architectResult = results.find((r) => r.title === 'Roadmap strategy');
      expect(architectResult).toBeDefined();
      // Agent match adds +2 to relevance
      expect(architectResult.relevanceScore).toBeGreaterThanOrEqual(2);
    });

    test('should return max 10 results sorted by relevance', () => {
      // Add many patterns
      for (let i = 0; i < 15; i++) {
        memory.capture({
          title: `Strategy item ${i}`,
          description: `Strategic planning item ${i} about vision and roadmap`,
          category: BusinessCategory.STRATEGY,
          importance: 'medium',
        });
      }

      const results = memory.getRelevant('strategic vision planning roadmap');
      expect(results.length).toBeLessThanOrEqual(10);

      // Verify sorted by relevance (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].relevanceScore).toBeGreaterThanOrEqual(
          results[i].relevanceScore,
        );
      }
    });

    test('should emit CONTEXT_INJECTED event', () => {
      const handler = jest.fn();
      memory.on(Events.CONTEXT_INJECTED, handler);

      memory.getRelevant('planning the roadmap strategy');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'planning the roadmap strategy',
          patternsCount: expect.any(Number),
        }),
      );
    });

    test('should not emit CONTEXT_INJECTED when no results found', () => {
      const handler = jest.fn();
      memory.on(Events.CONTEXT_INJECTED, handler);

      // Use a context completely unrelated to any pattern
      const emptyMemory = new JarvisBusinessMemory(
        fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-empty-')),
        { quiet: true },
      );
      emptyMemory.getRelevant('completely unrelated xyz123');

      expect(handler).not.toHaveBeenCalled();
    });

    test('should skip resolved patterns', () => {
      const allPatterns = memory.query();
      memory.resolvePattern(allPatterns[0].id);

      const results = memory.getRelevant('strategic roadmap vision planning');
      const resolvedInResults = results.find((r) => r.id === allPatterns[0].id);
      expect(resolvedInResults).toBeUndefined();
    });

    test('should boost preference patterns', () => {
      const results = memory.getRelevant('typescript functional code approach');
      const prefResult = results.find((r) => r.title === 'Code style preference');
      expect(prefResult).toBeDefined();
      // Preference patterns get a +1 boost
      expect(prefResult.relevanceScore).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  5. search()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('search', () => {
    beforeEach(() => {
      memory.capture({
        title: 'Deploy pipeline',
        description: 'Setup CI/CD pipeline for production deployments',
        category: BusinessCategory.DECISION,
        tags: ['cicd', 'infrastructure'],
      });
      memory.capture({
        title: 'Team restructuring',
        description: 'Moving to squad-based team structure',
        category: BusinessCategory.STRATEGY,
        tags: ['team', 'organization'],
      });
      memory.capture({
        title: 'Code review process',
        description: 'Implement peer code review for all PRs',
        category: BusinessCategory.PREFERENCE,
        tags: ['quality', 'process'],
      });
    });

    test('should find patterns by keyword in title', () => {
      const results = memory.search('pipeline');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Deploy pipeline');
    });

    test('should find patterns by keyword in description', () => {
      const results = memory.search('squad-based');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Team restructuring');
    });

    test('should search case-insensitively', () => {
      const results = memory.search('PIPELINE');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Deploy pipeline');
    });

    test('should return empty array for no matches', () => {
      const results = memory.search('xyznonexistent123');
      expect(results).toEqual([]);
    });

    test('should search in tags', () => {
      const results = memory.search('cicd');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Deploy pipeline');
    });

    test('should search in category field', () => {
      const results = memory.search('preference');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Code review process');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  6. summarize()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('summarize', () => {
    beforeEach(() => {
      memory.capture({
        title: 'Decision 1',
        description: 'Decided to use React',
        category: BusinessCategory.DECISION,
        importance: 'high',
        outcome: 'Team adopted React successfully',
      });
      memory.capture({
        title: 'Preference 1',
        description: 'Always use TypeScript',
        category: BusinessCategory.PREFERENCE,
        importance: 'medium',
      });
      memory.capture({
        title: 'Strategy 1',
        description: 'Focus on AI vision for this quarter',
        category: BusinessCategory.STRATEGY,
        importance: 'high',
      });
      memory.capture({
        title: 'Decision 2',
        description: 'Choose PostgreSQL over MongoDB',
        category: BusinessCategory.DECISION,
        importance: 'medium',
      });
    });

    test('should generate summary for 24h timeRange', () => {
      const summary = memory.summarize('24h');

      expect(summary.timeRange).toBe('24h');
      expect(summary.generatedAt).toBeDefined();
      expect(summary.totalPatterns).toBe(4);
    });

    test('should group by category', () => {
      const summary = memory.summarize('24h');

      expect(summary.byCategory).toHaveProperty(BusinessCategory.DECISION);
      expect(summary.byCategory[BusinessCategory.DECISION]).toBe(2);
      expect(summary.byCategory[BusinessCategory.PREFERENCE]).toBe(1);
      expect(summary.byCategory[BusinessCategory.STRATEGY]).toBe(1);
    });

    test('should include recent decisions', () => {
      const summary = memory.summarize('24h');

      expect(summary.recentDecisions).toHaveLength(2);
      expect(summary.recentDecisions[0]).toHaveProperty('title');
      expect(summary.recentDecisions[0]).toHaveProperty('importance');
      expect(summary.recentDecisions[0]).toHaveProperty('created_at');
    });

    test('should include active preferences', () => {
      const summary = memory.summarize('24h');

      expect(summary.activePreferences).toHaveLength(1);
      expect(summary.activePreferences[0].title).toBe('Preference 1');
    });

    test('should include pending follow-ups (patterns without outcome)', () => {
      const summary = memory.summarize('24h');

      // Patterns without outcome and not resolved
      expect(summary.pendingFollowUps.length).toBeGreaterThan(0);
      for (const followUp of summary.pendingFollowUps) {
        expect(followUp).toHaveProperty('title');
        expect(followUp).toHaveProperty('category');
        expect(followUp).toHaveProperty('importance');
      }
    });

    test('should emit SUMMARY_GENERATED event', () => {
      const handler = jest.fn();
      memory.on(Events.SUMMARY_GENERATED, handler);

      memory.summarize('7d');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          timeRange: '7d',
          totalPatterns: expect.any(Number),
        }),
      );
    });

    test('should handle "all" timeRange', () => {
      const summary = memory.summarize('all');
      expect(summary.timeRange).toBe('all');
      expect(summary.totalPatterns).toBe(4);
    });

    test('should default to 24h when invalid timeRange provided', () => {
      const summary = memory.summarize('invalid');
      // _parseTimeRange returns 24h ms for unknown values
      expect(summary.timeRange).toBe('invalid');
      expect(summary.totalPatterns).toBeGreaterThanOrEqual(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  7. resolvePattern()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('resolvePattern', () => {
    test('should mark pattern as resolved', () => {
      const pattern = memory.capture({
        title: 'To resolve',
        description: 'Pattern that needs resolution',
      });

      const resolved = memory.resolvePattern(pattern.id);

      expect(resolved.resolved).toBe(true);
      expect(resolved.resolvedBy).toBe('manual');
    });

    test('should set resolvedAt timestamp', () => {
      const pattern = memory.capture({
        title: 'Timestamped resolve',
        description: 'Check resolvedAt',
      });

      const before = new Date().toISOString();
      const resolved = memory.resolvePattern(pattern.id);
      const after = new Date().toISOString();

      expect(resolved.resolvedAt).toBeDefined();
      expect(resolved.resolvedAt >= before).toBe(true);
      expect(resolved.resolvedAt <= after).toBe(true);
    });

    test('should return null for non-existent ID', () => {
      const result = memory.resolvePattern('biz-nonexistent-id');
      expect(result).toBeNull();
    });

    test('should emit PATTERN_RESOLVED event', () => {
      const handler = jest.fn();
      memory.on(Events.PATTERN_RESOLVED, handler);

      const pattern = memory.capture({
        title: 'Event resolve test',
        description: 'Testing resolve event',
      });

      memory.resolvePattern(pattern.id);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: pattern.id,
          resolved: true,
        }),
      );
    });

    test('should accept custom resolvedBy value', () => {
      const pattern = memory.capture({
        title: 'Custom resolver',
        description: 'Resolved by automation',
      });

      const resolved = memory.resolvePattern(pattern.id, 'automation');
      expect(resolved.resolvedBy).toBe('automation');
    });

    test('should persist resolved state to disk', () => {
      const pattern = memory.capture({
        title: 'Persist resolve',
        description: 'Should persist',
      });

      memory.resolvePattern(pattern.id);

      // Reload from disk
      const mem2 = new JarvisBusinessMemory(testDir, { quiet: true });
      const reloaded = mem2.patterns.get(pattern.id);
      expect(reloaded.resolved).toBe(true);
      expect(reloaded.resolvedAt).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  8. Auto-capture (trackDelegation)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('trackDelegation', () => {
    test('should track delegation patterns', () => {
      const result = memory.trackDelegation({
        description: 'review pull requests',
        agent: '@dev',
        domain: 'code-quality',
      });

      // First occurrence should not trigger auto-capture
      expect(result).toBeNull();
      expect(memory.delegationTracking.size).toBe(1);
    });

    test('should auto-capture when threshold reached (3 times)', () => {
      const delegationData = {
        description: 'review pull requests',
        agent: '@dev',
        domain: 'code-quality',
      };

      // Track below threshold
      memory.trackDelegation(delegationData);
      memory.trackDelegation(delegationData);
      expect(memory.patterns.size).toBe(0);

      // Track at threshold
      const result = memory.trackDelegation(delegationData);

      expect(result).not.toBeNull();
      expect(result.category).toBe(BusinessCategory.DELEGATION);
      expect(result.source.type).toBe('auto_detected');
      expect(result.tags).toContain('auto-detected');
      expect(result.tags).toContain('delegation-preference');
      expect(result.learned_pattern).toContain('review pull requests');
    });

    test('should NOT auto-capture if already captured', () => {
      const delegationData = {
        description: 'review pull requests',
        agent: '@dev',
        domain: 'code-quality',
      };

      // Reach threshold and auto-capture
      memory.trackDelegation(delegationData);
      memory.trackDelegation(delegationData);
      const firstCapture = memory.trackDelegation(delegationData);
      expect(firstCapture).not.toBeNull();

      // Track again beyond threshold — should NOT create duplicate
      const secondCapture = memory.trackDelegation(delegationData);
      expect(secondCapture).toBeNull();

      // Only one auto-detected pattern should exist
      const autoPatterns = [...memory.patterns.values()].filter(
        (p) => p.source.type === 'auto_detected',
      );
      expect(autoPatterns).toHaveLength(1);
    });

    test('should detect category from delegation description', () => {
      const delegationData = {
        description: 'plan the strategic roadmap direction',
        agent: '@pm',
      };

      // Reach threshold
      memory.trackDelegation(delegationData);
      memory.trackDelegation(delegationData);
      const result = memory.trackDelegation(delegationData);

      expect(result).not.toBeNull();
      // The category in the tracking should be strategy-related
      // but the auto-capture always sets BusinessCategory.DELEGATION for the pattern
      expect(result.category).toBe(BusinessCategory.DELEGATION);
    });

    test('should emit PATTERN_CAPTURED event on auto-capture', () => {
      const handler = jest.fn();
      memory.on(Events.PATTERN_CAPTURED, handler);

      const delegationData = {
        description: 'run automated tests',
        agent: '@qa',
      };

      memory.trackDelegation(delegationData);
      memory.trackDelegation(delegationData);
      memory.trackDelegation(delegationData);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('should save delegation tracking to disk', () => {
      memory.trackDelegation({
        description: 'deploy services',
        agent: '@devops',
      });

      expect(fs.existsSync(memory.delegationTrackingPath)).toBe(true);

      const data = JSON.parse(
        fs.readFileSync(memory.delegationTrackingPath, 'utf-8'),
      );
      expect(data.delegations).toBeDefined();
      expect(Object.keys(data.delegations).length).toBe(1);
    });

    test('should work with custom repeat threshold', () => {
      const customMemory = new JarvisBusinessMemory(
        fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-custom-')),
        { repeatThreshold: 2, quiet: true },
      );

      const delegationData = {
        description: 'manage database migrations',
        agent: '@data-engineer',
      };

      customMemory.trackDelegation(delegationData);
      const result = customMemory.trackDelegation(delegationData);

      expect(result).not.toBeNull();
      expect(result.source.type).toBe('auto_detected');
    });

    test('should include agent in learned_pattern when provided', () => {
      const delegationData = {
        description: 'handle security audits',
        agent: '@security-expert',
      };

      memory.trackDelegation(delegationData);
      memory.trackDelegation(delegationData);
      const result = memory.trackDelegation(delegationData);

      expect(result.learned_pattern).toContain('@security-expert');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  9. formatForPrompt()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('formatForPrompt', () => {
    test('should format patterns for prompt injection', () => {
      const patterns = [
        memory.capture({
          title: 'Important decision',
          description: 'We chose PostgreSQL for the database',
          category: BusinessCategory.DECISION,
          importance: 'high',
          outcome: 'Team adopted PostgreSQL',
          learned_pattern: 'PostgreSQL scales well for our use case',
          context: { agents_involved: ['@architect', '@data-engineer'] },
        }),
      ];

      const prompt = memory.formatForPrompt(patterns);

      expect(prompt).toContain('## Business Context (From Memory)');
      expect(prompt).toContain('[HIGH]');
      expect(prompt).toContain('Important decision');
      expect(prompt).toContain('Decision');
      expect(prompt).toContain('We chose PostgreSQL for the database');
      expect(prompt).toContain('**Outcome:** Team adopted PostgreSQL');
      expect(prompt).toContain('**Learned Pattern:** PostgreSQL scales well for our use case');
      expect(prompt).toContain('**Agents:** @architect, @data-engineer');
    });

    test('should return empty string for empty array', () => {
      expect(memory.formatForPrompt([])).toBe('');
      expect(memory.formatForPrompt(null)).toBe('');
      expect(memory.formatForPrompt(undefined)).toBe('');
    });

    test('should include importance labels for all levels', () => {
      const highPattern = memory.capture({
        title: 'High',
        description: 'High importance',
        importance: 'high',
      });
      const medPattern = memory.capture({
        title: 'Medium',
        description: 'Medium importance',
        importance: 'medium',
      });
      const lowPattern = memory.capture({
        title: 'Low',
        description: 'Low importance',
        importance: 'low',
      });

      const prompt = memory.formatForPrompt([highPattern, medPattern, lowPattern]);

      expect(prompt).toContain('[HIGH]');
      expect(prompt).toContain('[MEDIUM]');
      expect(prompt).toContain('[LOW]');
    });

    test('should handle patterns without optional fields', () => {
      const minimalPattern = memory.capture({
        title: 'Minimal',
        description: 'Just the basics',
      });

      const prompt = memory.formatForPrompt([minimalPattern]);

      expect(prompt).toContain('Minimal');
      expect(prompt).toContain('Just the basics');
      // Should not contain outcome or learned pattern sections
      expect(prompt).not.toContain('**Outcome:**');
      expect(prompt).not.toContain('**Learned Pattern:**');
    });

    test('should format multiple patterns sequentially', () => {
      const p1 = memory.capture({ title: 'First', description: 'First pattern' });
      const p2 = memory.capture({ title: 'Second', description: 'Second pattern' });
      const p3 = memory.capture({ title: 'Third', description: 'Third pattern' });

      const prompt = memory.formatForPrompt([p1, p2, p3]);

      const firstIndex = prompt.indexOf('First');
      const secondIndex = prompt.indexOf('Second');
      const thirdIndex = prompt.indexOf('Third');

      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  10. Statistics & Export
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getStatistics', () => {
    test('should return correct counts for empty memory', () => {
      const stats = memory.getStatistics();

      expect(stats.totalPatterns).toBe(0);
      expect(stats.resolved).toBe(0);
      expect(stats.unresolved).toBe(0);
      expect(stats.withOutcome).toBe(0);
      expect(stats.withLearnedPattern).toBe(0);
      expect(stats.trackedDelegations).toBe(0);
    });

    test('should return correct counts after captures', () => {
      memory.capture({
        title: 'Pattern 1',
        description: 'First strategy pattern',
        category: BusinessCategory.STRATEGY,
        importance: 'high',
        outcome: 'Positive outcome',
        learned_pattern: 'Early planning helps',
      });
      memory.capture({
        title: 'Pattern 2',
        description: 'Second decision pattern',
        category: BusinessCategory.DECISION,
        importance: 'medium',
      });
      memory.capture({
        title: 'Pattern 3',
        description: 'Third feedback pattern',
        category: BusinessCategory.FEEDBACK,
        importance: 'low',
      });

      // Resolve one pattern
      const allPatterns = memory.query();
      memory.resolvePattern(allPatterns[0].id);

      // Track a delegation
      memory.trackDelegation({
        description: 'test delegation',
        agent: '@dev',
      });

      const stats = memory.getStatistics();

      expect(stats.totalPatterns).toBe(3);
      expect(stats.resolved).toBe(1);
      expect(stats.unresolved).toBe(2);
      expect(stats.withOutcome).toBe(1);
      expect(stats.withLearnedPattern).toBe(1);
      expect(stats.byCategory[BusinessCategory.STRATEGY]).toBe(1);
      expect(stats.byCategory[BusinessCategory.DECISION]).toBe(1);
      expect(stats.byCategory[BusinessCategory.FEEDBACK]).toBe(1);
      expect(stats.byImportance.high).toBe(1);
      expect(stats.byImportance.medium).toBe(1);
      expect(stats.byImportance.low).toBe(1);
      expect(stats.bySource.ceo_input).toBe(3);
      expect(stats.trackedDelegations).toBe(1);
    });
  });

  describe('toJSON', () => {
    test('should export valid structure', () => {
      memory.capture({
        title: 'Export test',
        description: 'Pattern for JSON export',
        category: BusinessCategory.INSIGHT,
      });

      const json = memory.toJSON();

      expect(json.schema).toBe(CONFIG.schemaVersion);
      expect(json.version).toBe(CONFIG.version);
      expect(json.projectId).toBeDefined();
      expect(json.lastUpdated).toBeDefined();
      expect(json.statistics).toBeDefined();
      expect(json.statistics.totalPatterns).toBe(1);
      expect(json.patterns).toHaveLength(1);
      expect(json.patterns[0].title).toBe('Export test');
    });

    test('should include all pattern fields in export', () => {
      memory.capture({
        title: 'Full pattern',
        description: 'Complete pattern for export',
        category: BusinessCategory.STRATEGY,
        importance: 'high',
        context: {
          agents_involved: ['@dev'],
          business_domain: 'tech',
        },
        outcome: 'Success',
        learned_pattern: 'Planning works',
        tags: ['export', 'test'],
      });

      const json = memory.toJSON();
      const pattern = json.patterns[0];

      expect(pattern.id).toMatch(/^biz-/);
      expect(pattern.title).toBe('Full pattern');
      expect(pattern.description).toBe('Complete pattern for export');
      expect(pattern.category).toBe(BusinessCategory.STRATEGY);
      expect(pattern.importance).toBe(Importance.HIGH);
      expect(pattern.context.agents_involved).toEqual(['@dev']);
      expect(pattern.outcome).toBe('Success');
      expect(pattern.learned_pattern).toBe('Planning works');
      expect(pattern.tags).toEqual(['export', 'test']);
      expect(pattern.source.type).toBe('ceo_input');
      expect(pattern.resolved).toBe(false);
      expect(pattern.created_at).toBeDefined();
    });
  });

  describe('toMarkdown', () => {
    test('should generate valid markdown', () => {
      memory.capture({
        title: 'Strategy item',
        description: 'A strategic decision',
        category: BusinessCategory.STRATEGY,
        importance: 'high',
      });
      memory.capture({
        title: 'Decision item',
        description: 'A key decision',
        category: BusinessCategory.DECISION,
        importance: 'medium',
      });

      const md = memory.toMarkdown();

      expect(md).toContain('# Jarvis Business Memory');
      expect(md).toContain('## Strategy');
      expect(md).toContain('## Decision');
      expect(md).toContain('Strategy item');
      expect(md).toContain('Decision item');
      expect(md).toContain('## Statistics');
      expect(md).toContain('Total Patterns');
      expect(md).toContain('| 2 |');
      expect(md).toContain(`Generated by AIOS Jarvis Business Memory v${CONFIG.version}`);
    });

    test('should generate markdown with empty memory', () => {
      const md = memory.toMarkdown();

      expect(md).toContain('# Jarvis Business Memory');
      expect(md).toContain('Total: 0 (0 active)');
      expect(md).toContain('## Statistics');
    });

    test('should include resolved state in markdown', () => {
      const pattern = memory.capture({
        title: 'Resolved item',
        description: 'Will be resolved',
        category: BusinessCategory.DECISION,
      });
      memory.resolvePattern(pattern.id);

      const md = memory.toMarkdown();

      expect(md).toContain('(RESOLVED)');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Additional: updatePattern & removePattern
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updatePattern', () => {
    test('should update allowed fields', () => {
      const pattern = memory.capture({
        title: 'Original title',
        description: 'Original description',
        category: BusinessCategory.GENERAL,
      });

      const updated = memory.updatePattern(pattern.id, {
        title: 'Updated title',
        description: 'Updated description',
        importance: Importance.HIGH,
        outcome: 'Resolved successfully',
      });

      expect(updated.title).toBe('Updated title');
      expect(updated.description).toBe('Updated description');
      expect(updated.importance).toBe(Importance.HIGH);
      expect(updated.outcome).toBe('Resolved successfully');
    });

    test('should return null for non-existent ID', () => {
      const result = memory.updatePattern('biz-nonexistent', { title: 'nope' });
      expect(result).toBeNull();
    });

    test('should emit PATTERN_UPDATED event', () => {
      const handler = jest.fn();
      memory.on(Events.PATTERN_UPDATED, handler);

      const pattern = memory.capture({
        title: 'Event update test',
        description: 'Testing update event',
      });

      memory.updatePattern(pattern.id, { title: 'Updated' });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('removePattern', () => {
    test('should remove existing pattern', () => {
      const pattern = memory.capture({
        title: 'To remove',
        description: 'Will be removed',
      });

      const result = memory.removePattern(pattern.id);

      expect(result).toBe(true);
      expect(memory.patterns.has(pattern.id)).toBe(false);
      expect(memory.patterns.size).toBe(0);
    });

    test('should return false for non-existent ID', () => {
      const result = memory.removePattern('biz-nonexistent');
      expect(result).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Edge Cases & Robustness
  // ═══════════════════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    test('should handle corrupted JSON file gracefully on init', () => {
      // Write corrupted JSON
      const dir = path.join(testDir, '.aios', 'jarvis');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'business-memory.json'),
        'NOT VALID JSON {{{',
        'utf-8',
      );

      // Should not throw — just log warning
      const mem = new JarvisBusinessMemory(testDir, { quiet: true });
      expect(mem.patterns.size).toBe(0);
    });

    test('should handle corrupted delegation tracking file gracefully', () => {
      const dir = path.join(testDir, '.aios', 'jarvis');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'delegation-tracking.json'),
        'BROKEN JSON',
        'utf-8',
      );

      const mem = new JarvisBusinessMemory(testDir, { quiet: true });
      expect(mem.delegationTracking.size).toBe(0);
    });

    test('should handle 100 captures without corruption', () => {
      for (let i = 0; i < 100; i++) {
        memory.capture({
          title: `Pattern ${i}`,
          description: `Description for pattern ${i}`,
          category: Object.values(BusinessCategory)[i % 7],
          importance: ['high', 'medium', 'low'][i % 3],
        });
      }

      expect(memory.patterns.size).toBe(100);

      // Verify data persisted correctly
      const mem2 = new JarvisBusinessMemory(testDir, { quiet: true });
      expect(mem2.patterns.size).toBe(100);
    });

    test('should detect general category when no keywords match', () => {
      const pattern = memory.capture({
        title: 'Xyz abc',
        description: 'Completely unrelated words with no keyword matches',
      });

      expect(pattern.category).toBe(BusinessCategory.GENERAL);
    });
  });
});
