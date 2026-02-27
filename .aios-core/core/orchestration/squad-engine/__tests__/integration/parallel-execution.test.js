/**
 * Integration Tests: Parallel Execution in Pipeline
 * Story 4.4: Paralelização de Steps — Parallel Groups
 *
 * Tests: 8.8 (pipeline with sequential + parallel), 8.9 (mixed results),
 *        8.10 (performance: parallel vs sequential speedup)
 */

const { ParallelExecutor, MAX_PARALLEL_TASKS } = require('../../parallel-executor');

// --- Helpers ---

function createMockEventStore() {
  const events = [];
  return {
    events,
    append(runId, eventType, data) {
      events.push({ runId, eventType, data, timestamp: Date.now() });
    },
  };
}

// --- Integration Tests ---

describe('Integration: Parallel Execution in Pipeline', () => {
  // 8.8: Pipeline with sequential + parallel steps
  describe('8.8 — Pipeline with sequential + parallel steps', () => {
    test('should execute parallel group within sequential pipeline flow', async () => {
      const es = createMockEventStore();
      const executor = new ParallelExecutor({ eventStore: es });

      // Simulate: sequential step-1 → parallel group → sequential step-3
      const results = [];

      // Step 1: sequential
      results.push({ step: 'step-1', status: 'completed' });

      // Step 2: parallel group
      const group = {
        id: 'parallel-step-2',
        tasks: [
          { id: 'task-a', task: 'generate' },
          { id: 'task-b', task: 'generate' },
          { id: 'task-c', task: 'generate' },
        ],
        wait_for_all: true,
        fail_fast: false,
      };

      const context = { from_step_1: 'data' };
      const taskFn = async (task, ctx) => {
        // Each task should see step-1 context
        expect(ctx.from_step_1).toBe('data');
        return { generated: task.id };
      };

      const parallelResult = await executor.execute(group, context, taskFn, 'run-int-1');

      expect(parallelResult.summary.total).toBe(3);
      expect(parallelResult.summary.succeeded).toBe(3);

      // Merge results into context (simulating squad-orchestrator behavior)
      context.parallel_results = context.parallel_results || {};
      context.parallel_results[group.id] = {};
      for (const [taskId, result] of Object.entries(parallelResult.results)) {
        context.parallel_results[group.id][taskId] = result;
      }

      // Step 3: sequential — can access parallel results
      expect(context.parallel_results['parallel-step-2']['task-a'].output).toEqual({ generated: 'task-a' });
      expect(context.parallel_results['parallel-step-2']['task-b'].output).toEqual({ generated: 'task-b' });
      expect(context.parallel_results['parallel-step-2']['task-c'].output).toEqual({ generated: 'task-c' });

      results.push({ step: 'step-3', status: 'completed' });
    });

    test('should emit correct event sequence', async () => {
      const es = createMockEventStore();
      const executor = new ParallelExecutor({ eventStore: es });

      const group = {
        id: 'pg-events',
        tasks: [
          { id: 't-1', task: 'work' },
          { id: 't-2', task: 'work' },
        ],
        wait_for_all: true,
      };

      await executor.execute(group, {}, async () => ({ ok: true }), 'run-int-2');

      const eventTypes = es.events.map(e => e.eventType);

      // First event should be parallel_group.started
      expect(eventTypes[0]).toBe('parallel_group.started');

      // Last event should be parallel_group.completed
      expect(eventTypes[eventTypes.length - 1]).toBe('parallel_group.completed');

      // Should have step.started and step.completed for each task
      const stepStarted = eventTypes.filter(t => t === 'step.started');
      const stepCompleted = eventTypes.filter(t => t === 'step.completed');
      expect(stepStarted).toHaveLength(2);
      expect(stepCompleted).toHaveLength(2);
    });
  });

  // 8.9: Parallel group with mixed results (2 succeed, 1 fails, fail_fast: false)
  describe('8.9 — Mixed results (fail_fast: false)', () => {
    test('should complete all tasks even when one fails', async () => {
      const es = createMockEventStore();
      const executor = new ParallelExecutor({ eventStore: es });

      const group = {
        id: 'mixed-group',
        tasks: [
          { id: 'ok-1', task: 'work' },
          { id: 'fail-1', task: 'work' },
          { id: 'ok-2', task: 'work' },
        ],
        wait_for_all: true,
        fail_fast: false,
      };

      const fn = async (task) => {
        await new Promise(r => setTimeout(r, 10));
        if (task.id === 'fail-1') throw new Error('task failed');
        return { done: true };
      };

      const { results, summary } = await executor.execute(group, {}, fn, 'run-int-3');

      expect(summary.total).toBe(3);
      expect(summary.succeeded).toBe(2);
      expect(summary.failed).toBe(1);
      expect(summary.aborted).toBe(0);

      expect(results['ok-1'].status).toBe('completed');
      expect(results['fail-1'].status).toBe('failed');
      expect(results['fail-1'].error).toBe('task failed');
      expect(results['ok-2'].status).toBe('completed');
    });

    test('should emit step.failed for the failing task only', async () => {
      const es = createMockEventStore();
      const executor = new ParallelExecutor({ eventStore: es });

      const group = {
        id: 'mixed-events',
        tasks: [
          { id: 'ok-1', task: 'work' },
          { id: 'fail-1', task: 'work' },
        ],
        fail_fast: false,
      };

      const fn = async (task) => {
        if (task.id === 'fail-1') throw new Error('fail');
        return {};
      };

      await executor.execute(group, {}, fn, 'run-int-4');

      const failed = es.events.filter(e => e.eventType === 'step.failed');
      const completed = es.events.filter(e => e.eventType === 'step.completed');

      expect(failed).toHaveLength(1);
      expect(failed[0].data.stepId).toBe('fail-1');
      expect(completed).toHaveLength(1);
      expect(completed[0].data.stepId).toBe('ok-1');
    });
  });

  // 8.10: Performance test: parallel 5 tasks vs sequential 5 tasks → ~5x speedup
  describe('8.10 — Performance: parallel vs sequential', () => {
    test('parallel execution should be significantly faster than sequential', async () => {
      const taskDelay = 50; // ms per task
      const numTasks = 5;

      const executor = new ParallelExecutor();

      const tasks = Array.from({ length: numTasks }, (_, i) => ({
        id: `task-${i}`,
        task: 'work',
      }));

      const group = {
        id: 'perf-test',
        tasks,
        wait_for_all: true,
        fail_fast: false,
      };

      const fn = async () => {
        await new Promise(r => setTimeout(r, taskDelay));
        return { done: true };
      };

      // Parallel execution
      const parallelStart = Date.now();
      const { summary } = await executor.execute(group, {}, fn, 'run-perf');
      const parallelDuration = Date.now() - parallelStart;

      // Sequential execution (for comparison)
      const sequentialStart = Date.now();
      for (let i = 0; i < numTasks; i++) {
        await fn({ id: `task-${i}` }, {});
      }
      const sequentialDuration = Date.now() - sequentialStart;

      // Parallel should be at least 2x faster (conservative, typically ~5x)
      expect(parallelDuration).toBeLessThan(sequentialDuration);
      const speedup = sequentialDuration / parallelDuration;
      expect(speedup).toBeGreaterThan(2);

      expect(summary.succeeded).toBe(numTasks);
    });
  });

  // Additional integration: context accumulation across multiple parallel groups
  describe('Multiple parallel groups in pipeline', () => {
    test('should accumulate results from successive parallel groups', async () => {
      const executor = new ParallelExecutor();
      const context = {};

      // First parallel group
      const group1 = {
        id: 'group-1',
        tasks: [
          { id: 'a', task: 'work' },
          { id: 'b', task: 'work' },
        ],
      };

      const fn = async (task) => ({ value: task.id });

      const result1 = await executor.execute(group1, context, fn, 'run-multi');

      // Merge into context
      context.parallel_results = {};
      context.parallel_results['group-1'] = {};
      for (const [tid, r] of Object.entries(result1.results)) {
        context.parallel_results['group-1'][tid] = r;
      }

      // Second parallel group — context should have group-1 results
      const group2 = {
        id: 'group-2',
        tasks: [
          { id: 'c', task: 'work' },
        ],
      };

      const fn2 = async (task, ctx) => {
        // Should see group-1 results in cloned context
        expect(ctx.parallel_results['group-1']['a'].output).toEqual({ value: 'a' });
        return { value: task.id };
      };

      const result2 = await executor.execute(group2, context, fn2, 'run-multi');

      context.parallel_results['group-2'] = {};
      for (const [tid, r] of Object.entries(result2.results)) {
        context.parallel_results['group-2'][tid] = r;
      }

      expect(context.parallel_results['group-1']['a'].output).toEqual({ value: 'a' });
      expect(context.parallel_results['group-2']['c'].output).toEqual({ value: 'c' });
    });
  });
});
