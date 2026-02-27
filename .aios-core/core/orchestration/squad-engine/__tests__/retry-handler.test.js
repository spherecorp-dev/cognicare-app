/**
 * Unit Tests: RetryHandler, CompensationExecutor, isTransientError
 * Story 2.4: Error Handling — Retry Logic e Compensating Transactions
 */

const {
  RetryHandler,
  CompensationExecutor,
  RetryExhaustedError,
  isTransientError,
  calculateDelay,
  DEFAULT_RETRY_CONFIG,
} = require('../retry-handler');
const { CircuitBreakerOpenError, OPEN } = require('../circuit-breaker');

// Helper: immediate delay for tests
const noDelay = () => Promise.resolve();

describe('calculateDelay', () => {
  it('should calculate exponential delay', () => {
    expect(calculateDelay('exponential', 2000, 1)).toBe(2000);
    expect(calculateDelay('exponential', 2000, 2)).toBe(4000);
    expect(calculateDelay('exponential', 2000, 3)).toBe(8000);
  });

  it('should calculate linear delay', () => {
    expect(calculateDelay('linear', 2000, 1)).toBe(2000);
    expect(calculateDelay('linear', 2000, 2)).toBe(4000);
    expect(calculateDelay('linear', 2000, 3)).toBe(6000);
  });

  it('should calculate fixed delay', () => {
    expect(calculateDelay('fixed', 2000, 1)).toBe(2000);
    expect(calculateDelay('fixed', 2000, 2)).toBe(2000);
    expect(calculateDelay('fixed', 2000, 3)).toBe(2000);
  });

  it('should default to exponential for unknown strategy', () => {
    expect(calculateDelay('unknown', 2000, 2)).toBe(4000);
  });
});

describe('isTransientError', () => {
  it('should return true for HTTP 429 (rate limit)', () => {
    const error = new Error('Rate limited');
    error.statusCode = 429;
    expect(isTransientError(error)).toBe(true);
  });

  it('should return true for HTTP 502', () => {
    const error = new Error('Bad gateway');
    error.statusCode = 502;
    expect(isTransientError(error)).toBe(true);
  });

  it('should return true for HTTP 503', () => {
    const error = new Error('Service unavailable');
    error.statusCode = 503;
    expect(isTransientError(error)).toBe(true);
  });

  it('should return true for HTTP 504', () => {
    const error = new Error('Gateway timeout');
    error.statusCode = 504;
    expect(isTransientError(error)).toBe(true);
  });

  it('should return true for ETIMEDOUT', () => {
    const error = new Error('Timeout');
    error.code = 'ETIMEDOUT';
    expect(isTransientError(error)).toBe(true);
  });

  it('should return true for ECONNRESET', () => {
    const error = new Error('Connection reset');
    error.code = 'ECONNRESET';
    expect(isTransientError(error)).toBe(true);
  });

  it('should return true for ECONNREFUSED', () => {
    const error = new Error('Connection refused');
    error.code = 'ECONNREFUSED';
    expect(isTransientError(error)).toBe(true);
  });

  it('should return false for HTTP 400 (bad request)', () => {
    const error = new Error('Bad request');
    error.statusCode = 400;
    expect(isTransientError(error)).toBe(false);
  });

  it('should return false for HTTP 401 (unauthorized)', () => {
    const error = new Error('Unauthorized');
    error.statusCode = 401;
    expect(isTransientError(error)).toBe(false);
  });

  it('should return false for HTTP 403 (forbidden)', () => {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    expect(isTransientError(error)).toBe(false);
  });

  it('should return false for HTTP 404 (not found)', () => {
    const error = new Error('Not found');
    error.statusCode = 404;
    expect(isTransientError(error)).toBe(false);
  });

  it('should return false for CircuitBreakerOpenError', () => {
    const error = new CircuitBreakerOpenError('dall-e', OPEN, 30000);
    expect(isTransientError(error)).toBe(false);
  });

  it('should return false for generic errors without status/code', () => {
    const error = new Error('Some error');
    expect(isTransientError(error)).toBe(false);
  });

  it('should respect custom transient errors list', () => {
    const error = new Error('Custom');
    error.statusCode = 418;
    expect(isTransientError(error, [418])).toBe(true);
  });
});

describe('RetryExhaustedError', () => {
  it('should have correct properties', () => {
    const cause = new Error('Rate limited');
    const error = new RetryExhaustedError('step-1', 3, cause);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('RetryExhaustedError');
    expect(error.stepId).toBe('step-1');
    expect(error.totalAttempts).toBe(3);
    expect(error.finalError).toBe(cause);
    expect(error.message).toContain('step-1');
    expect(error.message).toContain('3 attempts');
  });
});

describe('RetryHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new RetryHandler({ delayFn: noDelay });
  });

  describe('retryWithBackoff() — successful calls', () => {
    it('should return result on first attempt success', async () => {
      const result = await handler.retryWithBackoff(async () => 'ok');
      expect(result).toBe('ok');
    });

    it('should pass attempt number to fn', async () => {
      const attempts = [];
      await handler.retryWithBackoff(async (attempt) => {
        attempts.push(attempt);
        if (attempt < 2) {
          const err = new Error('fail');
          err.statusCode = 429;
          throw err;
        }
        return 'ok';
      });
      expect(attempts).toEqual([1, 2]);
    });
  });

  // AC1: Exponential backoff delays
  describe('retryWithBackoff() — exponential backoff', () => {
    it('should retry with exponential delays (2s, 4s, 8s)', async () => {
      const delays = [];
      const customDelay = async (ms) => { delays.push(ms); };

      const retryHandler = new RetryHandler({ delayFn: customDelay });
      let attempt = 0;

      await retryHandler.retryWithBackoff(
        async () => {
          attempt++;
          if (attempt <= 3) {
            const err = new Error('Rate limited');
            err.statusCode = 429;
            throw err;
          }
          return 'ok';
        },
        { max_attempts: 4, base_delay_ms: 2000, strategy: 'exponential' }
      );

      expect(delays).toEqual([2000, 4000, 8000]);
    });
  });

  // AC1: Linear backoff
  describe('retryWithBackoff() — linear backoff', () => {
    it('should retry with linear delays', async () => {
      const delays = [];
      const customDelay = async (ms) => { delays.push(ms); };

      const retryHandler = new RetryHandler({ delayFn: customDelay });
      let attempt = 0;

      await retryHandler.retryWithBackoff(
        async () => {
          attempt++;
          if (attempt <= 2) {
            const err = new Error('Rate limited');
            err.statusCode = 429;
            throw err;
          }
          return 'ok';
        },
        { max_attempts: 3, base_delay_ms: 5000, strategy: 'linear' }
      );

      expect(delays).toEqual([5000, 10000]);
    });
  });

  // AC1: Fixed backoff
  describe('retryWithBackoff() — fixed backoff', () => {
    it('should retry with fixed delays', async () => {
      const delays = [];
      const customDelay = async (ms) => { delays.push(ms); };

      const retryHandler = new RetryHandler({ delayFn: customDelay });
      let attempt = 0;

      await retryHandler.retryWithBackoff(
        async () => {
          attempt++;
          if (attempt <= 2) {
            const err = new Error('Rate limited');
            err.statusCode = 429;
            throw err;
          }
          return 'ok';
        },
        { max_attempts: 3, base_delay_ms: 3000, strategy: 'fixed' }
      );

      expect(delays).toEqual([3000, 3000]);
    });
  });

  // AC2: Non-transient error → fail immediately
  describe('retryWithBackoff() — non-transient errors', () => {
    it('should throw immediately for HTTP 400', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        const err = new Error('Bad request');
        err.statusCode = 400;
        throw err;
      };

      await expect(handler.retryWithBackoff(fn)).rejects.toThrow('Bad request');
      expect(attempts).toBe(1);
    });

    it('should throw immediately for HTTP 401', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        const err = new Error('Unauthorized');
        err.statusCode = 401;
        throw err;
      };

      await expect(handler.retryWithBackoff(fn)).rejects.toThrow('Unauthorized');
      expect(attempts).toBe(1);
    });

    it('should throw immediately for HTTP 403', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        const err = new Error('Forbidden');
        err.statusCode = 403;
        throw err;
      };

      await expect(handler.retryWithBackoff(fn)).rejects.toThrow('Forbidden');
      expect(attempts).toBe(1);
    });
  });

  // AC6: CircuitBreakerOpenError → fail immediately (no retry)
  describe('retryWithBackoff() — CircuitBreakerOpenError', () => {
    it('should throw immediately without retry', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new CircuitBreakerOpenError('dall-e', OPEN, 30000);
      };

      await expect(handler.retryWithBackoff(fn)).rejects.toThrow(CircuitBreakerOpenError);
      expect(attempts).toBe(1);
    });
  });

  // Retry exhausted
  describe('retryWithBackoff() — retry exhausted', () => {
    it('should throw RetryExhaustedError after max attempts', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        const err = new Error('Server error');
        err.statusCode = 503;
        throw err;
      };

      await expect(
        handler.retryWithBackoff(fn, { max_attempts: 3, stepId: 'test-step' })
      ).rejects.toThrow(RetryExhaustedError);
      expect(attempts).toBe(3);
    });

    it('should include step info in RetryExhaustedError', async () => {
      const fn = async () => {
        const err = new Error('Server error');
        err.statusCode = 503;
        throw err;
      };

      try {
        await handler.retryWithBackoff(fn, { max_attempts: 2, stepId: 'my-step' });
      } catch (err) {
        expect(err.stepId).toBe('my-step');
        expect(err.totalAttempts).toBe(2);
        expect(err.finalError.message).toBe('Server error');
      }
    });
  });

  // AC8: Custom retry config
  describe('retryWithBackoff() — custom config', () => {
    it('should use custom max_attempts', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        const err = new Error('fail');
        err.statusCode = 429;
        throw err;
      };

      await expect(
        handler.retryWithBackoff(fn, { max_attempts: 5 })
      ).rejects.toThrow(RetryExhaustedError);
      expect(attempts).toBe(5);
    });

    it('should use custom transient_errors list', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        const err = new Error('Custom error');
        err.statusCode = 418;
        throw err;
      };

      await expect(
        handler.retryWithBackoff(fn, { max_attempts: 3, transient_errors: [418] })
      ).rejects.toThrow(RetryExhaustedError);
      expect(attempts).toBe(3);
    });
  });

  // AC5: Event emissions
  describe('event logging', () => {
    it('should emit step.retry events on each retry attempt', async () => {
      const events = [];
      const mockEventStore = {
        append: vi.fn().mockImplementation((runId, type, data) => {
          events.push({ runId, type, data });
        }),
      };

      const retryHandler = new RetryHandler({
        delayFn: noDelay,
        eventStore: mockEventStore,
      });

      let attempt = 0;
      await retryHandler.retryWithBackoff(
        async () => {
          attempt++;
          if (attempt <= 2) {
            const err = new Error('Rate limited');
            err.statusCode = 429;
            throw err;
          }
          return 'ok';
        },
        { max_attempts: 3, stepId: 'step-1', runId: 'run-1' }
      );

      const retryEvents = events.filter(e => e.type === 'step.retry');
      expect(retryEvents).toHaveLength(2);
      expect(retryEvents[0].data.attempt).toBe(1);
      expect(retryEvents[0].data.maxAttempts).toBe(3);
      expect(retryEvents[0].data.stepId).toBe('step-1');
      expect(retryEvents[0].runId).toBe('run-1');
      expect(retryEvents[1].data.attempt).toBe(2);
    });

    it('should emit step.retry_exhausted when retries are exhausted', async () => {
      const events = [];
      const mockEventStore = {
        append: vi.fn().mockImplementation((runId, type, data) => {
          events.push({ runId, type, data });
        }),
      };

      const retryHandler = new RetryHandler({
        delayFn: noDelay,
        eventStore: mockEventStore,
      });

      const fn = async () => {
        const err = new Error('Server error');
        err.statusCode = 503;
        throw err;
      };

      await retryHandler
        .retryWithBackoff(fn, { max_attempts: 2, stepId: 'step-2', runId: 'run-2' })
        .catch(() => {});

      const exhaustedEvents = events.filter(e => e.type === 'step.retry_exhausted');
      expect(exhaustedEvents).toHaveLength(1);
      expect(exhaustedEvents[0].data.stepId).toBe('step-2');
      expect(exhaustedEvents[0].data.totalAttempts).toBe(2);
      expect(exhaustedEvents[0].data.final_error).toBe('Server error');
    });

    it('should not throw if eventStore.append fails (fire-and-forget)', async () => {
      const mockEventStore = {
        append: vi.fn().mockImplementation(() => { throw new Error('EventStore down'); }),
      };

      const retryHandler = new RetryHandler({
        delayFn: noDelay,
        eventStore: mockEventStore,
      });

      let attempt = 0;
      const result = await retryHandler.retryWithBackoff(
        async () => {
          attempt++;
          if (attempt <= 1) {
            const err = new Error('Rate limited');
            err.statusCode = 429;
            throw err;
          }
          return 'ok';
        },
        { max_attempts: 2, stepId: 'step-ff', runId: 'run-ff' }
      );

      expect(result).toBe('ok');
    });
  });
});

describe('CompensationExecutor', () => {
  let executor;
  let mockTaskExecutor;

  beforeEach(() => {
    executor = new CompensationExecutor();
    mockTaskExecutor = {
      executeTask: vi.fn().mockResolvedValue({ output: 'cleaned', metadata: {} }),
    };
  });

  it('should return empty summary for no compensations', async () => {
    const result = await executor.executeCompensations([], {}, mockTaskExecutor, 'squad', 'run-1');
    expect(result).toEqual({ executed: 0, succeeded: 0, failed: 0, errors: [] });
  });

  it('should return empty summary for null compensations', async () => {
    const result = await executor.executeCompensations(null, {}, mockTaskExecutor, 'squad', 'run-1');
    expect(result).toEqual({ executed: 0, succeeded: 0, failed: 0, errors: [] });
  });

  // AC3: LIFO execution order
  describe('LIFO order', () => {
    it('should execute compensations in reverse (LIFO) order', async () => {
      const executionOrder = [];
      mockTaskExecutor.executeTask = vi.fn().mockImplementation(async (step) => {
        executionOrder.push(step.task);
        return { output: 'ok', metadata: {} };
      });

      const compensations = [
        { stepId: 'step-1', task: 'cleanup-videos', phaseName: 'production' },
        { stepId: 'step-2', task: 'cleanup-transcriptions', phaseName: 'production' },
        { stepId: 'step-3', task: 'cleanup-images', phaseName: 'production' },
      ];

      await executor.executeCompensations(compensations, {}, mockTaskExecutor, 'squad', 'run-1');

      expect(executionOrder).toEqual([
        'cleanup-images',
        'cleanup-transcriptions',
        'cleanup-videos',
      ]);
    });
  });

  // AC4: Best-effort — failure doesn't block
  describe('best-effort execution', () => {
    it('should continue executing after compensation failure', async () => {
      const executionOrder = [];
      mockTaskExecutor.executeTask = vi.fn().mockImplementation(async (step) => {
        executionOrder.push(step.task);
        if (step.task === 'cleanup-transcriptions') {
          throw new Error('Cleanup failed');
        }
        return { output: 'ok', metadata: {} };
      });

      const compensations = [
        { stepId: 'step-1', task: 'cleanup-videos', phaseName: 'production' },
        { stepId: 'step-2', task: 'cleanup-transcriptions', phaseName: 'production' },
        { stepId: 'step-3', task: 'cleanup-images', phaseName: 'production' },
      ];

      const result = await executor.executeCompensations(
        compensations, {}, mockTaskExecutor, 'squad', 'run-1'
      );

      // All 3 executed (LIFO: images, transcriptions, videos)
      expect(executionOrder).toHaveLength(3);
      expect(result.executed).toBe(3);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stepId).toBe('step-2');
      expect(result.errors[0].error).toBe('Cleanup failed');
    });
  });

  // AC4: Compensation step properties
  describe('compensation step construction', () => {
    it('should construct compensation steps with force_execute=true', async () => {
      const compensations = [
        { stepId: 'step-1', task: 'cleanup', type: 'task_pura', input: { dir: '/tmp' }, phaseName: 'prod' },
      ];

      await executor.executeCompensations(compensations, {}, mockTaskExecutor, 'squad', 'run-1');

      expect(mockTaskExecutor.executeTask).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'compensate-step-1',
          task: 'cleanup',
          type: 'task_pura',
          input: { dir: '/tmp' },
          force_execute: true,
        }),
        {},
        'squad',
        'run-1'
      );
    });

    it('should default type to task_pura and input to {}', async () => {
      const compensations = [
        { stepId: 'step-1', task: 'cleanup', phaseName: 'prod' },
      ];

      await executor.executeCompensations(compensations, {}, mockTaskExecutor, 'squad', 'run-1');

      expect(mockTaskExecutor.executeTask).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'task_pura',
          input: {},
        }),
        {},
        'squad',
        'run-1'
      );
    });
  });

  // AC5: phase.compensating event
  describe('event logging', () => {
    it('should emit phase.compensating event', async () => {
      const events = [];
      const mockEventStore = {
        append: vi.fn().mockImplementation((runId, type, data) => {
          events.push({ runId, type, data });
        }),
      };

      const executorWithEvents = new CompensationExecutor({ eventStore: mockEventStore });

      const compensations = [
        { stepId: 'step-1', task: 'cleanup-videos', phaseName: 'production' },
        { stepId: 'step-2', task: 'cleanup-transcriptions', phaseName: 'production' },
      ];

      await executorWithEvents.executeCompensations(
        compensations, {}, mockTaskExecutor, 'squad', 'run-1'
      );

      const compEvents = events.filter(e => e.type === 'phase.compensating');
      expect(compEvents).toHaveLength(1);
      expect(compEvents[0].data.phaseName).toBe('production');
      expect(compEvents[0].data.compensations).toHaveLength(2);
      // LIFO order in event
      expect(compEvents[0].data.compensations[0].task).toBe('cleanup-transcriptions');
      expect(compEvents[0].data.compensations[1].task).toBe('cleanup-videos');
    });
  });
});

describe('SquadOrchestrator compensation integration', () => {
  // Test collectCompensations and executePhaseCompensations
  const SquadOrchestrator = require('../squad-orchestrator');

  it('should collect compensations from completed steps', () => {
    const orchestrator = new SquadOrchestrator('.aios-core/.state', {
      eventStore: { append: vi.fn() },
    });

    const completedSteps = [
      { id: 'step-1', on_failure: { compensate: 'cleanup-videos' } },
      { id: 'step-2', on_failure: { compensate: 'cleanup-transcriptions' } },
      { id: 'step-3' }, // no compensation
    ];

    const compensations = orchestrator.collectCompensations(completedSteps, 'production');
    expect(compensations).toHaveLength(2);
    expect(compensations[0].stepId).toBe('step-1');
    expect(compensations[0].task).toBe('cleanup-videos');
    expect(compensations[1].stepId).toBe('step-2');
    expect(compensations[1].task).toBe('cleanup-transcriptions');
  });

  it('should return empty array when no steps have compensations', () => {
    const orchestrator = new SquadOrchestrator('.aios-core/.state', {
      eventStore: { append: vi.fn() },
    });

    const completedSteps = [
      { id: 'step-1' },
      { id: 'step-2' },
    ];

    const compensations = orchestrator.collectCompensations(completedSteps, 'production');
    expect(compensations).toHaveLength(0);
  });

  it('should execute phase compensations via CompensationExecutor', async () => {
    const mockTaskExecutor = {
      executeTask: vi.fn().mockResolvedValue({ output: 'cleaned', metadata: {} }),
    };

    const orchestrator = new SquadOrchestrator('.aios-core/.state', {
      eventStore: { append: vi.fn() },
    });

    const completedSteps = [
      { id: 'step-1', on_failure: { compensate: 'cleanup-videos' } },
      { id: 'step-2', on_failure: { compensate: 'cleanup-transcriptions' } },
    ];

    const result = await orchestrator.executePhaseCompensations(
      completedSteps, {}, mockTaskExecutor, 'squad', 'run-1', 'production'
    );

    expect(result.executed).toBe(2);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
    // Verify LIFO: cleanup-transcriptions first, then cleanup-videos
    const calls = mockTaskExecutor.executeTask.mock.calls;
    expect(calls[0][0].task).toBe('cleanup-transcriptions');
    expect(calls[1][0].task).toBe('cleanup-videos');
  });
});

describe('TaskExecutor retry integration', () => {
  const TaskExecutor = require('../task-executor');

  it('should use retryHandler when provided and step has no retry=false', async () => {
    const mockRetryHandler = {
      retryWithBackoff: vi.fn().mockImplementation(async (fn) => fn(1)),
    };

    const executor = new TaskExecutor({ retryHandler: mockRetryHandler });

    // Mock loadTaskFile and runners
    executor.loadTaskFile = vi.fn().mockResolvedValue({ name: 'test', content: '' });
    executor.pureTaskRunner.execute = vi.fn().mockResolvedValue('result');

    const step = { id: 'step-1', task: 'test-task', type: 'task_pura', input: {} };

    const result = await executor.executeTask(step, {}, 'squad', 'run-1');
    expect(result.output).toBe('result');
    expect(mockRetryHandler.retryWithBackoff).toHaveBeenCalled();
  });

  it('should skip retryHandler when retry=false on step', async () => {
    const mockRetryHandler = {
      retryWithBackoff: vi.fn(),
    };

    const executor = new TaskExecutor({ retryHandler: mockRetryHandler });

    executor.loadTaskFile = vi.fn().mockResolvedValue({ name: 'test', content: '' });
    executor.pureTaskRunner.execute = vi.fn().mockResolvedValue('result');

    const step = { id: 'step-1', task: 'test-task', type: 'task_pura', input: {}, retry: false };

    const result = await executor.executeTask(step, {}, 'squad', 'run-1');
    expect(result.output).toBe('result');
    expect(mockRetryHandler.retryWithBackoff).not.toHaveBeenCalled();
  });

  it('should pass step retry config to retryHandler', async () => {
    const mockRetryHandler = {
      retryWithBackoff: vi.fn().mockImplementation(async (fn) => fn(1)),
    };

    const executor = new TaskExecutor({ retryHandler: mockRetryHandler });

    executor.loadTaskFile = vi.fn().mockResolvedValue({ name: 'test', content: '' });
    executor.pureTaskRunner.execute = vi.fn().mockResolvedValue('result');

    const step = {
      id: 'step-1',
      task: 'test-task',
      type: 'task_pura',
      input: {},
      retry: { max_attempts: 5, base_delay_ms: 1000, strategy: 'linear' },
    };

    await executor.executeTask(step, {}, 'squad', 'run-1');

    const passedConfig = mockRetryHandler.retryWithBackoff.mock.calls[0][1];
    expect(passedConfig.max_attempts).toBe(5);
    expect(passedConfig.base_delay_ms).toBe(1000);
    expect(passedConfig.strategy).toBe('linear');
    expect(passedConfig.stepId).toBe('step-1');
    expect(passedConfig.runId).toBe('run-1');
  });

  it('should execute without retryHandler when not provided', async () => {
    const executor = new TaskExecutor();

    executor.loadTaskFile = vi.fn().mockResolvedValue({ name: 'test', content: '' });
    executor.pureTaskRunner.execute = vi.fn().mockResolvedValue('result');

    const step = { id: 'step-1', task: 'test-task', type: 'task_pura', input: {} };

    const result = await executor.executeTask(step, {}, 'squad', null);
    expect(result.output).toBe('result');
  });
});

describe('Integration: RetryHandler + CircuitBreaker', () => {
  const { APICircuitBreaker } = require('../circuit-breaker');

  it('should retry through circuit breaker until success', async () => {
    const handler = new RetryHandler({ delayFn: noDelay });
    const breaker = new APICircuitBreaker({ name: 'test-api', failureThreshold: 5, resetTimeout: 60000 });

    let attempt = 0;
    const result = await handler.retryWithBackoff(
      async () => {
        return breaker.call(async () => {
          attempt++;
          if (attempt <= 2) {
            const err = new Error('Rate limited');
            err.statusCode = 429;
            throw err;
          }
          return 'success';
        });
      },
      { max_attempts: 4 }
    );

    expect(result).toBe('success');
    expect(attempt).toBe(3);
    breaker.destroy();
  });

  it('should fail immediately when circuit breaker is OPEN', async () => {
    const handler = new RetryHandler({ delayFn: noDelay });
    const breaker = new APICircuitBreaker({ name: 'test-api', failureThreshold: 2, resetTimeout: 60000 });

    // Open the circuit breaker
    for (let i = 0; i < 2; i++) {
      await breaker.call(async () => { throw new Error('fail'); }).catch(() => {});
    }
    expect(breaker.state).toBe('OPEN');

    let attempts = 0;
    await expect(
      handler.retryWithBackoff(
        async () => {
          attempts++;
          return breaker.call(async () => 'ok');
        },
        { max_attempts: 3 }
      )
    ).rejects.toThrow(CircuitBreakerOpenError);

    // Only 1 attempt because CircuitBreakerOpenError is non-retryable
    expect(attempts).toBe(1);
    breaker.destroy();
  });

  it('should count retry failures towards circuit breaker', async () => {
    const handler = new RetryHandler({ delayFn: noDelay });
    const breaker = new APICircuitBreaker({ name: 'test-api', failureThreshold: 5, resetTimeout: 60000 });

    const fn = async () => {
      return breaker.call(async () => {
        const err = new Error('Server error');
        err.statusCode = 503;
        throw err;
      });
    };

    await handler.retryWithBackoff(fn, { max_attempts: 3 }).catch(() => {});

    // 3 retry attempts = 3 failures on circuit breaker
    expect(breaker.failures).toBe(3);
    breaker.destroy();
  });
});
