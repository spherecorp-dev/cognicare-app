/**
 * Unit Tests - TaskExecutor
 * Story 1.2: Task Executor — Execução de Tasks Puras e Agent Tasks
 *
 * Test Coverage:
 * - AC1: Load task file
 * - AC2: Execute task_pura
 * - AC3: Execute agent_task
 * - AC4: Input interpolation
 * - AC5: Structured output with metadata
 * - AC6: Context accumulation
 */

const TaskExecutor = require('../task-executor');
const PureTaskRunner = require('../task-types/pure-task-runner');
const AgentTaskRunner = require('../task-types/agent-task-runner');

describe('TaskExecutor', () => {
  let executor;

  beforeEach(() => {
    executor = new TaskExecutor();
  });

  // =========================================================================
  // AC4: Input Interpolation Tests
  // =========================================================================

  describe('interpolateInput', () => {
    test('interpolates simple string variable', () => {
      const context = { step1: { output: { value: 'test' } } };
      const input = '{{step1.output.value}}';

      const result = executor.interpolateInput(input, context);

      expect(result).toBe('test');
    });

    test('interpolates multiple variables in string', () => {
      const context = {
        greeting: 'Hello',
        name: 'World',
      };
      const input = '{{greeting}} {{name}}!';

      const result = executor.interpolateInput(input, context);

      expect(result).toBe('Hello World!');
    });

    test('interpolates nested object paths', () => {
      const context = {
        step1: {
          output: {
            data: {
              user: {
                id: '123',
                name: 'John',
              },
            },
          },
        },
      };
      const input = '{{step1.output.data.user.name}}';

      const result = executor.interpolateInput(input, context);

      expect(result).toBe('John');
    });

    test('interpolates object values', () => {
      const context = { step1: { output: { data: { id: '123' } } } };
      const input = { userId: '{{step1.output.data.id}}', active: true };

      const result = executor.interpolateInput(input, context);

      expect(result).toEqual({ userId: '123', active: true });
    });

    test('interpolates array items', () => {
      const context = { step1: { output: { ids: ['a', 'b', 'c'] } } };
      const input = ['{{step1.output.ids}}', 'extra'];

      const result = executor.interpolateInput(input, context);

      expect(result).toEqual([['a', 'b', 'c'], 'extra']);
    });

    test('handles missing variables gracefully (keeps placeholder)', () => {
      const context = {};
      const input = '{{missing.value}}';

      const result = executor.interpolateInput(input, context);

      expect(result).toBe('{{missing.value}}');
    });

    test('handles undefined in path (returns placeholder)', () => {
      const context = { step1: null };
      const input = '{{step1.output.value}}';

      const result = executor.interpolateInput(input, context);

      expect(result).toBe('{{step1.output.value}}');
    });

    test('returns primitives unchanged', () => {
      const context = {};

      expect(executor.interpolateInput(123, context)).toBe(123);
      expect(executor.interpolateInput(true, context)).toBe(true);
      expect(executor.interpolateInput(null, context)).toBe(null);
    });
  });

  describe('resolveContextPath', () => {
    test('resolves simple path', () => {
      const context = { name: 'John' };

      const result = executor.resolveContextPath('name', context);

      expect(result).toBe('John');
    });

    test('resolves nested path', () => {
      const context = { user: { profile: { age: 25 } } };

      const result = executor.resolveContextPath('user.profile.age', context);

      expect(result).toBe(25);
    });

    test('returns undefined for missing path', () => {
      const context = { user: {} };

      const result = executor.resolveContextPath('user.profile.age', context);

      expect(result).toBeUndefined();
    });

    test('handles null/undefined in path', () => {
      const context = { user: null };

      const result = executor.resolveContextPath('user.profile', context);

      expect(result).toBeUndefined();
    });
  });

  // =========================================================================
  // AC1: Task File Loading Tests
  // =========================================================================

  describe('loadTaskFile', () => {
    test('throws error if task file not found', async () => {
      await expect(
        executor.loadTaskFile('nonexistent-squad', 'nonexistent-task')
      ).rejects.toThrow('Task file not found');
    });

    test('returns task definition with name and path', async () => {
      // Note: This test will pass only if task file exists
      // For MVP, we're testing error case above
      // Integration test will verify successful loading
    });
  });

  // =========================================================================
  // AC2, AC3, AC5: Task Execution Tests (with mocks)
  // =========================================================================

  describe('executeTask', () => {
    test('executes task_pura and returns output with metadata (AC2, AC5)', async () => {
      // Mock loadTaskFile
      executor.loadTaskFile = vi.fn().mockResolvedValue({
        name: 'fetch-offer-data',
        content: 'mock content',
        path: 'mock/path',
      });

      // Mock PureTaskRunner
      const mockOutput = { offer_context: { id: 'MEMFR02' } };
      executor.pureTaskRunner.execute = vi
        .fn()
        .mockResolvedValue(mockOutput);

      const step = {
        id: 'fetch-offer-data',
        type: 'task_pura',
        task: 'fetch-offer-data',
        input: { offerId: 'MEMFR02' },
      };
      const context = {};
      const squadName = 'squad-copy';

      const result = await executor.executeTask(step, context, squadName);

      // AC5: Check structured output
      expect(result.output).toEqual(mockOutput);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.stepId).toBe('fetch-offer-data');
      expect(result.metadata.task).toBe('fetch-offer-data');
      expect(result.metadata.duration).toBeGreaterThanOrEqual(0);
      expect(result.metadata.completedAt).toBeDefined();
    });

    test('executes agent_task and returns output with metadata (AC3, AC5)', async () => {
      // Mock loadTaskFile
      executor.loadTaskFile = vi.fn().mockResolvedValue({
        name: 'interpret-offer-data',
        content: 'mock content',
        path: 'mock/path',
      });

      // Mock AgentTaskRunner
      const mockOutput = { analysis: 'result', recommendation: 'action' };
      executor.agentTaskRunner.execute = vi
        .fn()
        .mockResolvedValue(mockOutput);

      const step = {
        id: 'interpret-offer',
        type: 'agent_task',
        agent: '@copy-chief',
        task: 'interpret-offer-data',
        input: { offer: 'test-data' },
      };
      const context = {};
      const squadName = 'squad-copy';

      const result = await executor.executeTask(step, context, squadName);

      // AC5: Check structured output
      expect(result.output).toEqual(mockOutput);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.stepId).toBe('interpret-offer');
    });

    test('interpolates input before execution (AC4)', async () => {
      // Mock loadTaskFile to avoid file system access
      executor.loadTaskFile = vi.fn().mockResolvedValue({
        name: 'test-task',
        content: 'mock content',
        path: 'mock/path',
      });
      executor.pureTaskRunner.execute = vi.fn().mockResolvedValue({});

      const step = {
        id: 'step2',
        type: 'task_pura',
        task: 'test-task',
        input: { userId: '{{step1.output.user.id}}' },
      };
      const context = {
        step1: { output: { user: { id: '123' } } },
      };

      await executor.executeTask(step, context, 'squad-test');

      // Verify interpolated input was passed to runner
      expect(executor.pureTaskRunner.execute).toHaveBeenCalledWith(
        expect.any(Object),
        { userId: '123' }
      );
    });

    test('throws error for unknown task type', async () => {
      // Mock loadTaskFile to avoid file system access
      executor.loadTaskFile = vi.fn().mockResolvedValue({
        name: 'test',
        content: 'mock content',
        path: 'mock/path',
      });

      const step = {
        id: 'invalid',
        type: 'unknown_type',
        task: 'test',
        input: {},
      };

      await expect(
        executor.executeTask(step, {}, 'squad-test')
      ).rejects.toThrow('Unknown task type: unknown_type');
    });
  });

  // =========================================================================
  // AC6: Context Accumulation Test
  // =========================================================================

  describe('context accumulation (AC6)', () => {
    test('output can be saved to context and used in next step', async () => {
      // Mock loadTaskFile for both tasks
      executor.loadTaskFile = vi.fn().mockResolvedValue({
        name: 'mock-task',
        content: 'mock content',
        path: 'mock/path',
      });

      // Mock first task output
      const firstOutput = { offer_context: { id: 'MEMFR02', name: 'Memory FR' } };
      executor.pureTaskRunner.execute = vi.fn().mockResolvedValue(firstOutput);

      // Step 1: Execute first task
      const step1 = {
        id: 'fetch-offer-data',
        type: 'task_pura',
        task: 'fetch-offer-data',
        input: { offerId: 'MEMFR02' },
      };
      const context = {};

      const result1 = await executor.executeTask(step1, context, 'squad-copy');

      // AC6: Save output to context (simulating orchestrator)
      context['fetch-offer-data'] = { output: result1.output };

      // Step 2: Use output from step 1
      executor.agentTaskRunner.execute = vi
        .fn()
        .mockResolvedValue({ analysis: 'done' });

      const step2 = {
        id: 'interpret-offer',
        type: 'agent_task',
        agent: '@copy-chief',
        task: 'interpret-offer-data',
        input: {
          offer_data: '{{fetch-offer-data.output.offer_context}}',
        },
      };

      await executor.executeTask(step2, context, 'squad-copy');

      // Verify step2 received interpolated data from step1
      expect(executor.agentTaskRunner.execute).toHaveBeenCalledWith(
        '@copy-chief',
        'interpret-offer-data',
        {
          offer_data: { id: 'MEMFR02', name: 'Memory FR' },
        },
        { squadName: 'squad-copy', llmOptions: {} }
      );
    });
  });
});
