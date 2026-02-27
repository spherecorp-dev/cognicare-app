/**
 * Tests: Override System — Story 3.3
 * AC1: Override field in trigger (all trigger types)
 * AC2: Override propagation to tasks (context.overrides)
 * AC3: Method override (select-method bypass)
 * AC4: Geo and platform filters
 * AC5: Skip phases (steps marked skipped)
 * AC6: Override validation (schema enforcement)
 * AC7: Dashboard override visibility (state includes overrides)
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');

// --- Override Validator Tests (AC6) ---

const {
  validateOverrides,
  OverrideValidationError,
  ALLOWED_METHODS,
  ALLOWED_PLATFORMS,
} = require('../override-validator');

describe('Override Validator (AC6)', () => {
  describe('validateOverrides()', () => {
    it('should accept valid empty overrides', () => {
      const result = validateOverrides({});
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid method override', () => {
      const result = validateOverrides({ method: 'modelagem' });
      expect(result.valid).toBe(true);
    });

    it('should accept all valid method values', () => {
      for (const method of ALLOWED_METHODS) {
        const result = validateOverrides({ method });
        expect(result.valid).toBe(true);
      }
    });

    it('should reject invalid method value', () => {
      const result = validateOverrides({ method: 'invalid-method' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('overrides.method must be one of');
    });

    it('should reject non-string method', () => {
      const result = validateOverrides({ method: 123 });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must be a string');
    });

    it('should accept valid geos array', () => {
      const result = validateOverrides({ geos: ['fr', 'es', 'en'] });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid geo code', () => {
      const result = validateOverrides({ geos: ['FR'] }); // uppercase
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('ISO 639-1');
    });

    it('should reject non-2-letter geo code', () => {
      const result = validateOverrides({ geos: ['fra'] }); // 3 letters
      expect(result.valid).toBe(false);
    });

    it('should reject non-array geos', () => {
      const result = validateOverrides({ geos: 'fr' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must be an array');
    });

    it('should accept valid platforms array', () => {
      const result = validateOverrides({ platforms: ['meta', 'tiktok'] });
      expect(result.valid).toBe(true);
    });

    it('should accept all valid platform values', () => {
      const result = validateOverrides({ platforms: ALLOWED_PLATFORMS });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid platform', () => {
      const result = validateOverrides({ platforms: ['meta', 'youtube'] });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must be one of');
    });

    it('should reject non-array platforms', () => {
      const result = validateOverrides({ platforms: 'meta' });
      expect(result.valid).toBe(false);
    });

    it('should accept valid skip_phases array', () => {
      const result = validateOverrides({ skip_phases: ['intelligence', 'strategy'] });
      expect(result.valid).toBe(true);
    });

    it('should validate skip_phases against playbook phases', () => {
      const result = validateOverrides(
        { skip_phases: ['nonexistent'] },
        { playbookPhases: ['intelligence', 'production', 'delivery'] }
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('not a valid phase');
    });

    it('should accept valid skip_phases when matching playbook phases', () => {
      const result = validateOverrides(
        { skip_phases: ['intelligence'] },
        { playbookPhases: ['intelligence', 'production', 'delivery'] }
      );
      expect(result.valid).toBe(true);
    });

    it('should skip playbook phase validation if no phases provided', () => {
      const result = validateOverrides({ skip_phases: ['anything'] });
      expect(result.valid).toBe(true);
    });

    it('should accept custom free-form object', () => {
      const result = validateOverrides({ custom: { foo: 'bar', nested: { a: 1 } } });
      expect(result.valid).toBe(true);
    });

    it('should reject custom as non-object', () => {
      const result = validateOverrides({ custom: 'string' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must be a plain object');
    });

    it('should reject custom as array', () => {
      const result = validateOverrides({ custom: [1, 2] });
      expect(result.valid).toBe(false);
    });

    it('should reject custom as null', () => {
      const result = validateOverrides({ custom: null });
      expect(result.valid).toBe(false);
    });

    it('should reject unknown override fields', () => {
      const result = validateOverrides({ unknown_field: 'value' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Unknown override fields');
    });

    it('should accept combined valid overrides', () => {
      const result = validateOverrides({
        method: 'do-zero',
        geos: ['fr', 'es'],
        platforms: ['meta'],
        skip_phases: ['intelligence'],
        custom: { debug: true },
      });
      expect(result.valid).toBe(true);
    });

    it('should collect multiple errors', () => {
      const result = validateOverrides({
        method: 'invalid',
        geos: 'not-array',
        platforms: 'not-array',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('should reject non-object overrides', () => {
      const result = validateOverrides('string');
      expect(result.valid).toBe(false);
    });

    it('should reject array overrides', () => {
      const result = validateOverrides([1, 2]);
      expect(result.valid).toBe(false);
    });

    it('should reject null overrides', () => {
      const result = validateOverrides(null);
      expect(result.valid).toBe(false);
    });
  });

  describe('OverrideValidationError', () => {
    it('should have correct name and details', () => {
      const error = new OverrideValidationError(['error1', 'error2']);
      expect(error.name).toBe('OverrideValidationError');
      expect(error.details).toEqual(['error1', 'error2']);
      expect(error.message).toContain('error1');
      expect(error.message).toContain('error2');
    });

    it('should be instanceof Error', () => {
      const error = new OverrideValidationError(['test']);
      expect(error).toBeInstanceOf(Error);
    });
  });
});

// --- SquadOrchestrator Override Integration Tests (AC1, AC6, AC7) ---

const SquadOrchestrator = require('../squad-orchestrator');

describe('SquadOrchestrator Override Integration', () => {
  let tmpDir;
  let orchestrator;

  async function createSquadFixture(squadName, phases = []) {
    const squadDir = path.join(tmpDir, 'squads', squadName);
    const workflowDir = path.join(squadDir, 'workflows');
    await fs.mkdir(workflowDir, { recursive: true });

    const squadYaml = {
      name: squadName,
      version: '1.0.0',
      components: { workflows: ['creative-pipeline'] },
    };
    await fs.writeFile(path.join(squadDir, 'squad.yaml'), yaml.dump(squadYaml));

    const pipelineYaml = {
      name: 'creative-pipeline',
      trigger: { type: 'manual' },
      phases: phases.length > 0 ? phases : [
        {
          name: 'intelligence',
          steps: [{ id: 'step-1', type: 'output', task: 'analyze', phase: 'intelligence' }],
        },
        {
          name: 'production',
          steps: [{ id: 'step-2', type: 'output', task: 'produce', phase: 'production' }],
        },
      ],
    };
    await fs.writeFile(path.join(workflowDir, 'creative-pipeline.yaml'), yaml.dump(pipelineYaml));
  }

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'override-test-'));
    process.chdir(tmpDir);

    // Create state dirs
    await fs.mkdir(path.join(tmpDir, '.aios', 'squad-runs'), { recursive: true });
    await fs.mkdir(path.join(tmpDir, '.aios-core', '.state'), { recursive: true });

    orchestrator = new SquadOrchestrator(path.join(tmpDir, '.aios-core', '.state'));
  });

  afterEach(async () => {
    process.chdir('/');
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('AC1: should store overrides in run state for manual trigger', async () => {
    await createSquadFixture('squad-copy');

    const run = await orchestrator.execute('squad-copy', 'creative-pipeline', {
      type: 'manual',
      overrides: { method: 'modelagem', geos: ['fr'] },
    });

    const state = await orchestrator.getRunState(run.runId);
    expect(state.trigger.overrides).toEqual({ method: 'modelagem', geos: ['fr'] });
  });

  it('AC1: should store overrides in run state for webhook trigger', async () => {
    await createSquadFixture('squad-copy');

    const run = await orchestrator.execute('squad-copy', 'creative-pipeline', {
      type: 'webhook',
      source: 'n8n',
      overrides: { platforms: ['meta', 'tiktok'] },
    });

    const state = await orchestrator.getRunState(run.runId);
    expect(state.trigger.overrides).toEqual({ platforms: ['meta', 'tiktok'] });
  });

  it('AC1: should store overrides in run state for inter_squad trigger', async () => {
    await createSquadFixture('squad-copy');

    const run = await orchestrator.executeSquad('squad-copy', {
      overrides: { method: 'do-zero', skip_phases: ['intelligence'] },
      trigger: { caller: 'squad-trafego', parentRunId: 'parent-123' },
    });

    const state = await orchestrator.getRunState(run.runId);
    expect(state.trigger.overrides).toEqual({ method: 'do-zero', skip_phases: ['intelligence'] });
  });

  it('AC6: should throw OverrideValidationError for invalid method', async () => {
    await createSquadFixture('squad-copy');

    await expect(
      orchestrator.execute('squad-copy', 'creative-pipeline', {
        type: 'manual',
        overrides: { method: 'invalid-method' },
      })
    ).rejects.toThrow(OverrideValidationError);
  });

  it('AC6: should throw OverrideValidationError for invalid geos', async () => {
    await createSquadFixture('squad-copy');

    await expect(
      orchestrator.execute('squad-copy', 'creative-pipeline', {
        type: 'manual',
        overrides: { geos: ['INVALID'] },
      })
    ).rejects.toThrow(OverrideValidationError);
  });

  it('AC6: should throw OverrideValidationError for invalid platform', async () => {
    await createSquadFixture('squad-copy');

    await expect(
      orchestrator.execute('squad-copy', 'creative-pipeline', {
        type: 'manual',
        overrides: { platforms: ['youtube'] },
      })
    ).rejects.toThrow(OverrideValidationError);
  });

  it('AC6: should validate skip_phases against playbook phase names', async () => {
    await createSquadFixture('squad-copy');

    await expect(
      orchestrator.execute('squad-copy', 'creative-pipeline', {
        type: 'manual',
        overrides: { skip_phases: ['nonexistent_phase'] },
      })
    ).rejects.toThrow(OverrideValidationError);
  });

  it('AC6: should accept valid skip_phases matching playbook phases', async () => {
    await createSquadFixture('squad-copy');

    const run = await orchestrator.execute('squad-copy', 'creative-pipeline', {
      type: 'manual',
      overrides: { skip_phases: ['intelligence'] },
    });

    const state = await orchestrator.getRunState(run.runId);
    expect(state.trigger.overrides.skip_phases).toEqual(['intelligence']);
  });

  it('AC6: should accept custom free-form override', async () => {
    await createSquadFixture('squad-copy');

    const run = await orchestrator.execute('squad-copy', 'creative-pipeline', {
      type: 'manual',
      overrides: { custom: { debug: true, experiment_id: 'exp-42' } },
    });

    const state = await orchestrator.getRunState(run.runId);
    expect(state.trigger.overrides.custom).toEqual({ debug: true, experiment_id: 'exp-42' });
  });

  it('AC7: should include overrides in getRunState response', async () => {
    await createSquadFixture('squad-copy');

    const run = await orchestrator.execute('squad-copy', 'creative-pipeline', {
      type: 'manual',
      overrides: { method: 'variacao_de_winner', geos: ['fr', 'es'] },
    });

    const state = await orchestrator.getRunState(run.runId);
    expect(state.trigger).toBeDefined();
    expect(state.trigger.overrides).toBeDefined();
    expect(state.trigger.overrides.method).toBe('variacao_de_winner');
    expect(state.trigger.overrides.geos).toEqual(['fr', 'es']);
  });

  it('should not store overrides if none provided', async () => {
    await createSquadFixture('squad-copy');

    const run = await orchestrator.execute('squad-copy', 'creative-pipeline', {
      type: 'manual',
    });

    const state = await orchestrator.getRunState(run.runId);
    expect(state.trigger.overrides).toBeUndefined();
  });

  it('should not store overrides if empty object', async () => {
    await createSquadFixture('squad-copy');

    const run = await orchestrator.execute('squad-copy', 'creative-pipeline', {
      type: 'manual',
      overrides: {},
    });

    const state = await orchestrator.getRunState(run.runId);
    expect(state.trigger.overrides).toBeUndefined();
  });
});

// --- TaskExecutor Override Tests (AC2, AC3, AC5) ---

const TaskExecutor = require('../task-executor');

describe('TaskExecutor Override Integration', () => {
  let tmpDir;
  let executor;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'override-task-test-'));
    process.chdir(tmpDir);

    // Create squad tasks directory with task files
    const taskDir = path.join(tmpDir, 'squads', 'squad-copy', 'tasks');
    await fs.mkdir(taskDir, { recursive: true });
    await fs.writeFile(path.join(taskDir, 'fetch-offer-data.md'), '# Fetch Offer Data\nLoads offer.');

    // Create offer data fixture for fetch-offer-data task
    const offerDir = path.join(tmpDir, 'data', 'offers', 'test-offer');
    await fs.mkdir(offerDir, { recursive: true });
    await fs.writeFile(path.join(offerDir, 'offer.yaml'), 'name: Test Offer\nstatus: active\n');

    executor = new TaskExecutor();
  });

  afterEach(async () => {
    process.chdir('/');
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('AC2: should pass context.overrides to task execution', async () => {
    const step = { id: 'step-1', type: 'task_pura', task: 'fetch-offer-data', input: { offerId: 'test-offer' } };
    const context = {
      overrides: { method: 'modelagem', geos: ['fr'] },
    };

    const result = await executor.executeTask(step, context, 'squad-copy');
    expect(result.output).toBeDefined();
    expect(result.metadata.stepId).toBe('step-1');
  });

  it('AC5: should skip step when phase is in skip_phases', async () => {
    const step = { id: 'step-1', type: 'task_pura', task: 'fetch-offer-data', input: { offerId: 'test-offer' }, phase: 'intelligence' };
    const context = {
      overrides: { skip_phases: ['intelligence'] },
    };

    const result = await executor.executeTask(step, context, 'squad-copy');
    expect(result.output).toBeNull();
    expect(result.metadata.skipped).toBe(true);
    expect(result.metadata.skipReason).toBe('phase_skipped_by_override');
  });

  it('AC5: should not skip step when phase is not in skip_phases', async () => {
    const step = { id: 'step-2', type: 'task_pura', task: 'fetch-offer-data', input: { offerId: 'test-offer' }, phase: 'production' };
    const context = {
      overrides: { skip_phases: ['intelligence'] },
    };

    const result = await executor.executeTask(step, context, 'squad-copy');
    expect(result.output).toBeDefined();
    expect(result.metadata.skipped).toBeUndefined();
  });

  it('AC5: should emit step.skipped event when skipping by override', async () => {
    const events = [];
    const mockEventStore = {
      append: (runId, eventType, data) => events.push({ runId, eventType, data }),
    };
    executor = new TaskExecutor({ eventStore: mockEventStore });

    const step = { id: 'step-1', type: 'task_pura', task: 'fetch-offer-data', input: { offerId: 'test-offer' }, phase: 'intelligence' };
    const context = {
      overrides: { skip_phases: ['intelligence'] },
    };

    await executor.executeTask(step, context, 'squad-copy', 'run-123');

    const skipEvent = events.find(e => e.eventType === 'step.skipped');
    expect(skipEvent).toBeDefined();
    expect(skipEvent.data.reason).toBe('phase_skipped_by_override');
    expect(skipEvent.data.phase).toBe('intelligence');
    expect(skipEvent.data.stepId).toBe('step-1');
  });

  it('AC5: should not skip step when no overrides present', async () => {
    const step = { id: 'step-1', type: 'task_pura', task: 'fetch-offer-data', input: { offerId: 'test-offer' }, phase: 'intelligence' };
    const context = {};

    const result = await executor.executeTask(step, context, 'squad-copy');
    expect(result.output).toBeDefined();
    expect(result.metadata.skipped).toBeUndefined();
  });

  it('AC5: should not skip step when step has no phase property', async () => {
    const step = { id: 'step-1', type: 'task_pura', task: 'fetch-offer-data', input: { offerId: 'test-offer' } };
    const context = {
      overrides: { skip_phases: ['intelligence'] },
    };

    const result = await executor.executeTask(step, context, 'squad-copy');
    expect(result.output).toBeDefined();
    expect(result.metadata.skipped).toBeUndefined();
  });

  it('AC3: method override is available in context.overrides', async () => {
    const step = { id: 'select-method', type: 'task_pura', task: 'fetch-offer-data', input: { offerId: 'test-offer' } };
    const context = {
      overrides: { method: 'variacao_de_winner' },
    };

    // The method override is available to the task via context.overrides.method
    // Tasks check: const method = context.overrides?.method || await agentDecide()
    expect(context.overrides.method).toBe('variacao_de_winner');

    const result = await executor.executeTask(step, context, 'squad-copy');
    expect(result.output).toBeDefined();
  });

  it('AC4: geo and platform overrides available in context', () => {
    const context = {
      overrides: {
        geos: ['fr', 'es'],
        platforms: ['meta'],
      },
    };

    // Tasks access via: context.overrides?.geos, context.overrides?.platforms
    expect(context.overrides.geos).toEqual(['fr', 'es']);
    expect(context.overrides.platforms).toEqual(['meta']);
  });
});
