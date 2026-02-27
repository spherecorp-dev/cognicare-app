/**
 * Gate Evaluator - Unit Tests
 * Story 2.1: Gate Evaluator — Review Gates com Loops
 */

const path = require('path');
const fs = require('fs').promises;
const { GateEvaluator, GateEscalationError, VALID_VERDICTS, DEFAULT_MAX_ROUNDS, MAX_ROUNDS_HARD_CAP } = require('../gate-evaluator');
const { EventStore } = require('../event-store');

describe('GateEvaluator', () => {
  let eventStore;
  let testRunsDir;

  const validGateConfig = {
    id: 'review-image-concept',
    type: 'review_gate',
    reviewer: '@copy-chief',
    max_rounds: 2,
    on_verdict: {
      APPROVED: 'generate_image_prompts',
      REVISION_NEEDED: 'image_revision_loop',
      REJECTED: 'discard_concept',
    },
  };

  beforeEach(async () => {
    testRunsDir = path.join(__dirname, '.test-gate-runs');
    eventStore = new EventStore(testRunsDir);
    await fs.mkdir(testRunsDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testRunsDir, { recursive: true, force: true });
    } catch {
      // Ignora erros de remoção
    }
  });

  describe('validateGateConfig', () => {
    test('should accept valid gate config', () => {
      expect(() => GateEvaluator.validateGateConfig(validGateConfig)).not.toThrow();
    });

    test('should reject null config', () => {
      expect(() => GateEvaluator.validateGateConfig(null))
        .toThrow('Gate config is required and must be an object');
    });

    test('should reject config missing required fields', () => {
      expect(() => GateEvaluator.validateGateConfig({ id: 'test' }))
        .toThrow('Gate config missing required fields: type, reviewer, on_verdict');
    });

    test('should reject wrong type', () => {
      expect(() => GateEvaluator.validateGateConfig({ ...validGateConfig, type: 'task_pura' }))
        .toThrow('Gate type must be "review_gate"');
    });

    test('should reject on_verdict missing required verdicts', () => {
      const config = {
        ...validGateConfig,
        on_verdict: { APPROVED: 'next' },
      };
      expect(() => GateEvaluator.validateGateConfig(config))
        .toThrow('on_verdict missing required verdicts: REVISION_NEEDED, REJECTED');
    });

    test('should reject max_rounds less than 1', () => {
      expect(() => GateEvaluator.validateGateConfig({ ...validGateConfig, max_rounds: 0 }))
        .toThrow('max_rounds must be a positive number');
    });

    test('should reject max_rounds exceeding hard cap', () => {
      expect(() => GateEvaluator.validateGateConfig({ ...validGateConfig, max_rounds: 11 }))
        .toThrow(`max_rounds cannot exceed ${MAX_ROUNDS_HARD_CAP}`);
    });

    test('should accept config without max_rounds (uses default)', () => {
      const { max_rounds, ...configWithoutMaxRounds } = validGateConfig;
      expect(() => GateEvaluator.validateGateConfig(configWithoutMaxRounds)).not.toThrow();
    });
  });

  describe('evaluateReviewGate - APPROVED verdict', () => {
    test('should return next step from on_verdict.APPROVED', () => {
      const context = {};
      const result = GateEvaluator.evaluateReviewGate(
        validGateConfig, context, eventStore, 'run-123', 'APPROVED'
      );

      expect(result.verdict).toBe('APPROVED');
      expect(result.nextStep).toBe('generate_image_prompts');
    });

    test('should initialize gate tracking in context', () => {
      const context = {};
      GateEvaluator.evaluateReviewGate(
        validGateConfig, context, eventStore, 'run-123', 'APPROVED'
      );

      expect(context.gates).toBeDefined();
      expect(context.gates['review-image-concept']).toBeDefined();
      expect(context.gates['review-image-concept'].rounds).toBe(0);
    });

    test('should emit gate.evaluated event', async () => {
      const context = {};
      GateEvaluator.evaluateReviewGate(
        validGateConfig, context, eventStore, 'run-123', 'APPROVED'
      );

      const events = await eventStore.getEvents('run-123');
      expect(events).toHaveLength(1);
      expect(events[0].event).toBe('gate.evaluated');
      expect(events[0].data.gateId).toBe('review-image-concept');
      expect(events[0].data.verdict).toBe('APPROVED');
      expect(events[0].data.round).toBe(0);
      expect(events[0].data.max_rounds).toBe(2);
      expect(events[0].data.reviewer).toBe('@copy-chief');
    });
  });

  describe('evaluateReviewGate - REVISION_NEEDED verdict', () => {
    test('should increment rounds counter', () => {
      const context = {};
      const result = GateEvaluator.evaluateReviewGate(
        validGateConfig, context, eventStore, 'run-123', 'REVISION_NEEDED'
      );

      expect(result.verdict).toBe('REVISION_NEEDED');
      expect(result.nextStep).toBe('image_revision_loop');
      expect(context.gates['review-image-concept'].rounds).toBe(1);
    });

    test('should increment rounds on each REVISION_NEEDED', () => {
      const context = {};

      // Round 1
      GateEvaluator.evaluateReviewGate(
        validGateConfig, context, eventStore, 'run-123', 'REVISION_NEEDED'
      );
      expect(context.gates['review-image-concept'].rounds).toBe(1);

      // Round 2 → should escalate (max_rounds: 2)
      expect(() => {
        GateEvaluator.evaluateReviewGate(
          validGateConfig, context, eventStore, 'run-123', 'REVISION_NEEDED'
        );
      }).toThrow(GateEscalationError);
    });

    test('should return loop target step', () => {
      const context = {};
      const result = GateEvaluator.evaluateReviewGate(
        validGateConfig, context, eventStore, 'run-123', 'REVISION_NEEDED'
      );
      expect(result.nextStep).toBe('image_revision_loop');
    });
  });

  describe('evaluateReviewGate - REVISION_NEEDED escalation', () => {
    test('should throw GateEscalationError when max rounds reached', () => {
      const context = {};

      // Exhaust round 1
      GateEvaluator.evaluateReviewGate(
        validGateConfig, context, eventStore, 'run-123', 'REVISION_NEEDED'
      );

      // Round 2 (max_rounds: 2) → escalation
      expect(() => {
        GateEvaluator.evaluateReviewGate(
          validGateConfig, context, eventStore, 'run-123', 'REVISION_NEEDED'
        );
      }).toThrow(GateEscalationError);
    });

    test('should set correct properties on GateEscalationError', () => {
      const context = {};

      GateEvaluator.evaluateReviewGate(
        validGateConfig, context, eventStore, 'run-123', 'REVISION_NEEDED'
      );

      try {
        GateEvaluator.evaluateReviewGate(
          validGateConfig, context, eventStore, 'run-123', 'REVISION_NEEDED'
        );
        fail('Should have thrown GateEscalationError');
      } catch (error) {
        expect(error).toBeInstanceOf(GateEscalationError);
        expect(error.gateId).toBe('review-image-concept');
        expect(error.round).toBe(2);
        expect(error.reason).toBe('max_rounds_reached');
      }
    });

    test('should emit gate.escalated event before throwing', async () => {
      const context = {};

      GateEvaluator.evaluateReviewGate(
        validGateConfig, context, eventStore, 'run-123', 'REVISION_NEEDED'
      );

      try {
        GateEvaluator.evaluateReviewGate(
          validGateConfig, context, eventStore, 'run-123', 'REVISION_NEEDED'
        );
      } catch {
        // Expected
      }

      const events = await eventStore.getEvents('run-123', { eventType: 'gate.escalated' });
      expect(events).toHaveLength(1);
      expect(events[0].data.gateId).toBe('review-image-concept');
      expect(events[0].data.round).toBe(2);
      expect(events[0].data.reason).toBe('max_rounds_reached');
    });

    test('should use default max_rounds (3) when not configured', () => {
      const { max_rounds, ...configNoMaxRounds } = validGateConfig;
      const context = {};

      // 3 rounds without escalation
      for (let i = 0; i < DEFAULT_MAX_ROUNDS - 1; i++) {
        GateEvaluator.evaluateReviewGate(
          configNoMaxRounds, context, eventStore, 'run-123', 'REVISION_NEEDED'
        );
      }

      // Round 3 → escalation
      expect(() => {
        GateEvaluator.evaluateReviewGate(
          configNoMaxRounds, context, eventStore, 'run-123', 'REVISION_NEEDED'
        );
      }).toThrow(GateEscalationError);

      expect(context.gates['review-image-concept'].rounds).toBe(DEFAULT_MAX_ROUNDS);
    });
  });

  describe('evaluateReviewGate - REJECTED verdict', () => {
    test('should return reject target from on_verdict.REJECTED', () => {
      const context = {};
      const result = GateEvaluator.evaluateReviewGate(
        validGateConfig, context, eventStore, 'run-123', 'REJECTED'
      );

      expect(result.verdict).toBe('REJECTED');
      expect(result.nextStep).toBe('discard_concept');
    });

    test('should not increment rounds counter on REJECTED', () => {
      const context = {};
      GateEvaluator.evaluateReviewGate(
        validGateConfig, context, eventStore, 'run-123', 'REJECTED'
      );
      expect(context.gates['review-image-concept'].rounds).toBe(0);
    });
  });

  describe('evaluateReviewGate - invalid inputs', () => {
    test('should throw on invalid verdict', () => {
      const context = {};
      expect(() => {
        GateEvaluator.evaluateReviewGate(
          validGateConfig, context, eventStore, 'run-123', 'INVALID'
        );
      }).toThrow('Invalid verdict "INVALID"');
    });

    test('should throw on invalid gate config', () => {
      const context = {};
      expect(() => {
        GateEvaluator.evaluateReviewGate(
          null, context, eventStore, 'run-123', 'APPROVED'
        );
      }).toThrow('Gate config is required');
    });
  });

  describe('evaluateReviewGate - event emission', () => {
    test('should emit gate.evaluated on every verdict', async () => {
      const context = {};

      GateEvaluator.evaluateReviewGate(validGateConfig, context, eventStore, 'run-1', 'APPROVED');
      GateEvaluator.evaluateReviewGate(validGateConfig, context, eventStore, 'run-2', 'REJECTED');
      GateEvaluator.evaluateReviewGate(validGateConfig, context, eventStore, 'run-3', 'REVISION_NEEDED');

      const events1 = await eventStore.getEvents('run-1');
      const events2 = await eventStore.getEvents('run-2');
      const events3 = await eventStore.getEvents('run-3');

      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);
      expect(events3).toHaveLength(1);

      expect(events1[0].event).toBe('gate.evaluated');
      expect(events2[0].event).toBe('gate.evaluated');
      expect(events3[0].event).toBe('gate.evaluated');
    });

    test('should silently handle event emission failure', () => {
      const brokenEventStore = {
        append: () => { throw new Error('Write failed'); },
      };
      const context = {};

      // Should NOT throw despite event store failure
      expect(() => {
        GateEvaluator.evaluateReviewGate(
          validGateConfig, context, brokenEventStore, 'run-123', 'APPROVED'
        );
      }).not.toThrow();
    });

    test('should work without eventStore', () => {
      const context = {};
      const result = GateEvaluator.evaluateReviewGate(
        validGateConfig, context, null, 'run-123', 'APPROVED'
      );
      expect(result.verdict).toBe('APPROVED');
    });
  });

  describe('multiple gates in same context', () => {
    test('should track rounds independently per gate', () => {
      const context = {};

      const gate1 = { ...validGateConfig, id: 'gate-1', max_rounds: 3 };
      const gate2 = { ...validGateConfig, id: 'gate-2', max_rounds: 3 };

      // Gate 1: 2 revisions
      GateEvaluator.evaluateReviewGate(gate1, context, eventStore, 'run-1', 'REVISION_NEEDED');
      GateEvaluator.evaluateReviewGate(gate1, context, eventStore, 'run-1', 'REVISION_NEEDED');

      // Gate 2: 1 revision
      GateEvaluator.evaluateReviewGate(gate2, context, eventStore, 'run-1', 'REVISION_NEEDED');

      expect(context.gates['gate-1'].rounds).toBe(2);
      expect(context.gates['gate-2'].rounds).toBe(1);
    });
  });

  describe('GateEscalationError', () => {
    test('should have correct name', () => {
      const error = new GateEscalationError('gate-1', 3);
      expect(error.name).toBe('GateEscalationError');
    });

    test('should be instance of Error', () => {
      const error = new GateEscalationError('gate-1', 3);
      expect(error).toBeInstanceOf(Error);
    });

    test('should have gateId, round, and reason properties', () => {
      const error = new GateEscalationError('gate-1', 3, 'max_rounds_reached');
      expect(error.gateId).toBe('gate-1');
      expect(error.round).toBe(3);
      expect(error.reason).toBe('max_rounds_reached');
    });

    test('should include gate info in message', () => {
      const error = new GateEscalationError('gate-1', 3);
      expect(error.message).toContain('gate-1');
      expect(error.message).toContain('3');
    });
  });

  describe('constants', () => {
    test('VALID_VERDICTS should contain 3 verdicts', () => {
      expect(VALID_VERDICTS).toEqual(['APPROVED', 'REVISION_NEEDED', 'REJECTED']);
    });

    test('DEFAULT_MAX_ROUNDS should be 3', () => {
      expect(DEFAULT_MAX_ROUNDS).toBe(3);
    });

    test('MAX_ROUNDS_HARD_CAP should be 10', () => {
      expect(MAX_ROUNDS_HARD_CAP).toBe(10);
    });
  });
});
