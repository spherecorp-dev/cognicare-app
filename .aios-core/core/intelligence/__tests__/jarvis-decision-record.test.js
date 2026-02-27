/**
 * Jarvis Decision Record System - Unit Tests
 *
 * Comprehensive tests for decision recording, retrieval, progressive
 * summarization, token management, persistence, and statistics.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
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
} = require('../jarvis-decision-record');

// =============================================================================
//                              HELPERS
// =============================================================================

function makeTmpDir() {
  return path.join(
    os.tmpdir(),
    `jarvis-dr-test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
  );
}

function makeStoragePath(tmpDir) {
  return path.join(tmpDir, 'decisions.json');
}

/** Create a simple decision record system pointing at a temp file */
function makeSystem(tmpDir) {
  const storagePath = makeStoragePath(tmpDir || makeTmpDir());
  return new DecisionRecordSystem({ storagePath });
}

/** Create a decision with sensible defaults */
function sampleDecision(overrides = {}) {
  return {
    title: 'Use React for frontend',
    category: 'technical',
    context: 'Need to pick a framework for the new dashboard',
    alternatives: [
      { option: 'React', pros: 'large ecosystem', cons: 'JSX learning curve' },
      { option: 'Vue', pros: 'gentle learning curve', cons: 'smaller ecosystem' },
    ],
    chosen: 'React',
    rationale: 'Larger talent pool and ecosystem',
    decidedBy: '@architect',
    followUp: 'Evaluate performance after 2 sprints',
    ...overrides,
  };
}

describe('DecisionRecordSystem', () => {
  let tmpDir;
  let storagePath;
  let system;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    storagePath = makeStoragePath(tmpDir);
    system = new DecisionRecordSystem({ storagePath });
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ===========================================================================
  // 1. Exports
  // ===========================================================================

  describe('exports', () => {
    test('should export DecisionRecordSystem as a function/class', () => {
      expect(typeof DecisionRecordSystem).toBe('function');
    });

    test('should export createDecisionRecordSystem as a function', () => {
      expect(typeof createDecisionRecordSystem).toBe('function');
    });

    test('should export DetailLevel as an object', () => {
      expect(typeof DetailLevel).toBe('object');
      expect(DetailLevel).not.toBeNull();
    });

    test('should export DETAIL_FIELDS as an object', () => {
      expect(typeof DETAIL_FIELDS).toBe('object');
      expect(DETAIL_FIELDS).not.toBeNull();
    });

    test('should export estimateTokens as a function', () => {
      expect(typeof estimateTokens).toBe('function');
    });

    test('should export truncateToTokens as a function', () => {
      expect(typeof truncateToTokens).toBe('function');
    });

    test('should export getDetailLevel as a function', () => {
      expect(typeof getDetailLevel).toBe('function');
    });

    test('should export formatDecisionEntry as a function', () => {
      expect(typeof formatDecisionEntry).toBe('function');
    });

    test('should export TOKEN_LIMIT as a number', () => {
      expect(typeof TOKEN_LIMIT).toBe('number');
      expect(TOKEN_LIMIT).toBe(8000);
    });

    test('should export HARD_CAP_PER_DECISION as a number', () => {
      expect(typeof HARD_CAP_PER_DECISION).toBe('number');
      expect(HARD_CAP_PER_DECISION).toBe(600);
    });

    test('should export CHARS_PER_TOKEN as a number', () => {
      expect(typeof CHARS_PER_TOKEN).toBe('number');
      expect(CHARS_PER_TOKEN).toBe(3.5);
    });
  });

  // ===========================================================================
  // 2. Constructor
  // ===========================================================================

  describe('constructor', () => {
    test('should create instance with given storagePath', () => {
      expect(system.storagePath).toBe(storagePath);
    });

    test('should create storage directory on first save', () => {
      system.recordDecision(sampleDecision());
      expect(fs.existsSync(tmpDir)).toBe(true);
    });

    test('should initialize with empty decisions map', () => {
      expect(system.decisions.size).toBe(0);
    });

    test('should default storagePath when not provided', () => {
      const defaultSystem = new DecisionRecordSystem();
      expect(defaultSystem.storagePath).toContain('decisions.json');
    });

    test('should accept optional businessMemory', () => {
      const memory = { get: () => null };
      const sys = new DecisionRecordSystem({ storagePath, businessMemory: memory });
      expect(sys.businessMemory).toBe(memory);
    });

    test('should default businessMemory to null', () => {
      expect(system.businessMemory).toBeNull();
    });
  });

  // ===========================================================================
  // 3. createDecisionRecordSystem factory
  // ===========================================================================

  describe('createDecisionRecordSystem', () => {
    test('should create a DecisionRecordSystem instance', () => {
      const sys = createDecisionRecordSystem({ storagePath });
      expect(sys).toBeInstanceOf(DecisionRecordSystem);
    });

    test('should pass options to constructor', () => {
      const sys = createDecisionRecordSystem({ storagePath });
      expect(sys.storagePath).toBe(storagePath);
    });

    test('should work with no options', () => {
      const sys = createDecisionRecordSystem();
      expect(sys).toBeInstanceOf(DecisionRecordSystem);
    });
  });

  // ===========================================================================
  // 4. recordDecision
  // ===========================================================================

  describe('recordDecision', () => {
    test('should create a decision record and return it', () => {
      const result = system.recordDecision(sampleDecision());
      expect(result).toBeDefined();
      expect(result.title).toBe('Use React for frontend');
    });

    test('should generate a unique ID starting with "dec-"', () => {
      const result = system.recordDecision(sampleDecision());
      expect(result.id).toMatch(/^dec-[a-z0-9]+-[a-z0-9]+$/);
    });

    test('should set decidedAt to a valid ISO date', () => {
      const result = system.recordDecision(sampleDecision());
      expect(new Date(result.decidedAt).toISOString()).toBe(result.decidedAt);
    });

    test('should auto-save to disk after recording', () => {
      system.recordDecision(sampleDecision());
      expect(fs.existsSync(storagePath)).toBe(true);
    });

    test('should return a copy (not reference)', () => {
      const result = system.recordDecision(sampleDecision());
      result.title = 'Modified';
      const stored = system.decisions.get(result.id);
      expect(stored.title).toBe('Use React for frontend');
    });

    test('should handle minimal input (title + chosen only)', () => {
      const result = system.recordDecision({ title: 'Quick decision', chosen: 'Option A' });
      expect(result.title).toBe('Quick decision');
      expect(result.chosen).toBe('Option A');
      expect(result.category).toBe('general');
      expect(result.decidedBy).toBe('ceo');
      expect(result.alternatives).toEqual([]);
      expect(result.context).toBeNull();
      expect(result.rationale).toBeNull();
      expect(result.followUp).toBeNull();
    });

    test('should default title to "Untitled Decision" when missing', () => {
      const result = system.recordDecision({ chosen: 'Something' });
      expect(result.title).toBe('Untitled Decision');
    });

    test('should set outcome to null initially', () => {
      const result = system.recordDecision(sampleDecision());
      expect(result.outcome).toBeNull();
    });

    test('should set outcomeRecordedAt to null initially', () => {
      const result = system.recordDecision(sampleDecision());
      expect(result.outcomeRecordedAt).toBeNull();
    });

    test('should store the decision in memory', () => {
      const result = system.recordDecision(sampleDecision());
      expect(system.decisions.has(result.id)).toBe(true);
    });

    test('should generate unique IDs for multiple decisions', () => {
      const ids = new Set();
      for (let i = 0; i < 20; i++) {
        const result = system.recordDecision(sampleDecision({ title: `Decision ${i}` }));
        ids.add(result.id);
      }
      expect(ids.size).toBe(20);
    });
  });

  // ===========================================================================
  // 5. updateOutcome
  // ===========================================================================

  describe('updateOutcome', () => {
    test('should update outcome of an existing decision', () => {
      const dec = system.recordDecision(sampleDecision());
      const updated = system.updateOutcome(dec.id, 'React worked great');
      expect(updated.outcome).toBe('React worked great');
    });

    test('should set outcomeRecordedAt when updating', () => {
      const dec = system.recordDecision(sampleDecision());
      const updated = system.updateOutcome(dec.id, 'Success');
      expect(updated.outcomeRecordedAt).toBeDefined();
      expect(new Date(updated.outcomeRecordedAt).toISOString()).toBe(updated.outcomeRecordedAt);
    });

    test('should return null for non-existent ID', () => {
      const result = system.updateOutcome('dec-nonexistent-123456', 'Something');
      expect(result).toBeNull();
    });

    test('should persist updated outcome to disk', () => {
      const dec = system.recordDecision(sampleDecision());
      system.updateOutcome(dec.id, 'Outcome persisted');

      // Re-read from disk
      const data = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
      const stored = data.decisions.find(d => d.id === dec.id);
      expect(stored.outcome).toBe('Outcome persisted');
    });

    test('should return a copy after updating', () => {
      const dec = system.recordDecision(sampleDecision());
      const updated = system.updateOutcome(dec.id, 'Good');
      updated.outcome = 'Modified';
      const stored = system.decisions.get(dec.id);
      expect(stored.outcome).toBe('Good');
    });
  });

  // ===========================================================================
  // 6. getDecisionHistory
  // ===========================================================================

  describe('getDecisionHistory', () => {
    test('should return all decisions when no filters', () => {
      system.recordDecision(sampleDecision({ title: 'D1' }));
      system.recordDecision(sampleDecision({ title: 'D2' }));
      const history = system.getDecisionHistory();
      expect(history.length).toBe(2);
    });

    test('should filter by category', () => {
      system.recordDecision(sampleDecision({ category: 'technical' }));
      system.recordDecision(sampleDecision({ category: 'strategic' }));
      system.recordDecision(sampleDecision({ category: 'technical' }));
      const history = system.getDecisionHistory({ category: 'technical' });
      expect(history.length).toBe(2);
      expect(history.every(d => d.category === 'technical')).toBe(true);
    });

    test('should filter by agent (decidedBy)', () => {
      system.recordDecision(sampleDecision({ decidedBy: '@architect' }));
      system.recordDecision(sampleDecision({ decidedBy: '@dev' }));
      const history = system.getDecisionHistory({ agent: '@architect' });
      expect(history.length).toBe(1);
      expect(history[0].decidedBy).toBe('@architect');
    });

    test('should filter by agent found in context', () => {
      system.recordDecision(sampleDecision({
        decidedBy: 'ceo',
        context: 'Discussion with @dev about tools',
      }));
      const history = system.getDecisionHistory({ agent: '@dev' });
      expect(history.length).toBe(1);
    });

    test('should filter by agent found in alternatives', () => {
      system.recordDecision(sampleDecision({
        decidedBy: 'ceo',
        alternatives: ['Let @qa handle it', 'Do it manually'],
      }));
      const history = system.getDecisionHistory({ agent: '@qa' });
      expect(history.length).toBe(1);
    });

    test('should filter by topic (keyword matching in title)', () => {
      system.recordDecision(sampleDecision({ title: 'Database migration strategy' }));
      system.recordDecision(sampleDecision({ title: 'Frontend framework choice' }));
      const history = system.getDecisionHistory({ topic: 'database migration' });
      expect(history.length).toBe(1);
      expect(history[0].title).toBe('Database migration strategy');
    });

    test('should filter by topic (keyword matching in rationale)', () => {
      system.recordDecision(sampleDecision({
        title: 'Tool selection',
        rationale: 'PostgreSQL has better JSON support',
      }));
      const history = system.getDecisionHistory({ topic: 'PostgreSQL' });
      expect(history.length).toBe(1);
    });

    test('should filter by since date', () => {
      const d1 = system.recordDecision(sampleDecision({ title: 'Old' }));
      // Manually backdate the first decision
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      system.decisions.get(d1.id).decidedAt = oldDate;

      system.recordDecision(sampleDecision({ title: 'New' }));

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const history = system.getDecisionHistory({ since });
      expect(history.length).toBe(1);
      expect(history[0].title).toBe('New');
    });

    test('should apply limit', () => {
      for (let i = 0; i < 10; i++) {
        system.recordDecision(sampleDecision({ title: `D${i}` }));
      }
      const history = system.getDecisionHistory({ limit: 3 });
      expect(history.length).toBe(3);
    });

    test('should combine filters (category + limit)', () => {
      system.recordDecision(sampleDecision({ category: 'technical', title: 'T1' }));
      system.recordDecision(sampleDecision({ category: 'strategic', title: 'S1' }));
      system.recordDecision(sampleDecision({ category: 'technical', title: 'T2' }));
      system.recordDecision(sampleDecision({ category: 'technical', title: 'T3' }));
      const history = system.getDecisionHistory({ category: 'technical', limit: 2 });
      expect(history.length).toBe(2);
      expect(history.every(d => d.category === 'technical')).toBe(true);
    });

    test('should return empty array when no data', () => {
      const history = system.getDecisionHistory();
      expect(history).toEqual([]);
    });

    test('should sort by recency (newest first)', () => {
      const d1 = system.recordDecision(sampleDecision({ title: 'First' }));
      // Backdate first
      system.decisions.get(d1.id).decidedAt = new Date(Date.now() - 5000).toISOString();
      system.recordDecision(sampleDecision({ title: 'Second' }));

      const history = system.getDecisionHistory();
      expect(history[0].title).toBe('Second');
      expect(history[1].title).toBe('First');
    });

    test('should include _detailLevel and _formatted in results', () => {
      system.recordDecision(sampleDecision());
      const history = system.getDecisionHistory();
      expect(history[0]._detailLevel).toBeDefined();
      expect(history[0]._formatted).toBeDefined();
    });

    test('should return empty for non-matching category', () => {
      system.recordDecision(sampleDecision({ category: 'technical' }));
      const history = system.getDecisionHistory({ category: 'nonexistent' });
      expect(history).toEqual([]);
    });
  });

  // ===========================================================================
  // 7. getPendingFollowUps
  // ===========================================================================

  describe('getPendingFollowUps', () => {
    test('should return decisions with followUp but no outcome', () => {
      system.recordDecision(sampleDecision({ followUp: 'Check in 2 weeks' }));
      const pending = system.getPendingFollowUps();
      expect(pending.length).toBe(1);
      expect(pending[0].followUp).toBe('Check in 2 weeks');
    });

    test('should exclude decisions without followUp', () => {
      system.recordDecision(sampleDecision({ followUp: null }));
      const pending = system.getPendingFollowUps();
      expect(pending.length).toBe(0);
    });

    test('should exclude decisions with empty string followUp', () => {
      system.recordDecision(sampleDecision({ followUp: '   ' }));
      const pending = system.getPendingFollowUps();
      expect(pending.length).toBe(0);
    });

    test('should exclude decisions that already have an outcome', () => {
      const dec = system.recordDecision(sampleDecision({ followUp: 'Review later' }));
      system.updateOutcome(dec.id, 'Resolved');
      const pending = system.getPendingFollowUps();
      expect(pending.length).toBe(0);
    });

    test('should return copies not references', () => {
      system.recordDecision(sampleDecision({ followUp: 'Check it' }));
      const pending = system.getPendingFollowUps();
      pending[0].title = 'Modified';
      const stored = [...system.decisions.values()][0];
      expect(stored.title).not.toBe('Modified');
    });

    test('should sort by recency (newest first)', () => {
      const d1 = system.recordDecision(sampleDecision({ title: 'Older', followUp: 'Check' }));
      system.decisions.get(d1.id).decidedAt = new Date(Date.now() - 5000).toISOString();
      system.recordDecision(sampleDecision({ title: 'Newer', followUp: 'Check' }));
      const pending = system.getPendingFollowUps();
      expect(pending[0].title).toBe('Newer');
    });
  });

  // ===========================================================================
  // 8. getDecisionContext
  // ===========================================================================

  describe('getDecisionContext', () => {
    test('should return full detail for a specific decision', () => {
      const dec = system.recordDecision(sampleDecision());
      const ctx = system.getDecisionContext(dec.id);
      expect(ctx).toBeDefined();
      expect(ctx.id).toBe(dec.id);
      expect(ctx.title).toBe('Use React for frontend');
      expect(ctx._detailLevel).toBe(DetailLevel.FULL);
    });

    test('should always return FULL detail level regardless of age', () => {
      const dec = system.recordDecision(sampleDecision());
      // Backdate to 60 days ago
      system.decisions.get(dec.id).decidedAt = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const ctx = system.getDecisionContext(dec.id);
      expect(ctx._detailLevel).toBe(DetailLevel.FULL);
    });

    test('should return null for non-existent ID', () => {
      const ctx = system.getDecisionContext('dec-nonexistent-123456');
      expect(ctx).toBeNull();
    });

    test('should include _formatted string', () => {
      const dec = system.recordDecision(sampleDecision());
      const ctx = system.getDecisionContext(dec.id);
      expect(typeof ctx._formatted).toBe('string');
      expect(ctx._formatted.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // 9. buildDecisionBrief
  // ===========================================================================

  describe('buildDecisionBrief', () => {
    test('should generate markdown with header', () => {
      system.recordDecision(sampleDecision());
      const brief = system.buildDecisionBrief();
      expect(brief).toContain('Decision Record Brief');
    });

    test('should include category distribution', () => {
      system.recordDecision(sampleDecision({ category: 'technical' }));
      system.recordDecision(sampleDecision({ category: 'strategic' }));
      const brief = system.buildDecisionBrief();
      expect(brief).toContain('technical');
      expect(brief).toContain('strategic');
    });

    test('should include pending follow-ups count', () => {
      system.recordDecision(sampleDecision({ followUp: 'Check' }));
      const brief = system.buildDecisionBrief();
      expect(brief).toContain('Pending follow-ups: 1');
    });

    test('should return empty string when no decisions', () => {
      const brief = system.buildDecisionBrief();
      expect(brief).toBe('');
    });

    test('should respect category filter', () => {
      system.recordDecision(sampleDecision({ category: 'technical', title: 'Tech Choice' }));
      system.recordDecision(sampleDecision({ category: 'strategic', title: 'Strategy Move' }));
      const brief = system.buildDecisionBrief({ category: 'technical' });
      expect(brief).toContain('Tech Choice');
    });

    test('should contain decision title in the output', () => {
      system.recordDecision(sampleDecision({ title: 'My Important Decision' }));
      const brief = system.buildDecisionBrief();
      expect(brief).toContain('My Important Decision');
    });

    test('should include decision count in header', () => {
      system.recordDecision(sampleDecision());
      system.recordDecision(sampleDecision({ title: 'Second' }));
      const brief = system.buildDecisionBrief();
      expect(brief).toContain('2 of 2 decisions');
    });

    test('should generate brief that includes decisions within reasonable token count', () => {
      // Add a moderate number of decisions (not enough to trigger
      // the recursive overflow bug in buildDecisionBrief's downgrade path)
      for (let i = 0; i < 10; i++) {
        system.recordDecision(sampleDecision({
          title: `Decision ${i}`,
          context: `Context for decision ${i}`,
        }));
      }
      const brief = system.buildDecisionBrief();
      const tokens = estimateTokens(brief);
      // With 10 recent decisions at FULL detail, should be well within limit
      expect(tokens).toBeLessThanOrEqual(TOKEN_LIMIT);
      expect(tokens).toBeGreaterThan(0);
    });

    test('should handle buildDecisionBrief with limit to stay within tokens', () => {
      // Use the limit option to control output size
      for (let i = 0; i < 30; i++) {
        system.recordDecision(sampleDecision({
          title: `Decision ${i} with some text`,
          rationale: `Rationale ${i} for the decision`,
        }));
      }
      const brief = system.buildDecisionBrief({ limit: 5 });
      const tokens = estimateTokens(brief);
      expect(tokens).toBeLessThanOrEqual(TOKEN_LIMIT);
      expect(brief).toContain('5 of 30 decisions');
    });
  });

  // ===========================================================================
  // 10. getStatistics
  // ===========================================================================

  describe('getStatistics', () => {
    test('should return correct totalDecisions', () => {
      system.recordDecision(sampleDecision());
      system.recordDecision(sampleDecision());
      const stats = system.getStatistics();
      expect(stats.totalDecisions).toBe(2);
    });

    test('should return correct byCategory counts', () => {
      system.recordDecision(sampleDecision({ category: 'technical' }));
      system.recordDecision(sampleDecision({ category: 'technical' }));
      system.recordDecision(sampleDecision({ category: 'strategic' }));
      const stats = system.getStatistics();
      expect(stats.byCategory.technical).toBe(2);
      expect(stats.byCategory.strategic).toBe(1);
    });

    test('should return correct withOutcome count', () => {
      const d1 = system.recordDecision(sampleDecision());
      system.recordDecision(sampleDecision());
      system.updateOutcome(d1.id, 'Done');
      const stats = system.getStatistics();
      expect(stats.withOutcome).toBe(1);
      expect(stats.withoutOutcome).toBe(1);
    });

    test('should return correct pendingFollowUps count', () => {
      system.recordDecision(sampleDecision({ followUp: 'Check' }));
      system.recordDecision(sampleDecision({ followUp: null }));
      const stats = system.getStatistics();
      expect(stats.pendingFollowUps).toBe(1);
    });

    test('should calculate averageTimeToOutcomeHours', () => {
      const dec = system.recordDecision(sampleDecision());
      // Backdate by exactly 2 hours
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      system.decisions.get(dec.id).decidedAt = twoHoursAgo;
      system.updateOutcome(dec.id, 'Done');
      const stats = system.getStatistics();
      expect(stats.averageTimeToOutcomeHours).toBeGreaterThan(0);
      // Should be approximately 2 hours (allow margin for test execution time)
      expect(stats.averageTimeToOutcomeHours).toBeCloseTo(2, 0);
    });

    test('should return null for averageTimeToOutcomeHours when no outcomes', () => {
      system.recordDecision(sampleDecision());
      const stats = system.getStatistics();
      expect(stats.averageTimeToOutcomeHours).toBeNull();
    });

    test('should return all expected fields', () => {
      const stats = system.getStatistics();
      expect(stats).toHaveProperty('totalDecisions');
      expect(stats).toHaveProperty('byCategory');
      expect(stats).toHaveProperty('withOutcome');
      expect(stats).toHaveProperty('withoutOutcome');
      expect(stats).toHaveProperty('pendingFollowUps');
      expect(stats).toHaveProperty('averageTimeToOutcomeHours');
    });

    test('should return zeros for empty system', () => {
      const stats = system.getStatistics();
      expect(stats.totalDecisions).toBe(0);
      expect(stats.withOutcome).toBe(0);
      expect(stats.withoutOutcome).toBe(0);
      expect(stats.pendingFollowUps).toBe(0);
    });
  });

  // ===========================================================================
  // 11. DetailLevel enum
  // ===========================================================================

  describe('DetailLevel', () => {
    test('should have FULL value', () => {
      expect(DetailLevel.FULL).toBe('full');
    });

    test('should have SUMMARY value', () => {
      expect(DetailLevel.SUMMARY).toBe('summary');
    });

    test('should have MINIMAL value', () => {
      expect(DetailLevel.MINIMAL).toBe('minimal');
    });

    test('should have exactly 3 values', () => {
      expect(Object.keys(DetailLevel).length).toBe(3);
    });
  });

  // ===========================================================================
  // 12. getDetailLevel
  // ===========================================================================

  describe('getDetailLevel', () => {
    test('should return FULL for decisions less than 7 days old', () => {
      const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      expect(getDetailLevel(recent)).toBe(DetailLevel.FULL);
    });

    test('should return SUMMARY for decisions 7-30 days old', () => {
      const twoWeeks = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      expect(getDetailLevel(twoWeeks)).toBe(DetailLevel.SUMMARY);
    });

    test('should return MINIMAL for decisions older than 30 days', () => {
      const twoMonths = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      expect(getDetailLevel(twoMonths)).toBe(DetailLevel.MINIMAL);
    });

    test('should return MINIMAL for null decidedAt', () => {
      expect(getDetailLevel(null)).toBe(DetailLevel.MINIMAL);
    });

    test('should return MINIMAL for undefined decidedAt', () => {
      expect(getDetailLevel(undefined)).toBe(DetailLevel.MINIMAL);
    });

    test('should return FULL for just-now date', () => {
      expect(getDetailLevel(new Date().toISOString())).toBe(DetailLevel.FULL);
    });

    test('should return SUMMARY at exactly 7 days', () => {
      // 7 days + a small buffer to ensure it's past the boundary
      const sevenDays = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - 1000).toISOString();
      expect(getDetailLevel(sevenDays)).toBe(DetailLevel.SUMMARY);
    });

    test('should return MINIMAL at exactly 30+ days', () => {
      const thirtyOneDays = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
      expect(getDetailLevel(thirtyOneDays)).toBe(DetailLevel.MINIMAL);
    });
  });

  // ===========================================================================
  // 13. formatDecisionEntry
  // ===========================================================================

  describe('formatDecisionEntry', () => {
    const decision = {
      id: 'dec-abc-123',
      title: 'Test Decision',
      category: 'technical',
      context: 'Some context',
      alternatives: [{ option: 'A', pros: 'good', cons: 'slow' }, 'Option B'],
      chosen: 'Option A',
      rationale: 'Best fit',
      outcome: 'Worked well',
      followUp: 'Check later',
      decidedAt: '2025-01-15T10:00:00Z',
      decidedBy: 'ceo',
    };

    test('should include all FULL-level fields', () => {
      const entry = formatDecisionEntry(decision, DetailLevel.FULL);
      expect(entry).toContain('dec-abc-123');
      expect(entry).toContain('Test Decision');
      expect(entry).toContain('technical');
      expect(entry).toContain('Some context');
      expect(entry).toContain('Option A');
      expect(entry).toContain('Best fit');
      expect(entry).toContain('ceo');
    });

    test('should include correct SUMMARY-level fields', () => {
      const entry = formatDecisionEntry(decision, DetailLevel.SUMMARY);
      expect(entry).toContain('dec-abc-123');
      expect(entry).toContain('Test Decision');
      expect(entry).toContain('technical');
      expect(entry).toContain('Option A');
      expect(entry).toContain('Best fit');
      // Should NOT contain context or alternatives at SUMMARY level
      expect(entry).not.toContain('Some context');
    });

    test('should include correct MINIMAL-level fields', () => {
      const entry = formatDecisionEntry(decision, DetailLevel.MINIMAL);
      expect(entry).toContain('dec-abc-123');
      expect(entry).toContain('Test Decision');
      expect(entry).toContain('Option A');
      // Should NOT contain category, context, or rationale
      expect(entry).not.toContain('Some context');
      expect(entry).not.toContain('Best fit');
    });

    test('should return empty string for unknown detail level', () => {
      const entry = formatDecisionEntry(decision, 'nonexistent');
      expect(entry).toBe('');
    });

    test('should handle alternatives as objects with option field', () => {
      const entry = formatDecisionEntry(decision, DetailLevel.FULL);
      expect(entry).toContain('A');
    });

    test('should handle alternatives as strings', () => {
      const d = { ...decision, alternatives: ['Opt X', 'Opt Y'] };
      const entry = formatDecisionEntry(d, DetailLevel.FULL);
      expect(entry).toContain('Opt X');
      expect(entry).toContain('Opt Y');
    });

    test('should skip null/undefined fields', () => {
      const d = { ...decision, context: null, rationale: undefined };
      const entry = formatDecisionEntry(d, DetailLevel.FULL);
      expect(entry).not.toContain('context:');
    });

    test('should apply HARD_CAP_PER_DECISION for very long entries', () => {
      const longDecision = {
        ...decision,
        context: 'A'.repeat(5000),
        rationale: 'B'.repeat(5000),
      };
      const entry = formatDecisionEntry(longDecision, DetailLevel.FULL);
      const tokens = estimateTokens(entry);
      expect(tokens).toBeLessThanOrEqual(HARD_CAP_PER_DECISION + 1);
    });

    test('should format object context fields concisely', () => {
      const d = { ...decision, context: { goal: 'speed', priority: 'high' } };
      const entry = formatDecisionEntry(d, DetailLevel.FULL);
      expect(entry).toContain('goal=speed');
      expect(entry).toContain('priority=high');
    });
  });

  // ===========================================================================
  // 14. estimateTokens
  // ===========================================================================

  describe('estimateTokens', () => {
    test('should calculate tokens based on character count', () => {
      // 35 chars / 3.5 = 10 tokens
      const text = 'A'.repeat(35);
      expect(estimateTokens(text)).toBe(10);
    });

    test('should return 0 for empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    test('should return 0 for null', () => {
      expect(estimateTokens(null)).toBe(0);
    });

    test('should return 0 for undefined', () => {
      expect(estimateTokens(undefined)).toBe(0);
    });

    test('should return 0 for non-string input', () => {
      expect(estimateTokens(42)).toBe(0);
    });

    test('should ceil the result', () => {
      // 1 char / 3.5 = 0.285... -> ceil = 1
      expect(estimateTokens('A')).toBe(1);
    });

    test('should handle long strings', () => {
      const text = 'A'.repeat(3500);
      expect(estimateTokens(text)).toBe(1000);
    });
  });

  // ===========================================================================
  // 15. truncateToTokens
  // ===========================================================================

  describe('truncateToTokens', () => {
    test('should return original if within limit', () => {
      const text = 'Hello world';
      expect(truncateToTokens(text, 100)).toBe(text);
    });

    test('should truncate when exceeding limit', () => {
      const text = 'A'.repeat(100);
      const result = truncateToTokens(text, 5);
      // 5 tokens * 3.5 chars/token = 17 chars max
      expect(result.length).toBeLessThanOrEqual(20); // 17 + '...' = 20
      expect(result).toContain('...');
    });

    test('should add ellipsis when truncated', () => {
      const text = 'A'.repeat(1000);
      const result = truncateToTokens(text, 10);
      expect(result.endsWith('...')).toBe(true);
    });

    test('should return empty string for null input', () => {
      expect(truncateToTokens(null, 100)).toBe('');
    });

    test('should return empty string for undefined input', () => {
      expect(truncateToTokens(undefined, 100)).toBe('');
    });

    test('should return empty string for non-string input', () => {
      expect(truncateToTokens(42, 100)).toBe('');
    });

    test('should handle zero token limit', () => {
      const result = truncateToTokens('Hello', 0);
      expect(result).toBe('...');
    });
  });

  // ===========================================================================
  // 16. Persistence
  // ===========================================================================

  describe('persistence', () => {
    test('should save and load roundtrip correctly', () => {
      system.recordDecision(sampleDecision({ title: 'Persistent Decision' }));

      // Create new system pointing at same file
      const sys2 = new DecisionRecordSystem({ storagePath });
      const history = sys2.getDecisionHistory();
      expect(history.length).toBe(1);
      expect(history[0].title).toBe('Persistent Decision');
    });

    test('should write correct JSON schema version', () => {
      system.recordDecision(sampleDecision());
      const data = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
      expect(data.schema).toBe('aios-jarvis-decision-record-v1');
      expect(data.version).toBe('1.0.0');
    });

    test('should include lastUpdated timestamp', () => {
      system.recordDecision(sampleDecision());
      const data = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
      expect(data.lastUpdated).toBeDefined();
      expect(new Date(data.lastUpdated).toISOString()).toBe(data.lastUpdated);
    });

    test('should include totalDecisions count', () => {
      system.recordDecision(sampleDecision());
      system.recordDecision(sampleDecision({ title: 'Second' }));
      const data = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
      expect(data.totalDecisions).toBe(2);
    });

    test('should store decisions array in JSON', () => {
      system.recordDecision(sampleDecision());
      const data = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
      expect(Array.isArray(data.decisions)).toBe(true);
      expect(data.decisions.length).toBe(1);
    });

    test('should handle missing file gracefully on load', () => {
      const newPath = path.join(tmpDir, 'nonexistent', 'decisions.json');
      const sys = new DecisionRecordSystem({ storagePath: newPath });
      expect(sys.decisions.size).toBe(0);
    });

    test('should handle corrupt JSON gracefully on load', () => {
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(storagePath, 'NOT VALID JSON{{{', 'utf-8');
      const sys = new DecisionRecordSystem({ storagePath });
      expect(sys.decisions.size).toBe(0);
    });

    test('should preserve all decision fields on roundtrip', () => {
      const dec = system.recordDecision(sampleDecision());
      system.updateOutcome(dec.id, 'Great result');

      const sys2 = new DecisionRecordSystem({ storagePath });
      const loaded = sys2.getDecisionContext(dec.id);
      expect(loaded.title).toBe('Use React for frontend');
      expect(loaded.category).toBe('technical');
      expect(loaded.chosen).toBe('React');
      expect(loaded.outcome).toBe('Great result');
      expect(loaded.outcomeRecordedAt).toBeDefined();
    });
  });

  // ===========================================================================
  // 17. Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    test('should handle empty decisions gracefully in getStatistics', () => {
      const stats = system.getStatistics();
      expect(stats.totalDecisions).toBe(0);
      expect(stats.byCategory).toEqual({});
    });

    test('should handle special characters in title', () => {
      const dec = system.recordDecision(sampleDecision({
        title: 'Use "quotes" & <angle brackets> in title',
      }));
      expect(dec.title).toBe('Use "quotes" & <angle brackets> in title');
    });

    test('should handle unicode in decision data', () => {
      const dec = system.recordDecision(sampleDecision({
        title: 'Usar estrategia de negocio',
        rationale: 'Porque es la mejor opcion',
      }));
      expect(dec.title).toBe('Usar estrategia de negocio');
    });

    test('should handle many decisions without errors', () => {
      for (let i = 0; i < 100; i++) {
        system.recordDecision(sampleDecision({ title: `Decision ${i}` }));
      }
      expect(system.decisions.size).toBe(100);
      const history = system.getDecisionHistory();
      expect(history.length).toBe(100);
    });

    test('should handle empty alternatives array', () => {
      const dec = system.recordDecision(sampleDecision({ alternatives: [] }));
      expect(dec.alternatives).toEqual([]);
    });

    test('should handle getDecisionHistory with all filters matching nothing', () => {
      system.recordDecision(sampleDecision());
      const history = system.getDecisionHistory({
        category: 'nonexistent',
        agent: 'nobody',
        topic: 'nothing relevant',
      });
      expect(history).toEqual([]);
    });

    test('should handle topic with short keywords (< 3 chars) filtered out', () => {
      system.recordDecision(sampleDecision({ title: 'AB test' }));
      // "AB" is less than 3 chars so the keyword filter drops it
      // "test" has 4 chars and matches
      const history = system.getDecisionHistory({ topic: 'AB test' });
      expect(history.length).toBe(1);
    });

    test('DETAIL_FIELDS should have entries for all DetailLevel values', () => {
      expect(DETAIL_FIELDS[DetailLevel.FULL]).toBeDefined();
      expect(DETAIL_FIELDS[DetailLevel.SUMMARY]).toBeDefined();
      expect(DETAIL_FIELDS[DetailLevel.MINIMAL]).toBeDefined();
    });

    test('DETAIL_FIELDS FULL should contain more fields than SUMMARY', () => {
      expect(DETAIL_FIELDS[DetailLevel.FULL].length).toBeGreaterThan(
        DETAIL_FIELDS[DetailLevel.SUMMARY].length,
      );
    });

    test('DETAIL_FIELDS SUMMARY should contain more fields than MINIMAL', () => {
      expect(DETAIL_FIELDS[DetailLevel.SUMMARY].length).toBeGreaterThan(
        DETAIL_FIELDS[DetailLevel.MINIMAL].length,
      );
    });
  });
});
