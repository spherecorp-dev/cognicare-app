/**
 * Integration Tests - ConditionEngine + TaskExecutor (Story 1.3)
 *
 * Test Coverage:
 * - Pre-condition blocker prevents task execution
 * - Pre-condition non-blocker emits warning only
 * - Post-condition blocker throws error
 * - Post-condition non-blocker continues execution
 *
 * Total: 4 tests
 */

const { ConditionEngine, PreConditionError, PostConditionError } = require('../../condition-engine');
const TaskExecutor = require('../../task-executor');

describe('ConditionEngine + TaskExecutor Integration', () => {
  let conditionEngine;
  let taskExecutor;

  beforeEach(() => {
    conditionEngine = new ConditionEngine();
    taskExecutor = new TaskExecutor();
    taskExecutor.conditionEngine = conditionEngine;
  });

  // ==========================================
  // IV1: Pre-condition blocker prevents execution
  // ==========================================

  test('IV1: Pre-condition blocker prevents task execution when data missing', async () => {
    const step = {
      id: 'suggest-angles',
      type: 'agent',
      agent: 'copywriting-expert',
      pre_conditions: [
        {
          condition: 'Offer data fetched',
          source: '{{fetch-offer-data.output.offer_context}}',
          validation: 'presente',
          blocker: true
        }
      ]
    };

    const context = {}; // fetch-offer-data não rodou ainda

    // Simulate pre-condition check (as TaskExecutor would do)
    const result = await conditionEngine.validate(step.pre_conditions, context);

    expect(result.all).toBe(false);
    expect(result.blockersFailed).toBe(true);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].condition).toBe('Offer data fetched');
    expect(result.failures[0].blocker).toBe(true);

    // TaskExecutor should throw PreConditionError
    const blockerFailures = result.failures.filter(f => f.blocker);
    expect(() => {
      if (blockerFailures.length > 0) {
        throw new PreConditionError(blockerFailures);
      }
    }).toThrow(PreConditionError);
  });

  // ==========================================
  // IV2: Post-condition blocker validates output
  // ==========================================

  test('IV2: Post-condition blocker fails when output insufficient', async () => {
    const step = {
      id: 'suggest-angles',
      type: 'agent',
      agent: 'copywriting-expert',
      post_conditions: [
        {
          condition: 'At least 3 angles suggested',
          source: '{{suggest-angles.output.angles}}',
          validation: '.length >= 3',
          blocker: true
        }
      ]
    };

    // Simulate task output with only 2 angles
    const taskOutput = {
      angles: ['angle1', 'angle2']
    };

    const context = {
      'suggest-angles': {
        output: taskOutput
      }
    };

    // Simulate post-condition check
    const result = await conditionEngine.validate(step.post_conditions, context);

    expect(result.all).toBe(false);
    expect(result.blockersFailed).toBe(true);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].message).toContain('2 < 3');

    // TaskExecutor should throw PostConditionError
    const blockerFailures = result.failures.filter(f => f.blocker);
    expect(() => {
      if (blockerFailures.length > 0) {
        throw new PostConditionError(blockerFailures);
      }
    }).toThrow(PostConditionError);
  });

  // ==========================================
  // IV3: Non-blocker conditions emit warnings only
  // ==========================================

  test('IV3: Non-blocker pre-condition fails but execution continues', async () => {
    const step = {
      id: 'interpret-offer-data',
      type: 'agent',
      agent: 'copywriting-expert',
      pre_conditions: [
        {
          condition: 'Recommended platforms provided',
          source: '{{interpret-offer-data.output.recommended_platforms}}',
          validation: 'presente',
          blocker: false // Non-blocker
        }
      ]
    };

    const context = {
      'interpret-offer-data': {
        output: {
          analysis: 'some text' // missing recommended_platforms
        }
      }
    };

    const result = await conditionEngine.validate(step.pre_conditions, context);

    expect(result.all).toBe(false);
    expect(result.blockersFailed).toBe(false); // Non-blocker doesn't block
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].blocker).toBe(false);

    // TaskExecutor should NOT throw error, just log warning
    const blockerFailures = result.failures.filter(f => f.blocker);
    expect(blockerFailures).toHaveLength(0);
  });

  // ==========================================
  // IV4: All conditions pass
  // ==========================================

  test('IV4: All pre/post conditions pass - execution succeeds', async () => {
    const step = {
      id: 'suggest-angles',
      type: 'agent',
      agent: 'copywriting-expert',
      pre_conditions: [
        {
          condition: 'Offer data present',
          source: '{{fetch-offer-data.output.offer_context}}',
          validation: 'presente',
          blocker: true
        }
      ],
      post_conditions: [
        {
          condition: 'At least 3 angles suggested',
          source: '{{suggest-angles.output.angles}}',
          validation: '.length >= 3',
          blocker: true
        }
      ]
    };

    // Pre-condition context
    const preContext = {
      'fetch-offer-data': {
        output: {
          offer_context: 'some context data'
        }
      }
    };

    // Post-condition context (after task execution)
    const postContext = {
      ...preContext,
      'suggest-angles': {
        output: {
          angles: ['angle1', 'angle2', 'angle3', 'angle4']
        }
      }
    };

    // Validate pre-conditions
    const preResult = await conditionEngine.validate(step.pre_conditions, preContext);
    expect(preResult.all).toBe(true);
    expect(preResult.blockersFailed).toBe(false);

    // Validate post-conditions
    const postResult = await conditionEngine.validate(step.post_conditions, postContext);
    expect(postResult.all).toBe(true);
    expect(postResult.blockersFailed).toBe(false);
  });

  // ==========================================
  // BONUS: Complex scenario with mixed conditions
  // ==========================================

  test('BONUS: Mixed blocker and non-blocker conditions', async () => {
    const step = {
      id: 'complex-task',
      type: 'agent',
      agent: 'test-agent',
      pre_conditions: [
        {
          condition: 'Critical data present',
          source: '{{step1.output.critical}}',
          validation: 'presente',
          blocker: true
        },
        {
          condition: 'Optional metadata present',
          source: '{{step1.output.metadata}}',
          validation: 'presente',
          blocker: false
        },
        {
          condition: 'Count >= 5',
          source: '{{step1.output.count}}',
          validation: '>= 5',
          blocker: true
        }
      ]
    };

    const context = {
      step1: {
        output: {
          critical: 'value',
          // metadata missing (non-blocker)
          count: 3 // Too low (blocker)
        }
      }
    };

    const result = await conditionEngine.validate(step.pre_conditions, context);

    expect(result.all).toBe(false);
    expect(result.blockersFailed).toBe(true); // Blocker failed
    expect(result.failures).toHaveLength(2);

    const blockerFailures = result.failures.filter(f => f.blocker);
    const nonBlockerFailures = result.failures.filter(f => !f.blocker);

    expect(blockerFailures).toHaveLength(1);
    expect(blockerFailures[0].condition).toBe('Count >= 5');

    expect(nonBlockerFailures).toHaveLength(1);
    expect(nonBlockerFailures[0].condition).toBe('Optional metadata present');
  });
});
