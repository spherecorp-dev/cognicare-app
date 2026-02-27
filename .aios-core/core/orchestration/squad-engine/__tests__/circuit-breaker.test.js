/**
 * Unit Tests: APICircuitBreaker, CircuitBreakerRegistry, CircuitBreakerOpenError
 * Story 2.3: Circuit Breaker — Proteção de APIs Externas
 */

const {
  APICircuitBreaker,
  CircuitBreakerRegistry,
  CircuitBreakerOpenError,
  CLOSED,
  OPEN,
  HALF_OPEN,
} = require('../circuit-breaker');

describe('CircuitBreakerOpenError', () => {
  it('should have correct properties', () => {
    const error = new CircuitBreakerOpenError('dall-e', OPEN, 30000);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('CircuitBreakerOpenError');
    expect(error.provider).toBe('dall-e');
    expect(error.state).toBe(OPEN);
    expect(error.retryAfter).toBe(30000);
    expect(error.message).toContain('dall-e');
  });
});

describe('APICircuitBreaker', () => {
  let breaker;

  beforeEach(() => {
    breaker = new APICircuitBreaker({ name: 'test-api', failureThreshold: 3, resetTimeout: 1000 });
  });

  afterEach(() => {
    breaker.destroy();
  });

  it('should require a name', () => {
    expect(() => new APICircuitBreaker({})).toThrow('name is required');
  });

  it('should start in CLOSED state', () => {
    expect(breaker.state).toBe(CLOSED);
    expect(breaker.failures).toBe(0);
  });

  // AC1 + AC6: call() wraps async function
  describe('call() wrapper', () => {
    it('should pass through successful calls', async () => {
      const result = await breaker.call(async () => 'ok');
      expect(result).toBe('ok');
      expect(breaker.state).toBe(CLOSED);
      expect(breaker.failures).toBe(0);
    });

    it('should pass through the error on failure', async () => {
      await expect(
        breaker.call(async () => { throw new Error('API down'); })
      ).rejects.toThrow('API down');
      expect(breaker.failures).toBe(1);
    });
  });

  // AC2: State transitions — CLOSED state
  describe('CLOSED state', () => {
    it('should remain CLOSED below threshold', async () => {
      for (let i = 0; i < 2; i++) {
        await breaker.call(async () => { throw new Error('fail'); }).catch(() => {});
      }
      expect(breaker.state).toBe(CLOSED);
      expect(breaker.failures).toBe(2);
    });

    it('should reset failure counter on success', async () => {
      await breaker.call(async () => { throw new Error('fail'); }).catch(() => {});
      await breaker.call(async () => { throw new Error('fail'); }).catch(() => {});
      expect(breaker.failures).toBe(2);

      await breaker.call(async () => 'ok');
      expect(breaker.failures).toBe(0);
    });
  });

  // AC2: CLOSED → OPEN after failureThreshold
  describe('CLOSED → OPEN transition', () => {
    it('should open after failureThreshold consecutive failures', async () => {
      for (let i = 0; i < 3; i++) {
        await breaker.call(async () => { throw new Error('fail'); }).catch(() => {});
      }
      expect(breaker.state).toBe(OPEN);
      expect(breaker.failures).toBe(3);
    });
  });

  // AC3: CircuitBreakerOpenError when OPEN
  describe('OPEN state', () => {
    beforeEach(async () => {
      for (let i = 0; i < 3; i++) {
        await breaker.call(async () => { throw new Error('fail'); }).catch(() => {});
      }
      expect(breaker.state).toBe(OPEN);
    });

    it('should throw CircuitBreakerOpenError immediately (no API call)', async () => {
      let apiCalled = false;
      await expect(
        breaker.call(async () => { apiCalled = true; return 'ok'; })
      ).rejects.toThrow(CircuitBreakerOpenError);
      expect(apiCalled).toBe(false);
    });

    it('should include retryAfter in error', async () => {
      try {
        await breaker.call(async () => 'ok');
      } catch (err) {
        expect(err.provider).toBe('test-api');
        expect(err.retryAfter).toBeGreaterThanOrEqual(0);
        expect(err.retryAfter).toBeLessThanOrEqual(1000);
      }
    });
  });

  // AC2: OPEN → HALF_OPEN after resetTimeout
  describe('OPEN → HALF_OPEN transition', () => {
    it('should transition to HALF_OPEN after resetTimeout', async () => {
      vi.useFakeTimers();

      const fb = new APICircuitBreaker({ name: 'timer-test', failureThreshold: 3, resetTimeout: 5000 });
      for (let i = 0; i < 3; i++) {
        await fb.call(async () => { throw new Error('fail'); }).catch(() => {});
      }
      expect(fb.state).toBe(OPEN);

      vi.advanceTimersByTime(5000);
      expect(fb.state).toBe(HALF_OPEN);

      fb.destroy();
      vi.useRealTimers();
    });
  });

  // AC2: HALF_OPEN → CLOSED on success
  describe('HALF_OPEN → CLOSED transition', () => {
    it('should close on success in HALF_OPEN', async () => {
      vi.useFakeTimers();

      const fb = new APICircuitBreaker({ name: 'half-test', failureThreshold: 3, resetTimeout: 1000 });
      for (let i = 0; i < 3; i++) {
        await fb.call(async () => { throw new Error('fail'); }).catch(() => {});
      }

      vi.advanceTimersByTime(1000);
      expect(fb.state).toBe(HALF_OPEN);

      vi.useRealTimers();

      await fb.call(async () => 'recovered');
      expect(fb.state).toBe(CLOSED);
      expect(fb.failures).toBe(0);

      fb.destroy();
    });
  });

  // AC2: HALF_OPEN → OPEN on failure
  describe('HALF_OPEN → OPEN on failure', () => {
    it('should reopen on failure in HALF_OPEN', async () => {
      vi.useFakeTimers();

      const fb = new APICircuitBreaker({ name: 'reopen-test', failureThreshold: 3, resetTimeout: 1000 });
      for (let i = 0; i < 3; i++) {
        await fb.call(async () => { throw new Error('fail'); }).catch(() => {});
      }

      vi.advanceTimersByTime(1000);
      expect(fb.state).toBe(HALF_OPEN);

      vi.useRealTimers();

      await fb.call(async () => { throw new Error('still down'); }).catch(() => {});
      expect(fb.state).toBe(OPEN);

      fb.destroy();
    });
  });

  // AC5: Event logging
  describe('Event logging', () => {
    it('should emit circuit.opened event on CLOSED → OPEN', async () => {
      const events = [];
      const mockEventStore = {
        append: vi.fn().mockImplementation(async (runId, type, data) => {
          events.push({ runId, type, data });
        }),
      };

      const fb = new APICircuitBreaker({
        name: 'event-test',
        failureThreshold: 2,
        resetTimeout: 500,
        eventStore: mockEventStore,
      });

      for (let i = 0; i < 2; i++) {
        await fb.call(async () => { throw new Error('fail'); }).catch(() => {});
      }

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('circuit.opened');
      expect(events[0].data.provider).toBe('event-test');
      expect(events[0].data.failures).toBe(2);
      expect(events[0].data.threshold).toBe(2);
      expect(events[0].runId).toBe('__system__');

      fb.destroy();
    });

    it('should emit circuit.half_opened event on OPEN → HALF_OPEN', async () => {
      vi.useFakeTimers();

      const events = [];
      const mockEventStore = {
        append: vi.fn().mockImplementation(async (runId, type, data) => {
          events.push({ runId, type, data });
        }),
      };

      const fb = new APICircuitBreaker({
        name: 'half-event-test',
        failureThreshold: 2,
        resetTimeout: 500,
        eventStore: mockEventStore,
      });

      for (let i = 0; i < 2; i++) {
        await fb.call(async () => { throw new Error('fail'); }).catch(() => {});
      }
      expect(events).toHaveLength(1); // circuit.opened

      vi.advanceTimersByTime(500);

      expect(fb.state).toBe(HALF_OPEN);
      expect(events).toHaveLength(2);
      expect(events[1].type).toBe('circuit.half_opened');
      expect(events[1].data.provider).toBe('half-event-test');

      fb.destroy();
      vi.useRealTimers();
    });

    it('should emit circuit.closed event on HALF_OPEN → CLOSED', async () => {
      vi.useFakeTimers();

      const events = [];
      const mockEventStore = {
        append: vi.fn().mockImplementation(async (runId, type, data) => {
          events.push({ runId, type, data });
        }),
      };

      const fb = new APICircuitBreaker({
        name: 'close-event-test',
        failureThreshold: 2,
        resetTimeout: 500,
        eventStore: mockEventStore,
      });

      for (let i = 0; i < 2; i++) {
        await fb.call(async () => { throw new Error('fail'); }).catch(() => {});
      }
      vi.advanceTimersByTime(500);
      expect(fb.state).toBe(HALF_OPEN);

      vi.useRealTimers();

      await fb.call(async () => 'ok');

      expect(events).toHaveLength(3);
      expect(events[2].type).toBe('circuit.closed');
      expect(events[2].data.recovered).toBe(true);

      fb.destroy();
    });

    it('should not throw if eventStore.append fails (fire-and-forget)', async () => {
      const mockEventStore = {
        append: vi.fn().mockRejectedValue(new Error('EventStore down')),
      };

      const fb = new APICircuitBreaker({
        name: 'fire-forget-test',
        failureThreshold: 1,
        eventStore: mockEventStore,
      });

      // Should not throw despite EventStore failure
      await fb.call(async () => { throw new Error('fail'); }).catch(() => {});
      expect(fb.state).toBe(OPEN);

      fb.destroy();
    });
  });

  // getStatus()
  describe('getStatus()', () => {
    it('should return correct status object', async () => {
      await breaker.call(async () => { throw new Error('oops'); }).catch(() => {});

      const status = breaker.getStatus();
      expect(status.name).toBe('test-api');
      expect(status.state).toBe(CLOSED);
      expect(status.failures).toBe(1);
      expect(status.failureThreshold).toBe(3);
      expect(status.resetTimeout).toBe(1000);
      expect(status.lastFailure).toBeGreaterThan(0);
      expect(status.lastError).toBe('oops');
    });
  });

  // reset()
  describe('reset()', () => {
    it('should reset breaker to CLOSED', async () => {
      for (let i = 0; i < 3; i++) {
        await breaker.call(async () => { throw new Error('fail'); }).catch(() => {});
      }
      expect(breaker.state).toBe(OPEN);

      breaker.reset();
      expect(breaker.state).toBe(CLOSED);
      expect(breaker.failures).toBe(0);
    });
  });
});

describe('CircuitBreakerRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new CircuitBreakerRegistry();
  });

  afterEach(() => {
    registry.destroy();
  });

  // AC4: Per-provider breakers
  describe('getOrCreate()', () => {
    it('should create new breaker for unknown name', () => {
      const breaker = registry.getOrCreate('dall-e');
      expect(breaker).toBeInstanceOf(APICircuitBreaker);
      expect(breaker.name).toBe('dall-e');
    });

    it('should return same breaker for same name', () => {
      const b1 = registry.getOrCreate('dall-e');
      const b2 = registry.getOrCreate('dall-e');
      expect(b1).toBe(b2);
    });

    it('should create independent breakers per provider', () => {
      const dalle = registry.getOrCreate('dall-e');
      const whisper = registry.getOrCreate('whisper');
      expect(dalle).not.toBe(whisper);
    });

    it('should pass options to new breaker', () => {
      const breaker = registry.getOrCreate('dall-e', { failureThreshold: 10 });
      expect(breaker.failureThreshold).toBe(10);
    });
  });

  // AC4: Per-provider isolation
  describe('per-provider isolation', () => {
    it('should keep breaker states independent', async () => {
      const dalle = registry.getOrCreate('dall-e', { failureThreshold: 2 });
      const whisper = registry.getOrCreate('whisper', { failureThreshold: 2 });

      // Open DALL-E breaker
      for (let i = 0; i < 2; i++) {
        await dalle.call(async () => { throw new Error('fail'); }).catch(() => {});
      }

      expect(dalle.state).toBe(OPEN);
      expect(whisper.state).toBe(CLOSED);

      // Whisper still works
      const result = await whisper.call(async () => 'whisper-ok');
      expect(result).toBe('whisper-ok');
    });
  });

  // AC7: getStatus()
  describe('getStatus()', () => {
    it('should return empty object when no breakers', () => {
      expect(registry.getStatus()).toEqual({});
    });

    it('should return status of all breakers', async () => {
      const dalle = registry.getOrCreate('dall-e', { failureThreshold: 2 });
      registry.getOrCreate('whisper');

      await dalle.call(async () => { throw new Error('fail'); }).catch(() => {});

      const status = registry.getStatus();
      expect(Object.keys(status)).toEqual(['dall-e', 'whisper']);
      expect(status['dall-e'].failures).toBe(1);
      expect(status['dall-e'].state).toBe('CLOSED');
      expect(status['whisper'].failures).toBe(0);
    });
  });

  // reset()
  describe('reset()', () => {
    it('should reset specific breaker', async () => {
      const dalle = registry.getOrCreate('dall-e', { failureThreshold: 2 });
      for (let i = 0; i < 2; i++) {
        await dalle.call(async () => { throw new Error('fail'); }).catch(() => {});
      }
      expect(dalle.state).toBe(OPEN);

      const result = registry.reset('dall-e');
      expect(result).toBe(true);
      expect(dalle.state).toBe(CLOSED);
    });

    it('should return false for unknown breaker', () => {
      expect(registry.reset('unknown')).toBe(false);
    });
  });

  // resetAll()
  describe('resetAll()', () => {
    it('should reset all breakers', async () => {
      const dalle = registry.getOrCreate('dall-e', { failureThreshold: 1 });
      const whisper = registry.getOrCreate('whisper', { failureThreshold: 1 });

      await dalle.call(async () => { throw new Error('fail'); }).catch(() => {});
      await whisper.call(async () => { throw new Error('fail'); }).catch(() => {});

      expect(dalle.state).toBe(OPEN);
      expect(whisper.state).toBe(OPEN);

      registry.resetAll();
      expect(dalle.state).toBe(CLOSED);
      expect(whisper.state).toBe(CLOSED);
    });
  });
});
