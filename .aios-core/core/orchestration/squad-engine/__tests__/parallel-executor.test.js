/**
 * Unit Tests: ParallelExecutor
 * Story 4.4: Paralelização de Steps — Parallel Groups
 *
 * Tests: 8.1 (all succeed), 8.2 (fail_fast), 8.3 (wait_for_all),
 *        8.4 (context isolation), 8.5 (context merge), 8.6 (event emission)
 */

const { ParallelExecutor, MAX_PARALLEL_TASKS } = require('../parallel-executor');

// --- Mock helpers ---

function createMockEventStore() {
  const events = [];
  return {
    events,
    append(runId, eventType, data) {
      events.push({ runId, eventType, data });
    },
  };
}

function createMockConditionEngine(passAll = true) {
  return {
    evaluate(conditions, context) {
      if (passAll) return { passed: true, message: 'OK' };
      return { passed: false, message: 'Condition failed' };
    },
  };
}

function createSuccessExecutor(delay = 10) {
  return async (task, context) => {
    await new Promise(r => setTimeout(r, delay));
    return { result: `${task.id}-done` };
  };
}

function createFailingExecutor(failTaskId, delay = 10) {
  return async (task, context) => {
    await new Promise(r => setTimeout(r, delay));
    if (task.id === failTaskId) throw new Error(`${task.id} failed`);
    return { result: `${task.id}-done` };
  };
}

function createSlowExecutor(delayMap) {
  return async (task, context) => {
    const delay = delayMap[task.id] || 10;
    await new Promise(r => setTimeout(r, delay));
    return { result: `${task.id}-done` };
  };
}

// --- Test Data ---

const threeTaskGroup = {
  id: 'gen-multilang',
  type: 'parallel_group',
  tasks: [
    { id: 'gen-fr', task: 'generate-ad-copy', input: { language: 'fr' } },
    { id: 'gen-es', task: 'generate-ad-copy', input: { language: 'es' } },
    { id: 'gen-en', task: 'generate-ad-copy', input: { language: 'en' } },
  ],
  wait_for_all: true,
  fail_fast: false,
};

// --- Tests ---

describe('ParallelExecutor', () => {
  describe('constructor', () => {
    test('should create instance without options', () => {
      const executor = new ParallelExecutor();
      expect(executor.eventStore).toBeNull();
      expect(executor.conditionEngine).toBeNull();
    });

    test('should create instance with eventStore and conditionEngine', () => {
      const es = createMockEventStore();
      const ce = createMockConditionEngine();
      const executor = new ParallelExecutor({ eventStore: es, conditionEngine: ce });
      expect(executor.eventStore).toBe(es);
      expect(executor.conditionEngine).toBe(ce);
    });
  });

  describe('MAX_PARALLEL_TASKS', () => {
    test('should be 10', () => {
      expect(MAX_PARALLEL_TASKS).toBe(10);
    });
  });

  // 8.1: Unit tests for ParallelExecutor (3 tasks parallel, all succeed)
  describe('AC2 — All tasks succeed', () => {
    test('should execute 3 tasks and return all completed', async () => {
      const es = createMockEventStore();
      const executor = new ParallelExecutor({ eventStore: es });
      const fn = createSuccessExecutor();

      const { results, summary } = await executor.execute(
        threeTaskGroup,
        { some: 'data' },
        fn,
        'run-001'
      );

      expect(summary.total).toBe(3);
      expect(summary.succeeded).toBe(3);
      expect(summary.failed).toBe(0);
      expect(summary.aborted).toBe(0);
      expect(summary.duration_ms).toBeGreaterThanOrEqual(0);

      expect(results['gen-fr'].status).toBe('completed');
      expect(results['gen-es'].status).toBe('completed');
      expect(results['gen-en'].status).toBe('completed');
      expect(results['gen-fr'].output).toEqual({ result: 'gen-fr-done' });
    });

    test('should handle empty tasks array', async () => {
      const executor = new ParallelExecutor();
      const group = { id: 'empty', tasks: [] };
      const { results, summary } = await executor.execute(group, {}, async () => {}, 'run-001');

      expect(summary.total).toBe(0);
      expect(summary.succeeded).toBe(0);
      expect(Object.keys(results)).toHaveLength(0);
    });

    test('should reject group exceeding MAX_PARALLEL_TASKS', async () => {
      const executor = new ParallelExecutor();
      const tasks = Array.from({ length: 11 }, (_, i) => ({ id: `t-${i}`, task: 'test' }));
      const group = { id: 'too-many', tasks };

      await expect(
        executor.execute(group, {}, async () => {}, 'run-001')
      ).rejects.toThrow('exceeding max of 10');
    });
  });

  // 8.2: Unit tests for fail_fast (one fails → others cancelled)
  describe('AC4 — Fail fast', () => {
    test('should abort remaining tasks when one fails (fail_fast: true)', async () => {
      const es = createMockEventStore();
      const executor = new ParallelExecutor({ eventStore: es });

      // gen-fr fails fast, others take longer
      const fn = createSlowExecutor({ 'gen-fr': 5, 'gen-es': 200, 'gen-en': 200 });
      const failFn = async (task, ctx) => {
        if (task.id === 'gen-fr') {
          await new Promise(r => setTimeout(r, 5));
          throw new Error('gen-fr failed');
        }
        return fn(task, ctx);
      };

      const group = { ...threeTaskGroup, fail_fast: true };
      const { results, summary } = await executor.execute(group, {}, failFn, 'run-002');

      expect(results['gen-fr'].status).toBe('failed');
      expect(results['gen-fr'].error).toBe('gen-fr failed');

      // Others should be aborted or completed (depends on timing)
      const otherStatuses = [results['gen-es'].status, results['gen-en'].status];
      // At least one should be aborted (the slow ones)
      expect(otherStatuses).toContain('aborted');
      expect(summary.failed).toBeGreaterThanOrEqual(1);
    });

    test('should not abort tasks when fail_fast is false', async () => {
      const es = createMockEventStore();
      const executor = new ParallelExecutor({ eventStore: es });
      const fn = createFailingExecutor('gen-fr', 5);

      const group = { ...threeTaskGroup, fail_fast: false };
      const { results, summary } = await executor.execute(group, {}, fn, 'run-003');

      expect(results['gen-fr'].status).toBe('failed');
      expect(results['gen-es'].status).toBe('completed');
      expect(results['gen-en'].status).toBe('completed');
      expect(summary.failed).toBe(1);
      expect(summary.succeeded).toBe(2);
    });
  });

  // 8.3: Unit tests for wait_for_all (all complete before continue)
  describe('AC3 — Wait for all', () => {
    test('should wait for all tasks before returning (wait_for_all: true)', async () => {
      const executor = new ParallelExecutor();
      const fn = createSlowExecutor({ 'gen-fr': 10, 'gen-es': 30, 'gen-en': 20 });

      const group = { ...threeTaskGroup, wait_for_all: true };
      const { results, summary } = await executor.execute(group, {}, fn, 'run-004');

      // All should be completed
      expect(results['gen-fr'].status).toBe('completed');
      expect(results['gen-es'].status).toBe('completed');
      expect(results['gen-en'].status).toBe('completed');
      expect(summary.succeeded).toBe(3);
      // Duration should be at least the longest task
      expect(summary.duration_ms).toBeGreaterThanOrEqual(25);
    });

    test('should still return all results when wait_for_all is false', async () => {
      const executor = new ParallelExecutor();
      const fn = createSuccessExecutor(10);

      const group = { ...threeTaskGroup, wait_for_all: false };
      const { results, summary } = await executor.execute(group, {}, fn, 'run-005');

      expect(summary.total).toBe(3);
      expect(Object.keys(results)).toHaveLength(3);
    });
  });

  // 8.4: Unit tests for context isolation (task A can't see task B output during execution)
  describe('AC5 — Context isolation', () => {
    test('tasks should receive isolated context clones', async () => {
      const executor = new ParallelExecutor();
      const contexts = [];

      const fn = async (task, ctx) => {
        // Record the context each task sees
        contexts.push({ taskId: task.id, ctx: JSON.parse(JSON.stringify(ctx)) });
        // Mutate context — should NOT affect other tasks
        ctx.mutated = task.id;
        await new Promise(r => setTimeout(r, 10));
        return { done: true };
      };

      const originalContext = { shared: 'value', nested: { a: 1 } };
      await executor.execute(threeTaskGroup, originalContext, fn, 'run-006');

      // All tasks should have seen the original context without mutations from others
      for (const c of contexts) {
        expect(c.ctx.shared).toBe('value');
        expect(c.ctx.nested.a).toBe(1);
        expect(c.ctx.mutated).toBeUndefined();
      }
    });

    test('original context should not be mutated', async () => {
      const executor = new ParallelExecutor();
      const fn = async (task, ctx) => {
        ctx.injected = task.id;
        return {};
      };

      const originalContext = { key: 'original' };
      await executor.execute(threeTaskGroup, originalContext, fn, 'run-007');

      expect(originalContext.key).toBe('original');
      expect(originalContext.injected).toBeUndefined();
    });
  });

  // 8.5: Unit tests for context merge (results aggregated after completion)
  describe('AC5 — Context merge (result aggregation)', () => {
    test('should aggregate results by taskId', async () => {
      const executor = new ParallelExecutor();
      const fn = createSuccessExecutor();

      const { results } = await executor.execute(threeTaskGroup, {}, fn, 'run-008');

      expect(results['gen-fr']).toBeDefined();
      expect(results['gen-es']).toBeDefined();
      expect(results['gen-en']).toBeDefined();

      expect(results['gen-fr'].status).toBe('completed');
      expect(results['gen-fr'].output).toEqual({ result: 'gen-fr-done' });
      expect(results['gen-fr'].error).toBeNull();
      expect(results['gen-fr'].duration_ms).toBeGreaterThanOrEqual(0);
    });

    test('should include both succeeded and failed results', async () => {
      const executor = new ParallelExecutor();
      const fn = createFailingExecutor('gen-es');

      const { results } = await executor.execute(threeTaskGroup, {}, fn, 'run-009');

      expect(results['gen-fr'].status).toBe('completed');
      expect(results['gen-es'].status).toBe('failed');
      expect(results['gen-es'].error).toBe('gen-es failed');
      expect(results['gen-en'].status).toBe('completed');
    });
  });

  // 8.6: Unit tests for event emission
  describe('AC6 — Event emission', () => {
    test('should emit parallel_group.started and parallel_group.completed', async () => {
      const es = createMockEventStore();
      const executor = new ParallelExecutor({ eventStore: es });
      const fn = createSuccessExecutor();

      await executor.execute(threeTaskGroup, {}, fn, 'run-010');

      const started = es.events.find(e => e.eventType === 'parallel_group.started');
      expect(started).toBeDefined();
      expect(started.data.groupId).toBe('gen-multilang');
      expect(started.data.tasks).toEqual(['gen-fr', 'gen-es', 'gen-en']);
      expect(started.data.total).toBe(3);

      const completed = es.events.find(e => e.eventType === 'parallel_group.completed');
      expect(completed).toBeDefined();
      expect(completed.data.groupId).toBe('gen-multilang');
      expect(completed.data.succeeded).toBe(3);
      expect(completed.data.failed).toBe(0);
      expect(completed.data.duration_ms).toBeGreaterThanOrEqual(0);
    });

    test('should emit step.started and step.completed for each task', async () => {
      const es = createMockEventStore();
      const executor = new ParallelExecutor({ eventStore: es });
      const fn = createSuccessExecutor();

      await executor.execute(threeTaskGroup, {}, fn, 'run-011');

      const stepStarted = es.events.filter(e => e.eventType === 'step.started');
      const stepCompleted = es.events.filter(e => e.eventType === 'step.completed');

      expect(stepStarted).toHaveLength(3);
      expect(stepCompleted).toHaveLength(3);

      // All should have parallel: true
      stepStarted.forEach(e => expect(e.data.parallel).toBe(true));
      stepCompleted.forEach(e => expect(e.data.parallel).toBe(true));
    });

    test('should emit step.failed for failed tasks', async () => {
      const es = createMockEventStore();
      const executor = new ParallelExecutor({ eventStore: es });
      const fn = createFailingExecutor('gen-fr');

      await executor.execute(threeTaskGroup, {}, fn, 'run-012');

      const stepFailed = es.events.filter(e => e.eventType === 'step.failed');
      expect(stepFailed).toHaveLength(1);
      expect(stepFailed[0].data.stepId).toBe('gen-fr');
      expect(stepFailed[0].data.parallel).toBe(true);
    });

    test('should emit step.aborted for aborted tasks (fail_fast)', async () => {
      const es = createMockEventStore();
      const executor = new ParallelExecutor({ eventStore: es });

      const fn = async (task, ctx) => {
        if (task.id === 'gen-fr') {
          await new Promise(r => setTimeout(r, 5));
          throw new Error('fail');
        }
        await new Promise(r => setTimeout(r, 200));
        return {};
      };

      const group = { ...threeTaskGroup, fail_fast: true };
      await executor.execute(group, {}, fn, 'run-013');

      const aborted = es.events.filter(e => e.eventType === 'step.aborted');
      expect(aborted.length).toBeGreaterThanOrEqual(1);
      aborted.forEach(e => expect(e.data.parallel).toBe(true));
    });

    test('should work without eventStore (no errors)', async () => {
      const executor = new ParallelExecutor();
      const fn = createSuccessExecutor();

      // Should not throw
      const { summary } = await executor.execute(threeTaskGroup, {}, fn, 'run-014');
      expect(summary.succeeded).toBe(3);
    });
  });

  // Condition Engine integration
  describe('AC2 — Condition Engine integration', () => {
    test('should fail task if pre-condition fails', async () => {
      const ce = {
        evaluate(conditions, context) {
          return { passed: false, message: 'Pre-condition not met' };
        },
      };
      const executor = new ParallelExecutor({ conditionEngine: ce });

      const taskWithPre = {
        ...threeTaskGroup,
        tasks: [
          { id: 'gen-fr', task: 'test', pre_conditions: [{ type: 'check' }] },
        ],
      };

      const fn = createSuccessExecutor();
      const { results } = await executor.execute(taskWithPre, {}, fn, 'run-015');

      expect(results['gen-fr'].status).toBe('failed');
      expect(results['gen-fr'].error).toBe('Pre-condition not met');
    });

    test('should fail task if post-condition fails', async () => {
      let callCount = 0;
      const ce = {
        evaluate(conditions, context) {
          callCount++;
          // First call is pre-condition (pass), second is post-condition (fail)
          if (callCount % 2 === 1) return { passed: true };
          return { passed: false, message: 'Post-condition not met' };
        },
      };
      const executor = new ParallelExecutor({ conditionEngine: ce });

      const taskWithPost = {
        ...threeTaskGroup,
        tasks: [
          { id: 'gen-fr', task: 'test', pre_conditions: [{}], post_conditions: [{}] },
        ],
      };

      const fn = createSuccessExecutor();
      const { results } = await executor.execute(taskWithPost, {}, fn, 'run-016');

      expect(results['gen-fr'].status).toBe('failed');
      expect(results['gen-fr'].error).toBe('Post-condition not met');
    });

    test('should validate group pre-conditions before starting', async () => {
      const ce = {
        evaluate() { return { passed: false, message: 'Group pre-condition failed' }; },
      };
      const executor = new ParallelExecutor({ conditionEngine: ce });

      const group = {
        ...threeTaskGroup,
        pre_conditions: [{ type: 'check' }],
      };

      await expect(
        executor.execute(group, {}, async () => {}, 'run-017')
      ).rejects.toThrow('pre-condition failed');
    });
  });

  // Edge cases
  describe('Edge cases', () => {
    test('should handle task executor that returns undefined', async () => {
      const executor = new ParallelExecutor();
      const fn = async () => undefined;

      const { results } = await executor.execute(threeTaskGroup, {}, fn, 'run-018');
      expect(results['gen-fr'].status).toBe('completed');
      expect(results['gen-fr'].output).toBeUndefined();
    });

    test('should record duration_ms for each task', async () => {
      const executor = new ParallelExecutor();
      const fn = createSlowExecutor({ 'gen-fr': 20, 'gen-es': 20, 'gen-en': 20 });

      const { results } = await executor.execute(threeTaskGroup, {}, fn, 'run-019');

      Object.values(results).forEach(r => {
        expect(r.duration_ms).toBeGreaterThanOrEqual(15);
      });
    });
  });
});
