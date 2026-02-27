/**
 * Unit Tests - ConditionEngine (Story 1.3)
 *
 * Test Coverage:
 * - Source resolution (10 tests)
 * - Validation logic (8 tests)
 * - Blocker enforcement (3 tests)
 *
 * Total: 21 tests
 */

const { ConditionEngine, PreConditionError, PostConditionError } = require('../condition-engine');

describe('ConditionEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new ConditionEngine();
  });

  // ==========================================
  // SOURCE RESOLUTION TESTS (10 tests)
  // ==========================================

  describe('resolveSource - Source Resolution', () => {
    test('resolves simple path {{step.output.field}}', () => {
      const context = {
        step: {
          output: {
            field: 'test-value'
          }
        }
      };

      const result = engine.resolveSource('{{step.output.field}}', context);
      expect(result).toBe('test-value');
    });

    test('resolves nested path {{step.output.nested.deep}}', () => {
      const context = {
        step: {
          output: {
            nested: {
              deep: 'nested-value'
            }
          }
        }
      };

      const result = engine.resolveSource('{{step.output.nested.deep}}', context);
      expect(result).toBe('nested-value');
    });

    test('resolves array index {{step.output.items[0]}}', () => {
      const context = {
        step: {
          output: {
            items: ['first', 'second', 'third']
          }
        }
      };

      const result = engine.resolveSource('{{step.output.items[0]}}', context);
      expect(result).toBe('first');
    });

    test('resolves array index {{step.output.items[2]}}', () => {
      const context = {
        step: {
          output: {
            items: ['first', 'second', 'third']
          }
        }
      };

      const result = engine.resolveSource('{{step.output.items[2]}}', context);
      expect(result).toBe('third');
    });

    test('returns undefined for missing path', () => {
      const context = {
        step: {
          output: {
            field: 'value'
          }
        }
      };

      const result = engine.resolveSource('{{step.output.missing}}', context);
      expect(result).toBeUndefined();
    });

    test('returns undefined for null value in path', () => {
      const context = {
        step: {
          output: null
        }
      };

      const result = engine.resolveSource('{{step.output.field}}', context);
      expect(result).toBeUndefined();
    });

    test('returns undefined for undefined value in path', () => {
      const context = {
        step: undefined
      };

      const result = engine.resolveSource('{{step.output.field}}', context);
      expect(result).toBeUndefined();
    });

    test('handles empty context', () => {
      const context = {};

      const result = engine.resolveSource('{{step.output.field}}', context);
      expect(result).toBeUndefined();
    });

    test('resolves numeric value', () => {
      const context = {
        step: {
          output: {
            count: 42
          }
        }
      };

      const result = engine.resolveSource('{{step.output.count}}', context);
      expect(result).toBe(42);
    });

    test('resolves boolean value', () => {
      const context = {
        step: {
          output: {
            flag: true
          }
        }
      };

      const result = engine.resolveSource('{{step.output.flag}}', context);
      expect(result).toBe(true);
    });
  });

  // ==========================================
  // VALIDATION LOGIC TESTS (8 tests)
  // ==========================================

  describe('evaluateValidation - Validation Logic', () => {
    test('validates "presente" - value exists', () => {
      const result = engine.evaluateValidation('presente', 'some-value', '{{step.output.field}}');

      expect(result.passed).toBe(true);
      expect(result.message).toContain('present');
    });

    test('validates "presente" - value missing', () => {
      const result = engine.evaluateValidation('presente', undefined, '{{step.output.field}}');

      expect(result.passed).toBe(false);
      expect(result.message).toContain('missing');
    });

    test('validates ">= value" - passes', () => {
      const result = engine.evaluateValidation('>= 3', 5, '{{step.output.count}}');

      expect(result.passed).toBe(true);
      expect(result.message).toContain('5 >= 3');
    });

    test('validates ">= value" - fails', () => {
      const result = engine.evaluateValidation('>= 10', 5, '{{step.output.count}}');

      expect(result.passed).toBe(false);
      expect(result.message).toContain('5 < 10');
    });

    test('validates "<= value" - passes', () => {
      const result = engine.evaluateValidation('<= 10', 5, '{{step.output.count}}');

      expect(result.passed).toBe(true);
      expect(result.message).toContain('5 <= 10');
    });

    test('validates "== value" - passes', () => {
      const result = engine.evaluateValidation('== success', 'success', '{{step.output.status}}');

      expect(result.passed).toBe(true);
      expect(result.message).toContain('equals success');
    });

    test('validates ".length >= value" - passes', () => {
      const result = engine.evaluateValidation('.length >= 3', ['a', 'b', 'c'], '{{step.output.items}}');

      expect(result.passed).toBe(true);
      expect(result.message).toContain('3 >= 3');
    });

    test('validates ".length >= value" - fails', () => {
      const result = engine.evaluateValidation('.length >= 5', ['a', 'b'], '{{step.output.items}}');

      expect(result.passed).toBe(false);
      expect(result.message).toContain('2 < 5');
    });
  });

  // ==========================================
  // BLOCKER ENFORCEMENT TESTS (3 tests)
  // ==========================================

  describe('validate - Blocker Enforcement', () => {
    test('blocker=true → blockersFailed=true when condition fails', async () => {
      const conditions = [
        {
          condition: 'Data must be present',
          source: '{{step.output.data}}',
          validation: 'presente',
          blocker: true
        }
      ];

      const context = {}; // Missing data

      const result = await engine.validate(conditions, context);

      expect(result.all).toBe(false);
      expect(result.blockersFailed).toBe(true);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].blocker).toBe(true);
    });

    test('blocker=false → blockersFailed=false when condition fails', async () => {
      const conditions = [
        {
          condition: 'Optional data',
          source: '{{step.output.optional}}',
          validation: 'presente',
          blocker: false
        }
      ];

      const context = {}; // Missing optional data

      const result = await engine.validate(conditions, context);

      expect(result.all).toBe(false);
      expect(result.blockersFailed).toBe(false);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].blocker).toBe(false);
    });

    test('mixed blockers - one blocker fails, one non-blocker fails', async () => {
      const conditions = [
        {
          condition: 'Required data',
          source: '{{step.output.required}}',
          validation: 'presente',
          blocker: true
        },
        {
          condition: 'Optional data',
          source: '{{step.output.optional}}',
          validation: 'presente',
          blocker: false
        }
      ];

      const context = {}; // All missing

      const result = await engine.validate(conditions, context);

      expect(result.all).toBe(false);
      expect(result.blockersFailed).toBe(true);
      expect(result.failures).toHaveLength(2);
      expect(result.failures.some(f => f.blocker === true)).toBe(true);
      expect(result.failures.some(f => f.blocker === false)).toBe(true);
    });
  });

  // ==========================================
  // ADDITIONAL INTEGRATION-STYLE TESTS
  // ==========================================

  describe('validate - Full Integration', () => {
    test('returns all=true when all conditions pass', async () => {
      const conditions = [
        {
          condition: 'Data present',
          source: '{{step.output.data}}',
          validation: 'presente',
          blocker: true
        },
        {
          condition: 'Count >= 3',
          source: '{{step.output.count}}',
          validation: '>= 3',
          blocker: false
        }
      ];

      const context = {
        step: {
          output: {
            data: 'value',
            count: 5
          }
        }
      };

      const result = await engine.validate(conditions, context);

      expect(result.all).toBe(true);
      expect(result.blockersFailed).toBe(false);
      expect(result.failures).toHaveLength(0);
    });

    test('handles empty conditions array', async () => {
      const result = await engine.validate([], {});

      expect(result.all).toBe(true);
      expect(result.blockersFailed).toBe(false);
      expect(result.failures).toHaveLength(0);
    });

    test('handles null conditions', async () => {
      const result = await engine.validate(null, {});

      expect(result.all).toBe(true);
      expect(result.blockersFailed).toBe(false);
      expect(result.failures).toHaveLength(0);
    });
  });
});

describe('PreConditionError', () => {
  test('creates error with correct message', () => {
    const failures = [
      { condition: 'Data missing' },
      { condition: 'Count too low' }
    ];

    const error = new PreConditionError(failures);

    expect(error.name).toBe('PreConditionError');
    expect(error.message).toContain('Data missing');
    expect(error.message).toContain('Count too low');
    expect(error.failures).toBe(failures);
  });
});

describe('PostConditionError', () => {
  test('creates error with correct message', () => {
    const failures = [
      { condition: 'Output invalid' }
    ];

    const error = new PostConditionError(failures);

    expect(error.name).toBe('PostConditionError');
    expect(error.message).toContain('Output invalid');
    expect(error.failures).toBe(failures);
  });
});
