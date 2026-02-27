/**
 * Jarvis Proactive Intelligence - Unit Tests
 *
 * Comprehensive tests for morning briefs, anomaly detection,
 * suggestion generation, attention items, and event emission.
 */

const EventEmitter = require('events');
const {
  ProactiveIntelligence,
  createProactiveIntelligence,
  AnomalySeverity,
  AttentionPriority,
  DEFAULT_THRESHOLDS,
} = require('../jarvis-proactive');

// =============================================================================
//                              MOCK FACTORIES
// =============================================================================

function createMockDelegationStore(overrides = {}) {
  const defaults = {
    getActiveDelegations: () => [],
    getAgentPerformance: () => ({ avgDuration: 1000 }),
    getDelegationHistory: () => [],
  };
  return { ...defaults, ...overrides };
}

function createMockDecisionRecord(overrides = {}) {
  const defaults = {
    getPendingFollowUps: () => [],
    getDecisionHistory: () => [],
  };
  return { ...defaults, ...overrides };
}

function createMockPatternEngine(overrides = {}) {
  const defaults = {
    recognizePatterns: () => ({ patterns: [], topMatch: null, confidence: 'low' }),
    suggestAction: () => ({
      suggestedAgent: '@dev',
      suggestedApproach: 'test',
      confidence: 'medium',
      basedOn: ['p1'],
    }),
    detectRecurringPatterns: () => [],
  };
  return { ...defaults, ...overrides };
}

function createMockBusinessMemory(overrides = {}) {
  const defaults = {
    get: () => null,
    set: () => {},
  };
  return { ...defaults, ...overrides };
}

/** Create an instance with all mock modules wired up */
function makeProactive(opts = {}) {
  return new ProactiveIntelligence({
    patternEngine: opts.patternEngine || createMockPatternEngine(),
    decisionRecord: opts.decisionRecord || createMockDecisionRecord(),
    businessMemory: opts.businessMemory || createMockBusinessMemory(),
    delegationStore: opts.delegationStore || createMockDelegationStore(),
    thresholds: opts.thresholds || undefined,
  });
}

/** Create a stale delegation (hours old) */
function staleDelegation(hours, extra = {}) {
  return {
    delegationId: extra.delegationId || `del-stale-${Math.random().toString(36).substring(2, 8)}`,
    task: extra.task || 'Review PR',
    delegatedTo: extra.delegatedTo || '@dev',
    status: 'in_progress',
    createdAt: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
    ...extra,
  };
}

/** Create a pending follow-up decision */
function pendingDecision(extra = {}) {
  return {
    id: extra.id || `dec-${Math.random().toString(36).substring(2, 8)}`,
    title: extra.title || 'Sample Decision',
    chosen: extra.chosen || 'Option A',
    decidedAt: extra.decidedAt || new Date().toISOString(),
    followUp: extra.followUp || 'Check back later',
    outcome: null,
    ...extra,
  };
}

describe('ProactiveIntelligence', () => {
  let proactive;

  beforeEach(() => {
    proactive = makeProactive();
  });

  // ===========================================================================
  // 1. Exports
  // ===========================================================================

  describe('exports', () => {
    test('should export ProactiveIntelligence as a function/class', () => {
      expect(typeof ProactiveIntelligence).toBe('function');
    });

    test('should export createProactiveIntelligence as a function', () => {
      expect(typeof createProactiveIntelligence).toBe('function');
    });

    test('should export AnomalySeverity as an object', () => {
      expect(typeof AnomalySeverity).toBe('object');
      expect(AnomalySeverity.INFO).toBe('info');
      expect(AnomalySeverity.WARNING).toBe('warning');
      expect(AnomalySeverity.CRITICAL).toBe('critical');
    });

    test('should export AttentionPriority as an object', () => {
      expect(typeof AttentionPriority).toBe('object');
      expect(AttentionPriority.URGENT).toBe('urgent');
      expect(AttentionPriority.HIGH).toBe('high');
      expect(AttentionPriority.MEDIUM).toBe('medium');
      expect(AttentionPriority.LOW).toBe('low');
    });

    test('should export DEFAULT_THRESHOLDS as an object with expected keys', () => {
      expect(typeof DEFAULT_THRESHOLDS).toBe('object');
      expect(DEFAULT_THRESHOLDS).toHaveProperty('staleDelegationHours');
      expect(DEFAULT_THRESHOLDS).toHaveProperty('failureRatePercent');
      expect(DEFAULT_THRESHOLDS).toHaveProperty('pendingDecisionsMax');
      expect(DEFAULT_THRESHOLDS).toHaveProperty('repeatedFailuresMin');
      expect(DEFAULT_THRESHOLDS).toHaveProperty('unusualDurationMultiplier');
    });

    test('should export correct DEFAULT_THRESHOLDS values', () => {
      expect(DEFAULT_THRESHOLDS.staleDelegationHours).toBe(4);
      expect(DEFAULT_THRESHOLDS.failureRatePercent).toBe(30);
      expect(DEFAULT_THRESHOLDS.pendingDecisionsMax).toBe(5);
      expect(DEFAULT_THRESHOLDS.repeatedFailuresMin).toBe(2);
      expect(DEFAULT_THRESHOLDS.unusualDurationMultiplier).toBe(3);
    });
  });

  // ===========================================================================
  // 2. Constructor
  // ===========================================================================

  describe('constructor', () => {
    test('should extend EventEmitter', () => {
      expect(proactive).toBeInstanceOf(EventEmitter);
    });

    test('should use DEFAULT_THRESHOLDS when none provided', () => {
      const p = new ProactiveIntelligence();
      expect(p.thresholds.staleDelegationHours).toBe(DEFAULT_THRESHOLDS.staleDelegationHours);
      expect(p.thresholds.repeatedFailuresMin).toBe(DEFAULT_THRESHOLDS.repeatedFailuresMin);
    });

    test('should merge custom thresholds with defaults', () => {
      const p = new ProactiveIntelligence({ thresholds: { staleDelegationHours: 8 } });
      expect(p.thresholds.staleDelegationHours).toBe(8);
      expect(p.thresholds.repeatedFailuresMin).toBe(DEFAULT_THRESHOLDS.repeatedFailuresMin);
    });

    test('should accept all optional params as null gracefully', () => {
      const p = new ProactiveIntelligence({
        patternEngine: null,
        decisionRecord: null,
        businessMemory: null,
        delegationStore: null,
      });
      expect(p.patternEngine).toBeNull();
      expect(p.decisionRecord).toBeNull();
      expect(p.businessMemory).toBeNull();
      expect(p.delegationStore).toBeNull();
    });

    test('should construct with no arguments', () => {
      const p = new ProactiveIntelligence();
      expect(p).toBeInstanceOf(ProactiveIntelligence);
      expect(p._anomalyHistory).toEqual([]);
    });

    test('should initialize anomaly history as empty array', () => {
      expect(proactive._anomalyHistory).toEqual([]);
    });

    test('should store provided modules', () => {
      const engine = createMockPatternEngine();
      const record = createMockDecisionRecord();
      const store = createMockDelegationStore();
      const memory = createMockBusinessMemory();
      const p = new ProactiveIntelligence({
        patternEngine: engine,
        decisionRecord: record,
        delegationStore: store,
        businessMemory: memory,
      });
      expect(p.patternEngine).toBe(engine);
      expect(p.decisionRecord).toBe(record);
      expect(p.delegationStore).toBe(store);
      expect(p.businessMemory).toBe(memory);
    });
  });

  // ===========================================================================
  // 3. createProactiveIntelligence factory
  // ===========================================================================

  describe('createProactiveIntelligence', () => {
    test('should create a ProactiveIntelligence instance', () => {
      const p = createProactiveIntelligence({});
      expect(p).toBeInstanceOf(ProactiveIntelligence);
    });

    test('should pass options to constructor', () => {
      const p = createProactiveIntelligence({ thresholds: { staleDelegationHours: 10 } });
      expect(p.thresholds.staleDelegationHours).toBe(10);
    });
  });

  // ===========================================================================
  // 4. morningBrief
  // ===========================================================================

  describe('morningBrief', () => {
    test('should return brief with generatedAt', () => {
      const brief = proactive.morningBrief();
      expect(brief.generatedAt).toBeDefined();
      expect(new Date(brief.generatedAt).toISOString()).toBe(brief.generatedAt);
    });

    test('should return brief with timeRange', () => {
      const brief = proactive.morningBrief({ timeRange: '7d' });
      expect(brief.timeRange).toBe('7d');
    });

    test('should default timeRange to 24h', () => {
      const brief = proactive.morningBrief();
      expect(brief.timeRange).toBe('24h');
    });

    test('should include pendingDecisions section when decisionRecord available', () => {
      const p = makeProactive({
        decisionRecord: createMockDecisionRecord({
          getPendingFollowUps: () => [pendingDecision()],
          getDecisionHistory: () => [],
        }),
      });
      const brief = p.morningBrief();
      expect(brief.sections.pendingDecisions).toBeDefined();
      expect(brief.sections.pendingDecisions.count).toBe(1);
    });

    test('should include activeDelegations section when delegationStore available', () => {
      const p = makeProactive({
        delegationStore: createMockDelegationStore({
          getActiveDelegations: () => [staleDelegation(1)],
        }),
      });
      const brief = p.morningBrief();
      expect(brief.sections.activeDelegations).toBeDefined();
      expect(brief.sections.activeDelegations.count).toBe(1);
    });

    test('should include detectedPatterns section when patternEngine available', () => {
      const p = makeProactive({
        patternEngine: createMockPatternEngine({
          detectRecurringPatterns: () => [{ description: 'Recurring bug', frequency: 5, category: 'bugs' }],
        }),
      });
      const brief = p.morningBrief();
      expect(brief.sections.detectedPatterns).toBeDefined();
      expect(brief.sections.detectedPatterns.count).toBe(1);
    });

    test('should include anomalies section', () => {
      const brief = proactive.morningBrief();
      expect(brief.sections.anomalies).toBeDefined();
      expect(brief.sections.anomalies.count).toBe(0);
    });

    test('should include recent anomalies within timeRange', () => {
      proactive._anomalyHistory.push({
        type: 'repeated_failure',
        severity: AnomalySeverity.WARNING,
        description: 'Test anomaly',
        detectedAt: new Date().toISOString(),
      });
      const brief = proactive.morningBrief();
      expect(brief.sections.anomalies.count).toBe(1);
    });

    test('should exclude old anomalies outside timeRange', () => {
      proactive._anomalyHistory.push({
        type: 'repeated_failure',
        severity: AnomalySeverity.WARNING,
        description: 'Old anomaly',
        detectedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      });
      const brief = proactive.morningBrief({ timeRange: '24h' });
      expect(brief.sections.anomalies.count).toBe(0);
    });

    test('should include recentDecisions section when decisionRecord available', () => {
      const p = makeProactive({
        decisionRecord: createMockDecisionRecord({
          getPendingFollowUps: () => [],
          getDecisionHistory: () => [{
            id: 'dec-1',
            title: 'Recent',
            chosen: 'A',
            outcome: null,
          }],
        }),
      });
      const brief = p.morningBrief();
      expect(brief.sections.recentDecisions).toBeDefined();
      expect(brief.sections.recentDecisions.count).toBe(1);
    });

    test('should include suggestions section', () => {
      const brief = proactive.morningBrief();
      expect(brief.sections.suggestions).toBeDefined();
      expect(Array.isArray(brief.sections.suggestions)).toBe(true);
    });

    test('should omit sections when modules are null', () => {
      const p = new ProactiveIntelligence();
      const brief = p.morningBrief();
      expect(brief.sections.pendingDecisions).toBeUndefined();
      expect(brief.sections.activeDelegations).toBeUndefined();
      expect(brief.sections.detectedPatterns).toBeUndefined();
      // anomalies and suggestions should always be present
      expect(brief.sections.anomalies).toBeDefined();
      expect(brief.sections.suggestions).toBeDefined();
    });

    test('should limit pendingDecisions items to 5', () => {
      const many = Array.from({ length: 8 }, (_, i) => pendingDecision({ title: `D${i}` }));
      const p = makeProactive({
        decisionRecord: createMockDecisionRecord({
          getPendingFollowUps: () => many,
          getDecisionHistory: () => [],
        }),
      });
      const brief = p.morningBrief();
      expect(brief.sections.pendingDecisions.items.length).toBe(5);
      expect(brief.sections.pendingDecisions.hasMore).toBe(true);
    });

    test('should emit brief.generated event', () => {
      const emitted = [];
      proactive.on('brief.generated', (b) => emitted.push(b));
      proactive.morningBrief();
      expect(emitted.length).toBe(1);
    });

    test('should handle decisionRecord.getDecisionHistory throwing', () => {
      const p = makeProactive({
        decisionRecord: createMockDecisionRecord({
          getPendingFollowUps: () => [],
          getDecisionHistory: () => { throw new Error('DB failure'); },
        }),
      });
      const brief = p.morningBrief();
      expect(brief.sections.recentDecisions).toEqual({ count: 0, items: [] });
    });

    test('should handle 30d timeRange', () => {
      proactive._anomalyHistory.push({
        type: 'stale_delegation',
        severity: AnomalySeverity.WARNING,
        description: '15 day old anomaly',
        detectedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const brief = proactive.morningBrief({ timeRange: '30d' });
      expect(brief.sections.anomalies.count).toBe(1);
    });
  });

  // ===========================================================================
  // 5. detectAnomaly
  // ===========================================================================

  describe('detectAnomaly', () => {
    test('should return null for null event', () => {
      expect(proactive.detectAnomaly(null)).toBeNull();
    });

    test('should return null for event without type', () => {
      expect(proactive.detectAnomaly({ data: {} })).toBeNull();
    });

    test('should return null for invalid event type with no anomaly conditions', () => {
      expect(proactive.detectAnomaly({ type: 'unknown.event', data: {} })).toBeNull();
    });

    test('should detect repeated delegation failures', () => {
      const p = makeProactive({ thresholds: { repeatedFailuresMin: 2 } });
      // First failure — below threshold, returns null
      p.detectAnomaly({
        type: 'delegation.failed',
        data: { delegatedTo: '@dev', task: 'Task 1' },
      });
      // Second failure — at threshold, returns anomaly
      const result = p.detectAnomaly({
        type: 'delegation.failed',
        data: { delegatedTo: '@dev', task: 'Task 2' },
      });
      expect(result).not.toBeNull();
      expect(result.type).toBe('repeated_failure');
    });

    test('should not detect failure below threshold', () => {
      const p = makeProactive({ thresholds: { repeatedFailuresMin: 5 } });
      const result = p.detectAnomaly({
        type: 'delegation.failed',
        data: { delegatedTo: '@dev', task: 'Task 1' },
      });
      expect(result).toBeNull();
    });

    test('should detect unusual duration for completed delegation', () => {
      const p = makeProactive({
        delegationStore: createMockDelegationStore({
          getAgentPerformance: () => ({ avgDuration: 1000 }),
          getActiveDelegations: () => [],
        }),
      });
      const result = p.detectAnomaly({
        type: 'delegation.completed',
        data: {
          delegatedTo: '@dev',
          task: 'Deploy',
          duration: 5000, // 5x average with multiplier=3 threshold
        },
      });
      expect(result).not.toBeNull();
      expect(result.type).toBe('unusual_duration');
    });

    test('should not detect unusual duration when within threshold', () => {
      const p = makeProactive({
        delegationStore: createMockDelegationStore({
          getAgentPerformance: () => ({ avgDuration: 1000 }),
          getActiveDelegations: () => [],
        }),
      });
      const result = p.detectAnomaly({
        type: 'delegation.completed',
        data: {
          delegatedTo: '@dev',
          task: 'Deploy',
          duration: 2000, // 2x — below 3x threshold
        },
      });
      expect(result).toBeNull();
    });

    test('should detect stale delegations on delegation.created', () => {
      const stale = staleDelegation(10); // 10 hours > 4h threshold
      const p = makeProactive({
        delegationStore: createMockDelegationStore({
          getActiveDelegations: () => [stale],
        }),
      });
      const result = p.detectAnomaly({
        type: 'delegation.created',
        data: {},
      });
      expect(result).not.toBeNull();
      if (Array.isArray(result)) {
        expect(result.some(a => a.type === 'stale_delegation')).toBe(true);
      } else {
        expect(result.type).toBe('stale_delegation');
      }
    });

    test('should detect stale delegations on monitor.check', () => {
      const stale = staleDelegation(5);
      const p = makeProactive({
        delegationStore: createMockDelegationStore({
          getActiveDelegations: () => [stale],
        }),
      });
      const result = p.detectAnomaly({ type: 'monitor.check', data: {} });
      expect(result).not.toBeNull();
    });

    test('should detect decision overload on decision.recorded', () => {
      const pending = Array.from({ length: 6 }, (_, i) => pendingDecision({ title: `D${i}` }));
      const p = makeProactive({
        decisionRecord: createMockDecisionRecord({
          getPendingFollowUps: () => pending,
        }),
      });
      const result = p.detectAnomaly({ type: 'decision.recorded', data: {} });
      expect(result).not.toBeNull();
      if (Array.isArray(result)) {
        expect(result.some(a => a.type === 'decision_overload')).toBe(true);
      } else {
        expect(result.type).toBe('decision_overload');
      }
    });

    test('should not detect decision overload below threshold', () => {
      const pending = [pendingDecision()]; // only 1
      const p = makeProactive({
        decisionRecord: createMockDecisionRecord({
          getPendingFollowUps: () => pending,
        }),
      });
      const result = p.detectAnomaly({ type: 'decision.recorded', data: {} });
      expect(result).toBeNull();
    });

    test('should add anomaly to history', () => {
      const p = makeProactive({ thresholds: { repeatedFailuresMin: 1 } });
      p.detectAnomaly({
        type: 'delegation.failed',
        data: { delegatedTo: '@dev', task: 'Task 1' },
      });
      expect(p._anomalyHistory.length).toBeGreaterThan(0);
    });

    test('should emit anomaly.detected event', () => {
      const emitted = [];
      const p = makeProactive({ thresholds: { repeatedFailuresMin: 1 } });
      p.on('anomaly.detected', (a) => emitted.push(a));
      p.detectAnomaly({
        type: 'delegation.failed',
        data: { delegatedTo: '@dev', task: 'Task 1' },
      });
      expect(emitted.length).toBeGreaterThan(0);
    });

    test('should emit anomaly.critical for CRITICAL severity', () => {
      const criticalEmitted = [];
      const p = makeProactive({ thresholds: { repeatedFailuresMin: 1 } });
      p.on('anomaly.critical', (a) => criticalEmitted.push(a));

      // Add 2 previous failures so total >= 3 triggers CRITICAL
      p._recentFailures = [
        { agent: '@dev', timestamp: new Date().toISOString(), task: 'T1' },
        { agent: '@dev', timestamp: new Date().toISOString(), task: 'T2' },
      ];
      p.detectAnomaly({
        type: 'delegation.failed',
        data: { delegatedTo: '@dev', task: 'T3' },
      });
      expect(criticalEmitted.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // 6. _checkFailurePattern
  // ===========================================================================

  describe('_checkFailurePattern', () => {
    test('should return null when below threshold', () => {
      const p = makeProactive({ thresholds: { repeatedFailuresMin: 5 } });
      const result = p._checkFailurePattern({
        data: { delegatedTo: '@dev', task: 'T1' },
      });
      expect(result).toBeNull();
    });

    test('should return anomaly at threshold', () => {
      const p = makeProactive({ thresholds: { repeatedFailuresMin: 2 } });
      // Pre-fill one failure
      p._recentFailures = [{ agent: '@dev', timestamp: new Date().toISOString(), task: 'T1' }];
      const result = p._checkFailurePattern({
        data: { delegatedTo: '@dev', task: 'T2' },
      });
      expect(result).not.toBeNull();
      expect(result.type).toBe('repeated_failure');
      expect(result.severity).toBe(AnomalySeverity.WARNING);
    });

    test('should escalate to CRITICAL at 3+ failures', () => {
      const p = makeProactive({ thresholds: { repeatedFailuresMin: 1 } });
      p._recentFailures = [
        { agent: '@dev', timestamp: new Date().toISOString(), task: 'T1' },
        { agent: '@dev', timestamp: new Date().toISOString(), task: 'T2' },
      ];
      const result = p._checkFailurePattern({
        data: { delegatedTo: '@dev', task: 'T3' },
      });
      expect(result.severity).toBe(AnomalySeverity.CRITICAL);
    });

    test('should return null when no agent specified', () => {
      const result = proactive._checkFailurePattern({ data: {} });
      expect(result).toBeNull();
    });

    test('should track failures per agent separately', () => {
      const p = makeProactive({ thresholds: { repeatedFailuresMin: 2 } });
      p._recentFailures = [{ agent: '@qa', timestamp: new Date().toISOString(), task: 'T1' }];
      // Failure for different agent
      const result = p._checkFailurePattern({
        data: { delegatedTo: '@dev', task: 'T2' },
      });
      expect(result).toBeNull();
    });

    test('should include failureCount in anomaly', () => {
      const p = makeProactive({ thresholds: { repeatedFailuresMin: 2 } });
      p._recentFailures = [{ agent: '@dev', timestamp: new Date().toISOString(), task: 'T1' }];
      const result = p._checkFailurePattern({
        data: { delegatedTo: '@dev', task: 'T2' },
      });
      expect(result.failureCount).toBeGreaterThanOrEqual(2);
    });
  });

  // ===========================================================================
  // 7. _checkUnusualDuration
  // ===========================================================================

  describe('_checkUnusualDuration', () => {
    test('should return null when no patternEngine', () => {
      const p = new ProactiveIntelligence({
        delegationStore: createMockDelegationStore(),
      });
      const result = p._checkUnusualDuration({
        data: { duration: 10000, delegatedTo: '@dev', task: 'T' },
      });
      expect(result).toBeNull();
    });

    test('should return null when duration is normal', () => {
      const p = makeProactive({
        delegationStore: createMockDelegationStore({
          getAgentPerformance: () => ({ avgDuration: 5000 }),
          getActiveDelegations: () => [],
        }),
      });
      const result = p._checkUnusualDuration({
        data: { duration: 10000, delegatedTo: '@dev', task: 'T' }, // 2x, below 3x
      });
      expect(result).toBeNull();
    });

    test('should return anomaly when duration is unusual', () => {
      const p = makeProactive({
        delegationStore: createMockDelegationStore({
          getAgentPerformance: () => ({ avgDuration: 1000 }),
          getActiveDelegations: () => [],
        }),
      });
      const result = p._checkUnusualDuration({
        data: { duration: 5000, delegatedTo: '@dev', task: 'T' }, // 5x > 3x
      });
      expect(result).not.toBeNull();
      expect(result.type).toBe('unusual_duration');
      expect(result.severity).toBe(AnomalySeverity.WARNING);
    });

    test('should return null when no avg performance data', () => {
      const p = makeProactive({
        delegationStore: createMockDelegationStore({
          getAgentPerformance: () => ({}), // no avgDuration
          getActiveDelegations: () => [],
        }),
      });
      const result = p._checkUnusualDuration({
        data: { duration: 50000, delegatedTo: '@dev', task: 'T' },
      });
      expect(result).toBeNull();
    });

    test('should return null when no duration in event data', () => {
      const result = proactive._checkUnusualDuration({ data: { delegatedTo: '@dev' } });
      expect(result).toBeNull();
    });

    test('should return null when no delegatedTo in event data', () => {
      const result = proactive._checkUnusualDuration({ data: { duration: 5000 } });
      expect(result).toBeNull();
    });

    test('should include duration and avgDuration in anomaly', () => {
      const p = makeProactive({
        delegationStore: createMockDelegationStore({
          getAgentPerformance: () => ({ avgDuration: 1000 }),
          getActiveDelegations: () => [],
        }),
      });
      const result = p._checkUnusualDuration({
        data: { duration: 5000, delegatedTo: '@dev', task: 'T' },
      });
      expect(result.duration).toBe(5000);
      expect(result.avgDuration).toBe(1000);
    });
  });

  // ===========================================================================
  // 8. _checkStaleDelegations
  // ===========================================================================

  describe('_checkStaleDelegations', () => {
    test('should return empty when no stale delegations', () => {
      const p = makeProactive({
        delegationStore: createMockDelegationStore({
          getActiveDelegations: () => [staleDelegation(1)], // 1 hour, below 4h
        }),
      });
      const result = p._checkStaleDelegations();
      expect(result).toEqual([]);
    });

    test('should detect stale delegations', () => {
      const p = makeProactive({
        delegationStore: createMockDelegationStore({
          getActiveDelegations: () => [staleDelegation(5)], // 5 hours > 4h
        }),
      });
      const result = p._checkStaleDelegations();
      expect(result.length).toBe(1);
      expect(result[0].type).toBe('stale_delegation');
    });

    test('should not re-alert for same delegation', () => {
      const delegation = staleDelegation(5, { delegationId: 'del-already-alerted' });
      const p = makeProactive({
        delegationStore: createMockDelegationStore({
          getActiveDelegations: () => [delegation],
        }),
      });
      // First check
      const first = p._checkStaleDelegations();
      expect(first.length).toBe(1);
      // Add to history
      p._anomalyHistory.push(first[0]);
      // Second check
      const second = p._checkStaleDelegations();
      expect(second.length).toBe(0);
    });

    test('should escalate to CRITICAL for very stale (2x threshold)', () => {
      const p = makeProactive({
        delegationStore: createMockDelegationStore({
          getActiveDelegations: () => [staleDelegation(10)], // 10 hours > 8h (2x 4h)
        }),
      });
      const result = p._checkStaleDelegations();
      expect(result[0].severity).toBe(AnomalySeverity.CRITICAL);
    });

    test('should return WARNING for stale but not very stale', () => {
      const p = makeProactive({
        delegationStore: createMockDelegationStore({
          getActiveDelegations: () => [staleDelegation(5)], // 5 hours, < 8h
        }),
      });
      const result = p._checkStaleDelegations();
      expect(result[0].severity).toBe(AnomalySeverity.WARNING);
    });

    test('should return empty when no delegation store', () => {
      const p = new ProactiveIntelligence();
      const result = p._checkStaleDelegations();
      expect(result).toEqual([]);
    });

    test('should detect multiple stale delegations', () => {
      const p = makeProactive({
        delegationStore: createMockDelegationStore({
          getActiveDelegations: () => [
            staleDelegation(5, { delegationId: 'del-1' }),
            staleDelegation(6, { delegationId: 'del-2' }),
          ],
        }),
      });
      const result = p._checkStaleDelegations();
      expect(result.length).toBe(2);
    });
  });

  // ===========================================================================
  // 9. _checkDecisionOverload
  // ===========================================================================

  describe('_checkDecisionOverload', () => {
    test('should return null when below threshold', () => {
      const p = makeProactive({
        decisionRecord: createMockDecisionRecord({
          getPendingFollowUps: () => [pendingDecision()], // 1 < 5
        }),
      });
      const result = p._checkDecisionOverload();
      expect(result).toBeNull();
    });

    test('should return anomaly at threshold', () => {
      const pending = Array.from({ length: 5 }, () => pendingDecision());
      const p = makeProactive({
        decisionRecord: createMockDecisionRecord({
          getPendingFollowUps: () => pending,
        }),
      });
      const result = p._checkDecisionOverload();
      expect(result).not.toBeNull();
      expect(result.type).toBe('decision_overload');
      expect(result.severity).toBe(AnomalySeverity.WARNING);
    });

    test('should escalate to CRITICAL at 2x threshold', () => {
      const pending = Array.from({ length: 10 }, () => pendingDecision());
      const p = makeProactive({
        decisionRecord: createMockDecisionRecord({
          getPendingFollowUps: () => pending,
        }),
      });
      const result = p._checkDecisionOverload();
      expect(result.severity).toBe(AnomalySeverity.CRITICAL);
    });

    test('should return null when no decisionRecord', () => {
      const p = new ProactiveIntelligence();
      const result = p._checkDecisionOverload();
      expect(result).toBeNull();
    });

    test('should include pendingCount in anomaly', () => {
      const pending = Array.from({ length: 7 }, () => pendingDecision());
      const p = makeProactive({
        decisionRecord: createMockDecisionRecord({
          getPendingFollowUps: () => pending,
        }),
      });
      const result = p._checkDecisionOverload();
      expect(result.pendingCount).toBe(7);
    });
  });

  // ===========================================================================
  // 10. suggestNextAction
  // ===========================================================================

  describe('suggestNextAction', () => {
    test('should suggest follow-up for pending decisions', () => {
      const p = makeProactive({
        decisionRecord: createMockDecisionRecord({
          getPendingFollowUps: () => [pendingDecision({ title: 'Old Decision' })],
        }),
        delegationStore: createMockDelegationStore({
          getActiveDelegations: () => [],
        }),
      });
      const result = p.suggestNextAction();
      expect(result.allSuggestions.some(s => s.action === 'follow_up_decision')).toBe(true);
    });

    test('should suggest checking stale delegations', () => {
      const p = makeProactive({
        delegationStore: createMockDelegationStore({
          getActiveDelegations: () => [staleDelegation(10)],
        }),
      });
      const result = p.suggestNextAction();
      expect(result.allSuggestions.some(s => s.action === 'check_stale_delegation')).toBe(true);
    });

    test('should provide pattern-based suggestion with domain context', () => {
      const p = makeProactive({
        delegationStore: createMockDelegationStore({
          getActiveDelegations: () => [],
        }),
      });
      const result = p.suggestNextAction({ domain: 'development', focus: 'refactoring' });
      expect(result.allSuggestions.some(s => s.action === 'pattern_based')).toBe(true);
    });

    test('should suggest generate_brief when no urgent items', () => {
      const p = makeProactive({
        decisionRecord: createMockDecisionRecord({ getPendingFollowUps: () => [] }),
        delegationStore: createMockDelegationStore({ getActiveDelegations: () => [] }),
      });
      const result = p.suggestNextAction();
      expect(result.topSuggestion.action).toBe('generate_brief');
    });

    test('should sort by priority (urgent first)', () => {
      const p = makeProactive({
        decisionRecord: createMockDecisionRecord({
          getPendingFollowUps: () => [pendingDecision()],
        }),
        delegationStore: createMockDelegationStore({
          getActiveDelegations: () => [staleDelegation(10)],
        }),
      });
      const result = p.suggestNextAction();
      expect(result.topSuggestion.priority).toBe(AttentionPriority.URGENT);
    });

    test('should return generatedAt timestamp', () => {
      const result = proactive.suggestNextAction();
      expect(result.generatedAt).toBeDefined();
    });

    test('should emit suggestion.generated event', () => {
      const emitted = [];
      proactive.on('suggestion.generated', (s) => emitted.push(s));
      proactive.suggestNextAction();
      expect(emitted.length).toBe(1);
    });

    test('should handle patternEngine.suggestAction throwing', () => {
      const p = makeProactive({
        patternEngine: createMockPatternEngine({
          suggestAction: () => { throw new Error('Engine down'); },
        }),
        delegationStore: createMockDelegationStore({
          getActiveDelegations: () => [],
        }),
        decisionRecord: createMockDecisionRecord({
          getPendingFollowUps: () => [],
        }),
      });
      // Should not throw
      const result = p.suggestNextAction({ domain: 'dev', focus: 'test' });
      expect(result).toBeDefined();
    });

    test('should not include pattern suggestion when confidence is low', () => {
      const p = makeProactive({
        patternEngine: createMockPatternEngine({
          suggestAction: () => ({ suggestedAgent: '@dev', confidence: 'low', basedOn: [] }),
        }),
        delegationStore: createMockDelegationStore({ getActiveDelegations: () => [] }),
        decisionRecord: createMockDecisionRecord({ getPendingFollowUps: () => [] }),
      });
      const result = p.suggestNextAction({ domain: 'development' });
      expect(result.allSuggestions.some(s => s.action === 'pattern_based')).toBe(false);
    });
  });

  // ===========================================================================
  // 11. getAttentionItems
  // ===========================================================================

  describe('getAttentionItems', () => {
    test('should return empty array when nothing needs attention', () => {
      const p = makeProactive({
        delegationStore: createMockDelegationStore({ getActiveDelegations: () => [] }),
        decisionRecord: createMockDecisionRecord({ getPendingFollowUps: () => [] }),
      });
      const items = p.getAttentionItems();
      expect(items).toEqual([]);
    });

    test('should include critical anomalies from last 24h', () => {
      proactive._anomalyHistory.push({
        type: 'repeated_failure',
        severity: AnomalySeverity.CRITICAL,
        description: 'Agent failing repeatedly',
        suggestion: 'Check agent',
        detectedAt: new Date().toISOString(),
      });
      const items = proactive.getAttentionItems();
      expect(items.some(i => i.type === 'anomaly')).toBe(true);
      expect(items.some(i => i.priority === AttentionPriority.URGENT)).toBe(true);
    });

    test('should exclude old critical anomalies', () => {
      proactive._anomalyHistory.push({
        type: 'repeated_failure',
        severity: AnomalySeverity.CRITICAL,
        description: 'Old failure',
        suggestion: 'Check',
        detectedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      });
      const items = proactive.getAttentionItems();
      expect(items.some(i => i.type === 'anomaly')).toBe(false);
    });

    test('should not include WARNING anomalies as attention items', () => {
      proactive._anomalyHistory.push({
        type: 'stale_delegation',
        severity: AnomalySeverity.WARNING,
        description: 'Stale',
        detectedAt: new Date().toISOString(),
      });
      const items = proactive.getAttentionItems();
      expect(items.filter(i => i.type === 'anomaly').length).toBe(0);
    });

    test('should include stale delegations as HIGH priority', () => {
      const p = makeProactive({
        delegationStore: createMockDelegationStore({
          getActiveDelegations: () => [staleDelegation(10)],
        }),
        decisionRecord: createMockDecisionRecord({ getPendingFollowUps: () => [] }),
      });
      const items = p.getAttentionItems();
      expect(items.some(i => i.type === 'stale_delegation')).toBe(true);
      expect(items.find(i => i.type === 'stale_delegation').priority).toBe(AttentionPriority.HIGH);
    });

    test('should include pending follow-ups as MEDIUM priority', () => {
      const p = makeProactive({
        delegationStore: createMockDelegationStore({ getActiveDelegations: () => [] }),
        decisionRecord: createMockDecisionRecord({
          getPendingFollowUps: () => [pendingDecision()],
        }),
      });
      const items = p.getAttentionItems();
      expect(items.some(i => i.type === 'pending_followup')).toBe(true);
      expect(items.find(i => i.type === 'pending_followup').priority).toBe(AttentionPriority.MEDIUM);
    });

    test('should sort by priority (urgent > high > medium > low)', () => {
      const p = makeProactive({
        delegationStore: createMockDelegationStore({
          getActiveDelegations: () => [staleDelegation(10)],
        }),
        decisionRecord: createMockDecisionRecord({
          getPendingFollowUps: () => [pendingDecision()],
        }),
      });
      // Add a critical anomaly for URGENT
      p._anomalyHistory.push({
        type: 'repeated_failure',
        severity: AnomalySeverity.CRITICAL,
        description: 'Critical',
        suggestion: 'Fix',
        detectedAt: new Date().toISOString(),
      });
      const items = p.getAttentionItems();
      expect(items.length).toBeGreaterThanOrEqual(3);
      expect(items[0].priority).toBe(AttentionPriority.URGENT);
      // Stale delegation (HIGH) should come before pending followup (MEDIUM)
      const staleIdx = items.findIndex(i => i.type === 'stale_delegation');
      const pendingIdx = items.findIndex(i => i.type === 'pending_followup');
      expect(staleIdx).toBeLessThan(pendingIdx);
    });

    test('should limit pending follow-ups to 5 items', () => {
      const many = Array.from({ length: 8 }, (_, i) => pendingDecision({ title: `D${i}` }));
      const p = makeProactive({
        delegationStore: createMockDelegationStore({ getActiveDelegations: () => [] }),
        decisionRecord: createMockDecisionRecord({
          getPendingFollowUps: () => many,
        }),
      });
      const items = p.getAttentionItems();
      const pendingItems = items.filter(i => i.type === 'pending_followup');
      expect(pendingItems.length).toBe(5);
    });
  });

  // ===========================================================================
  // 12. getAnomalyHistory
  // ===========================================================================

  describe('getAnomalyHistory', () => {
    beforeEach(() => {
      proactive._anomalyHistory = [
        { type: 'repeated_failure', severity: AnomalySeverity.CRITICAL, detectedAt: new Date().toISOString() },
        { type: 'stale_delegation', severity: AnomalySeverity.WARNING, detectedAt: new Date().toISOString() },
        { type: 'repeated_failure', severity: AnomalySeverity.WARNING, detectedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() },
      ];
    });

    test('should return all anomalies when no filter', () => {
      const result = proactive.getAnomalyHistory();
      expect(result.length).toBe(3);
    });

    test('should filter by severity', () => {
      const result = proactive.getAnomalyHistory({ severity: AnomalySeverity.CRITICAL });
      expect(result.length).toBe(1);
      expect(result[0].severity).toBe(AnomalySeverity.CRITICAL);
    });

    test('should filter by type', () => {
      const result = proactive.getAnomalyHistory({ type: 'stale_delegation' });
      expect(result.length).toBe(1);
      expect(result[0].type).toBe('stale_delegation');
    });

    test('should filter by since date', () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const result = proactive.getAnomalyHistory({ since });
      expect(result.length).toBe(2); // Only the 2 recent ones
    });

    test('should return copies (not references)', () => {
      const result = proactive.getAnomalyHistory();
      expect(result).not.toBe(proactive._anomalyHistory);
    });

    test('should support combined filters', () => {
      const result = proactive.getAnomalyHistory({
        severity: AnomalySeverity.WARNING,
        type: 'stale_delegation',
      });
      expect(result.length).toBe(1);
    });
  });

  // ===========================================================================
  // 13. clearAnomalyHistory
  // ===========================================================================

  describe('clearAnomalyHistory', () => {
    test('should clear all anomaly history', () => {
      proactive._anomalyHistory = [{ type: 'test' }];
      proactive._recentFailures = [{ agent: '@dev' }];
      proactive.clearAnomalyHistory();
      expect(proactive._anomalyHistory).toEqual([]);
      expect(proactive._recentFailures).toEqual([]);
    });

    test('should work when already empty', () => {
      proactive.clearAnomalyHistory();
      expect(proactive._anomalyHistory).toEqual([]);
    });
  });

  // ===========================================================================
  // 14. Events
  // ===========================================================================

  describe('events', () => {
    test('should emit brief.generated on morningBrief', () => {
      const events = [];
      proactive.on('brief.generated', (e) => events.push(e));
      proactive.morningBrief();
      expect(events.length).toBe(1);
      expect(events[0].timeRange).toBe('24h');
    });

    test('should emit anomaly.detected when anomaly found', () => {
      const events = [];
      const p = makeProactive({ thresholds: { repeatedFailuresMin: 1 } });
      p.on('anomaly.detected', (e) => events.push(e));
      p.detectAnomaly({
        type: 'delegation.failed',
        data: { delegatedTo: '@dev', task: 'T1' },
      });
      expect(events.length).toBeGreaterThan(0);
    });

    test('should emit anomaly.critical for critical anomalies', () => {
      const critEvents = [];
      const p = makeProactive({ thresholds: { repeatedFailuresMin: 1 } });
      p.on('anomaly.critical', (e) => critEvents.push(e));
      // Pre-fill to trigger CRITICAL (3+ failures)
      p._recentFailures = [
        { agent: '@dev', timestamp: new Date().toISOString(), task: 'T1' },
        { agent: '@dev', timestamp: new Date().toISOString(), task: 'T2' },
      ];
      p.detectAnomaly({
        type: 'delegation.failed',
        data: { delegatedTo: '@dev', task: 'T3' },
      });
      expect(critEvents.length).toBeGreaterThan(0);
    });

    test('should emit suggestion.generated on suggestNextAction', () => {
      const events = [];
      proactive.on('suggestion.generated', (e) => events.push(e));
      proactive.suggestNextAction();
      expect(events.length).toBe(1);
    });
  });

  // ===========================================================================
  // 15. _formatDuration
  // ===========================================================================

  describe('_formatDuration', () => {
    test('should format milliseconds', () => {
      expect(proactive._formatDuration(500)).toBe('500ms');
    });

    test('should format seconds', () => {
      expect(proactive._formatDuration(5000)).toBe('5s');
    });

    test('should format minutes', () => {
      expect(proactive._formatDuration(120000)).toBe('2min');
    });

    test('should format hours', () => {
      expect(proactive._formatDuration(7200000)).toBe('2h');
    });

    test('should format sub-second as ms', () => {
      expect(proactive._formatDuration(999)).toBe('999ms');
    });

    test('should format exactly 1 second', () => {
      expect(proactive._formatDuration(1000)).toBe('1s');
    });

    test('should format exactly 1 minute', () => {
      expect(proactive._formatDuration(60000)).toBe('1min');
    });

    test('should format exactly 1 hour', () => {
      expect(proactive._formatDuration(3600000)).toBe('1h');
    });
  });

  // ===========================================================================
  // 16. _timeRangeToDate
  // ===========================================================================

  describe('_timeRangeToDate', () => {
    test('should return a Date 24h ago for "24h"', () => {
      const before = Date.now() - 24 * 60 * 60 * 1000;
      const result = proactive._timeRangeToDate('24h');
      expect(result).toBeInstanceOf(Date);
      // Allow 1s tolerance
      expect(Math.abs(result.getTime() - before)).toBeLessThan(1000);
    });

    test('should return a Date 7d ago for "7d"', () => {
      const before = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const result = proactive._timeRangeToDate('7d');
      expect(Math.abs(result.getTime() - before)).toBeLessThan(1000);
    });

    test('should return a Date 30d ago for "30d"', () => {
      const before = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const result = proactive._timeRangeToDate('30d');
      expect(Math.abs(result.getTime() - before)).toBeLessThan(1000);
    });

    test('should default to 24h for unknown range', () => {
      const before = Date.now() - 24 * 60 * 60 * 1000;
      const result = proactive._timeRangeToDate('unknown');
      expect(Math.abs(result.getTime() - before)).toBeLessThan(1000);
    });
  });

  // ===========================================================================
  // 17. _generateSuggestions (via morningBrief)
  // ===========================================================================

  describe('_generateSuggestions', () => {
    test('should suggest decision review when many pending', () => {
      const pending = Array.from({ length: 5 }, () => pendingDecision());
      const p = makeProactive({
        decisionRecord: createMockDecisionRecord({
          getPendingFollowUps: () => pending,
          getDecisionHistory: () => [],
        }),
        delegationStore: createMockDelegationStore({ getActiveDelegations: () => [] }),
      });
      const brief = p.morningBrief();
      expect(brief.sections.suggestions.some(s => s.type === 'decision_review')).toBe(true);
    });

    test('should suggest delegation review when many active', () => {
      const delegations = Array.from({ length: 4 }, (_, i) =>
        staleDelegation(1, { delegationId: `del-${i}` }),
      );
      const p = makeProactive({
        delegationStore: createMockDelegationStore({
          getActiveDelegations: () => delegations,
        }),
        decisionRecord: createMockDecisionRecord({
          getPendingFollowUps: () => [],
          getDecisionHistory: () => [],
        }),
      });
      const brief = p.morningBrief();
      expect(brief.sections.suggestions.some(s => s.type === 'delegation_review')).toBe(true);
    });

    test('should suggest pattern action when patterns detected', () => {
      const p = makeProactive({
        patternEngine: createMockPatternEngine({
          detectRecurringPatterns: () => [{ description: 'Recurring', frequency: 3, category: 'bugs' }],
        }),
        delegationStore: createMockDelegationStore({ getActiveDelegations: () => [] }),
        decisionRecord: createMockDecisionRecord({
          getPendingFollowUps: () => [],
          getDecisionHistory: () => [],
        }),
      });
      const brief = p.morningBrief();
      expect(brief.sections.suggestions.some(s => s.type === 'pattern_action')).toBe(true);
    });

    test('should suggest anomaly resolution for critical anomalies', () => {
      const p = makeProactive({
        delegationStore: createMockDelegationStore({ getActiveDelegations: () => [] }),
        decisionRecord: createMockDecisionRecord({
          getPendingFollowUps: () => [],
          getDecisionHistory: () => [],
        }),
      });
      p._anomalyHistory.push({
        type: 'repeated_failure',
        severity: AnomalySeverity.CRITICAL,
        description: 'Critical failure',
        detectedAt: new Date().toISOString(),
      });
      const brief = p.morningBrief();
      expect(brief.sections.suggestions.some(s => s.type === 'anomaly_resolution')).toBe(true);
    });

    test('should sort suggestions by priority', () => {
      const p = makeProactive({
        patternEngine: createMockPatternEngine({
          detectRecurringPatterns: () => [{ description: 'R', frequency: 1, category: 'x' }],
        }),
        delegationStore: createMockDelegationStore({
          getActiveDelegations: () => Array.from({ length: 5 }, (_, i) =>
            staleDelegation(1, { delegationId: `del-${i}` }),
          ),
        }),
        decisionRecord: createMockDecisionRecord({
          getPendingFollowUps: () => Array.from({ length: 5 }, () => pendingDecision()),
          getDecisionHistory: () => [],
        }),
      });
      // Add critical anomaly
      p._anomalyHistory.push({
        type: 'test',
        severity: AnomalySeverity.CRITICAL,
        description: 'Crit',
        detectedAt: new Date().toISOString(),
      });
      const brief = p.morningBrief();
      const priorities = brief.sections.suggestions.map(s => s.priority);
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      for (let i = 1; i < priorities.length; i++) {
        expect(order[priorities[i]]).toBeGreaterThanOrEqual(order[priorities[i - 1]]);
      }
    });
  });
});
