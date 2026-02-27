/**
 * Gate Evaluator - Integration Tests
 * Story 2.1: Gate Evaluator — Review Gates com Loops
 *
 * Tests GateEvaluator integration with SquadOrchestrator and EventStore
 */

const path = require('path');
const fs = require('fs').promises;
const SquadOrchestrator = require('../../squad-orchestrator');
const { EventStore } = require('../../event-store');
const { GateEvaluator, GateEscalationError } = require('../../gate-evaluator');

describe('Gate Evaluator Integration', () => {
  let orchestrator;
  let eventStore;
  let testRunsDir;
  let testStateDir;

  const gateStep = {
    id: 'review-ad-copy',
    type: 'review_gate',
    reviewer: '@copy-chief',
    max_rounds: 3,
    on_verdict: {
      APPROVED: 'publish-ad',
      REVISION_NEEDED: 'revise-ad-copy',
      REJECTED: 'discard-ad',
    },
  };

  beforeEach(async () => {
    testRunsDir = path.join(__dirname, '.test-gate-integration-runs');
    testStateDir = path.join(__dirname, '.test-gate-integration-state');
    eventStore = new EventStore(testRunsDir);
    orchestrator = new SquadOrchestrator(testStateDir, { eventStore });
    await fs.mkdir(testRunsDir, { recursive: true });
    await fs.mkdir(testStateDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testRunsDir, { recursive: true, force: true });
      await fs.rm(testStateDir, { recursive: true, force: true });
    } catch {
      // Ignora
    }
  });

  describe('SquadOrchestrator.isReviewGate()', () => {
    test('should identify review_gate step type', () => {
      expect(orchestrator.isReviewGate(gateStep)).toBe(true);
    });

    test('should reject non-gate step types', () => {
      expect(orchestrator.isReviewGate({ id: 'task-1', type: 'task_pura' })).toBe(false);
      expect(orchestrator.isReviewGate({ id: 'task-2', type: 'agent_task' })).toBe(false);
    });

    test('should handle null/undefined', () => {
      expect(orchestrator.isReviewGate(null)).toBe(false);
      expect(orchestrator.isReviewGate(undefined)).toBe(false);
    });
  });

  describe('SquadOrchestrator.executeGate()', () => {
    test('should delegate to GateEvaluator and return result', () => {
      const context = {};
      const result = orchestrator.executeGate(gateStep, context, 'run-gate-1', 'APPROVED');

      expect(result.verdict).toBe('APPROVED');
      expect(result.nextStep).toBe('publish-ad');
    });

    test('should track rounds via context', () => {
      const context = {};

      orchestrator.executeGate(gateStep, context, 'run-gate-1', 'REVISION_NEEDED');
      expect(context.gates['review-ad-copy'].rounds).toBe(1);

      orchestrator.executeGate(gateStep, context, 'run-gate-1', 'REVISION_NEEDED');
      expect(context.gates['review-ad-copy'].rounds).toBe(2);
    });

    test('should throw GateEscalationError on max rounds', () => {
      const context = {};

      // 3 revisions, max_rounds: 3
      for (let i = 0; i < 2; i++) {
        orchestrator.executeGate(gateStep, context, 'run-gate-1', 'REVISION_NEEDED');
      }

      expect(() => {
        orchestrator.executeGate(gateStep, context, 'run-gate-1', 'REVISION_NEEDED');
      }).toThrow(GateEscalationError);
    });

    test('should emit events through shared EventStore', async () => {
      const context = {};
      orchestrator.executeGate(gateStep, context, 'run-gate-events', 'APPROVED');

      const events = await eventStore.getEvents('run-gate-events');
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].event).toBe('gate.evaluated');
    });
  });

  describe('SquadOrchestrator.findStepById()', () => {
    const phases = [
      {
        name: 'preparation',
        steps: [
          { id: 'fetch-data', type: 'task_pura' },
          { id: 'review-data', type: 'review_gate' },
        ],
      },
      {
        name: 'production',
        steps: [
          { id: 'generate-copy', type: 'agent_task' },
          { id: 'review-copy', type: 'review_gate' },
          { id: 'publish', type: 'task_pura' },
        ],
      },
    ];

    test('should find step in first phase', () => {
      const result = orchestrator.findStepById(phases, 'fetch-data');
      expect(result).not.toBeNull();
      expect(result.step.id).toBe('fetch-data');
      expect(result.phaseIndex).toBe(0);
      expect(result.stepIndex).toBe(0);
    });

    test('should find step in second phase', () => {
      const result = orchestrator.findStepById(phases, 'review-copy');
      expect(result).not.toBeNull();
      expect(result.step.id).toBe('review-copy');
      expect(result.phaseIndex).toBe(1);
      expect(result.stepIndex).toBe(1);
    });

    test('should return null for unknown step', () => {
      expect(orchestrator.findStepById(phases, 'non-existent')).toBeNull();
    });

    test('should return null for null inputs', () => {
      expect(orchestrator.findStepById(null, 'any')).toBeNull();
      expect(orchestrator.findStepById(phases, null)).toBeNull();
    });
  });

  describe('Full gate loop simulation', () => {
    test('APPROVED on first try → no loop', () => {
      const context = {};
      const result = orchestrator.executeGate(gateStep, context, 'run-sim-1', 'APPROVED');

      expect(result.verdict).toBe('APPROVED');
      expect(result.nextStep).toBe('publish-ad');
      expect(context.gates['review-ad-copy'].rounds).toBe(0);
    });

    test('REVISION_NEEDED then APPROVED → 1 loop', () => {
      const context = {};

      // Round 1: revision needed
      const r1 = orchestrator.executeGate(gateStep, context, 'run-sim-2', 'REVISION_NEEDED');
      expect(r1.nextStep).toBe('revise-ad-copy');

      // Round 2: approved
      const r2 = orchestrator.executeGate(gateStep, context, 'run-sim-2', 'APPROVED');
      expect(r2.nextStep).toBe('publish-ad');
      expect(context.gates['review-ad-copy'].rounds).toBe(1);
    });

    test('Multiple revisions then APPROVED → multiple loops', () => {
      const context = {};

      // 2 revisions
      orchestrator.executeGate(gateStep, context, 'run-sim-3', 'REVISION_NEEDED');
      orchestrator.executeGate(gateStep, context, 'run-sim-3', 'REVISION_NEEDED');

      // Then approved
      const result = orchestrator.executeGate(gateStep, context, 'run-sim-3', 'APPROVED');
      expect(result.verdict).toBe('APPROVED');
      expect(context.gates['review-ad-copy'].rounds).toBe(2);
    });

    test('Max rounds reached → escalation', async () => {
      const context = {};

      // 3 revisions (max_rounds: 3)
      orchestrator.executeGate(gateStep, context, 'run-sim-4', 'REVISION_NEEDED');
      orchestrator.executeGate(gateStep, context, 'run-sim-4', 'REVISION_NEEDED');

      expect(() => {
        orchestrator.executeGate(gateStep, context, 'run-sim-4', 'REVISION_NEEDED');
      }).toThrow(GateEscalationError);

      // Verify escalation event was emitted
      const events = await eventStore.getEvents('run-sim-4', { eventType: 'gate.escalated' });
      expect(events).toHaveLength(1);
    });

    test('REJECTED at any point → goes to reject target', () => {
      const context = {};

      // Some revisions first
      orchestrator.executeGate(gateStep, context, 'run-sim-5', 'REVISION_NEEDED');

      // Then rejected
      const result = orchestrator.executeGate(gateStep, context, 'run-sim-5', 'REJECTED');
      expect(result.verdict).toBe('REJECTED');
      expect(result.nextStep).toBe('discard-ad');
    });
  });

  describe('Event audit trail', () => {
    test('should produce complete audit trail for gate lifecycle', async () => {
      const context = {};
      const runId = 'run-audit-trail';

      // Round 1: REVISION_NEEDED
      orchestrator.executeGate(gateStep, context, runId, 'REVISION_NEEDED');

      // Round 2: APPROVED
      orchestrator.executeGate(gateStep, context, runId, 'APPROVED');

      const events = await eventStore.getEvents(runId);
      expect(events).toHaveLength(2);

      // First event: REVISION_NEEDED
      expect(events[0].event).toBe('gate.evaluated');
      expect(events[0].data.verdict).toBe('REVISION_NEEDED');
      expect(events[0].data.round).toBe(1);

      // Second event: APPROVED
      expect(events[1].event).toBe('gate.evaluated');
      expect(events[1].data.verdict).toBe('APPROVED');
      expect(events[1].data.round).toBe(1); // rounds stays at 1 after last REVISION_NEEDED
    });
  });
});
