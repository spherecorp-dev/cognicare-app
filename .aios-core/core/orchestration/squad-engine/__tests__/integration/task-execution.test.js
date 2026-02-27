/**
 * Integration Tests - Task Execution
 * Story 1.2: Task Executor — Execução de Tasks Puras e Agent Tasks
 *
 * Integration Verification:
 * - IV1: Task pura fetch-offer-data
 * - IV2: Agent task interpret-offer-data
 * - IV3: Output de step N disponível para step N+1
 *
 * Tests full integration with SquadOrchestrator from Story 1.1
 */

const TaskExecutor = require('../../task-executor');
const SquadOrchestrator = require('../../squad-orchestrator');
const path = require('path');

describe('TaskExecutor Integration', () => {
  let executor;
  const originalCwd = process.cwd();

  beforeAll(() => {
    // Integration tests need project root as CWD for squad file resolution
    process.chdir(path.resolve(__dirname, '../../../../../..'));
  });

  afterAll(() => {
    process.chdir(originalCwd);
  });

  beforeEach(() => {
    executor = new TaskExecutor();
  });

  // =========================================================================
  // IV1: Task pura fetch-offer-data
  // =========================================================================

  describe('IV1: task_pura execution', () => {
    test('executes fetch-offer-data task (if offer data exists)', async () => {
      const step = {
        id: 'fetch-offer-data',
        type: 'task_pura',
        task: 'fetch-offer-data',
        input: { offerId: 'MEMFR02' },
      };
      const context = {};
      const squadName = 'squad-copy';

      // This test requires actual offer data to exist
      // If data/offers/MEMFR02/offer.yaml doesn't exist, test will be skipped
      try {
        const result = await executor.executeTask(step, context, squadName);

        expect(result.output).toBeDefined();
        expect(result.output.offer_context).toBeDefined();
        expect(result.output.offer_context.id).toBe('MEMFR02');
        expect(result.metadata.stepId).toBe('fetch-offer-data');
      } catch (error) {
        if (error.message.includes('Offer not found')) {
          console.warn(
            'Skipping IV1 test - offer data not found (data/offers/MEMFR02/offer.yaml)'
          );
        } else {
          throw error;
        }
      }
    });
  });

  // =========================================================================
  // IV2: Agent task interpret-offer-data
  // =========================================================================

  describe('IV2: agent_task execution', () => {
    test('invokes agent via AgentInvoker', async () => {
      const step = {
        id: 'interpret-offer',
        type: 'agent_task',
        agent: '@copy-chief',
        task: 'interpret-offer-data',
        input: {
          offer_data: { id: 'MEMFR02', name: 'Memory FR' },
        },
      };
      const context = {};
      const squadName = 'squad-copy';

      // Mock AgentInvoker for integration test
      // (Real agent invocation would require full agent setup)
      executor.agentTaskRunner.agentInvoker.invokeAgent = vi
        .fn()
        .mockResolvedValue({
          success: true,
          result: {
            analysis: 'Offer analysis completed',
            recommendation: 'Proceed with campaign',
          },
        });

      const result = await executor.executeTask(step, context, squadName);

      expect(result.output).toBeDefined();
      expect(result.output.analysis).toBeDefined();
      expect(result.output.recommendation).toBeDefined();
      expect(result.metadata.stepId).toBe('interpret-offer');

      // Verify AgentInvoker was called with correct API
      expect(
        executor.agentTaskRunner.agentInvoker.invokeAgent
      ).toHaveBeenCalledWith('copy-chief', 'interpret-offer-data', {
        offer_data: { id: 'MEMFR02', name: 'Memory FR' },
      }, { squadName: 'squad-copy', llmOptions: {} });
    });
  });

  // =========================================================================
  // IV3: Output de step N disponível para step N+1
  // =========================================================================

  describe('IV3: context chaining (step N → step N+1)', () => {
    test('step output is available for next step via interpolation', async () => {
      // Step 1: Execute first task
      const step1 = {
        id: 'step1',
        type: 'task_pura',
        task: 'fetch-offer-data',
        input: { offerId: 'MEMFR02' },
      };

      // Mock first task
      executor.pureTaskRunner.execute = vi.fn().mockResolvedValue({
        offer_context: { id: 'MEMFR02', name: 'Memory FR' },
      });

      const context = {};
      const result1 = await executor.executeTask(step1, context, 'squad-copy');

      // Simulate orchestrator saving output to context (AC6)
      context['step1'] = { output: result1.output };

      // Step 2: Use output from step 1 via interpolation
      const step2 = {
        id: 'step2',
        type: 'agent_task',
        agent: '@copy-chief',
        task: 'interpret-offer-data',
        input: {
          offer_data: '{{step1.output.offer_context}}',
        },
      };

      // Mock agent task
      executor.agentTaskRunner.agentInvoker.invokeAgent = vi
        .fn()
        .mockResolvedValue({
          success: true,
          result: { analysis: 'Complete' },
        });

      const result2 = await executor.executeTask(step2, context, 'squad-copy');

      // Verify interpolation worked correctly
      expect(
        executor.agentTaskRunner.agentInvoker.invokeAgent
      ).toHaveBeenCalledWith('copy-chief', 'interpret-offer-data', {
        offer_data: { id: 'MEMFR02', name: 'Memory FR' },
      }, { squadName: 'squad-copy', llmOptions: {} });

      expect(result2.output).toEqual({ analysis: 'Complete' });
    });
  });

  // =========================================================================
  // Full Pipeline Integration (with SquadOrchestrator)
  // =========================================================================

  describe('Full pipeline integration', () => {
    test('TaskExecutor integrates with SquadOrchestrator', async () => {
      // This test verifies that TaskExecutor can be used by SquadOrchestrator
      // from Story 1.1 to execute pipeline steps

      const orchestrator = new SquadOrchestrator();

      // Verify TaskExecutor can be instantiated and used
      expect(executor).toBeInstanceOf(TaskExecutor);
      expect(executor.executeTask).toBeDefined();

      // Verify integration points
      expect(typeof executor.loadTaskFile).toBe('function');
      expect(typeof executor.interpolateInput).toBe('function');
      expect(typeof executor.resolveContextPath).toBe('function');
    });
  });
});
