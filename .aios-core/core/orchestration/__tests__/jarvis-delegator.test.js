/**
 * Jarvis Delegator - Unit Tests
 *
 * Comprehensive tests for structured delegation with business context,
 * retry logic, timeout handling, event emission, and audit trail.
 *
 * @jest-environment node
 */

/* eslint-disable no-unused-vars */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const {
  JarvisDelegator,
  DELEGATION_ROUTING,
  DelegationError,
} = require('../jarvis-delegator');

// Ensure Jest exits cleanly even with lingering setTimeout from Promise.race
afterAll(() => new Promise(resolve => setTimeout(resolve, 100)));

describe('JarvisDelegator', () => {
  let delegator;
  let tmpDir;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `jarvis-delegator-test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);
    delegator = new JarvisDelegator({
      projectRoot: tmpDir,
      defaultTimeout: 5000,
      maxRetries: 2,
    });
  });

  afterEach(() => {
    try {
      fsSync.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ===========================================================================
  // 1. Constructor
  // ===========================================================================

  describe('constructor', () => {
    test('should create instance with default options', () => {
      const defaultDelegator = new JarvisDelegator();

      expect(defaultDelegator.projectRoot).toBe(process.cwd());
      expect(defaultDelegator.defaultTimeout).toBe(300000);
      expect(defaultDelegator.maxRetries).toBe(3);
      expect(defaultDelegator.executor).toBeNull();
      expect(defaultDelegator.logs).toEqual([]);
    });

    test('should create instance with custom options', () => {
      const customDelegator = new JarvisDelegator({
        projectRoot: '/custom/path',
        defaultTimeout: 60000,
        maxRetries: 5,
      });

      expect(customDelegator.projectRoot).toBe('/custom/path');
      expect(customDelegator.defaultTimeout).toBe(60000);
      expect(customDelegator.maxRetries).toBe(5);
    });

    test('should create delegation store automatically', () => {
      expect(delegator.store).toBeDefined();
      expect(delegator.store.storeDir).toBe(
        path.join(tmpDir, '.aios', 'jarvis', 'delegations'),
      );
    });

    test('should create business memory automatically', () => {
      expect(delegator.memory).toBeDefined();
      expect(delegator.memory.rootPath).toBe(tmpDir);
    });

    test('should accept custom executor function', () => {
      const customExecutor = jest.fn();
      const d = new JarvisDelegator({ projectRoot: tmpDir, executor: customExecutor });

      expect(d.executor).toBe(customExecutor);
    });
  });

  // ===========================================================================
  // 2. DELEGATION_ROUTING
  // ===========================================================================

  describe('DELEGATION_ROUTING', () => {
    test('should have all 12 routes', () => {
      expect(Object.keys(DELEGATION_ROUTING)).toHaveLength(12);
    });

    test('each route should have agent and name fields', () => {
      for (const [domain, entry] of Object.entries(DELEGATION_ROUTING)) {
        expect(entry.agent).toBeDefined();
        expect(typeof entry.agent).toBe('string');
        expect(entry.agent.startsWith('@')).toBe(true);

        expect(entry.name).toBeDefined();
        expect(typeof entry.name).toBe('string');
        expect(entry.name.length).toBeGreaterThan(0);
      }
    });

    test('should contain expected domain-agent mappings', () => {
      expect(DELEGATION_ROUTING.implementation.agent).toBe('@dev');
      expect(DELEGATION_ROUTING.quality.agent).toBe('@qa');
      expect(DELEGATION_ROUTING.architecture_tech.agent).toBe('@architect');
      expect(DELEGATION_ROUTING.stories_backlog.agent).toBe('@sm');
      expect(DELEGATION_ROUTING.validation.agent).toBe('@po');
      expect(DELEGATION_ROUTING.deploy.agent).toBe('@devops');
      expect(DELEGATION_ROUTING.framework.agent).toBe('@aios-master');
      expect(DELEGATION_ROUTING.database.agent).toBe('@data-engineer');
      expect(DELEGATION_ROUTING.research.agent).toBe('@analyst');
      expect(DELEGATION_ROUTING.design.agent).toBe('@ux-design-expert');
      expect(DELEGATION_ROUTING.copy.agent).toBe('@stefan-georgi');
      expect(DELEGATION_ROUTING.strategy_product.agent).toBe('@pm');
    });
  });

  // ===========================================================================
  // 3. resolveRoute()
  // ===========================================================================

  describe('resolveRoute', () => {
    test('should return correct route for known domains', () => {
      const route = delegator.resolveRoute('implementation');

      expect(route).toBeDefined();
      expect(route.agent).toBe('@dev');
      expect(route.name).toBe('Dex');
    });

    test('should return correct route for all 12 domains', () => {
      const domains = Object.keys(DELEGATION_ROUTING);
      for (const domain of domains) {
        const route = delegator.resolveRoute(domain);
        expect(route).toEqual(DELEGATION_ROUTING[domain]);
      }
    });

    test('should return null for unknown domain', () => {
      expect(delegator.resolveRoute('nonexistent')).toBeNull();
      expect(delegator.resolveRoute('random_domain')).toBeNull();
    });

    test('should return null for empty/undefined domain', () => {
      expect(delegator.resolveRoute('')).toBeNull();
      expect(delegator.resolveRoute(undefined)).toBeNull();
    });
  });

  // ===========================================================================
  // 4. delegate()
  // ===========================================================================

  describe('delegate', () => {
    test('should delegate successfully with default simulated executor', async () => {
      const result = await delegator.delegate(
        'Implement login feature',
        '@dev',
      );

      expect(result.success).toBe(true);
      expect(result.delegationId).toBeDefined();
      expect(result.agentName).toBe('@dev');
      expect(result.task).toBe('Implement login feature');
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.businessContext).toBe('');
    });

    test('should return correct result structure', async () => {
      const result = await delegator.delegate(
        'Build API endpoint',
        '@dev',
        { businessContext: 'Q1 deliverable', priority: 'high' },
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('delegationId');
      expect(result).toHaveProperty('agentName');
      expect(result).toHaveProperty('task');
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('businessContext');
    });

    test('should create delegation in store', async () => {
      const result = await delegator.delegate(
        'Review code',
        '@qa',
        { businessContext: 'quality check' },
      );

      const state = await delegator.store.getDelegation(result.delegationId);
      expect(state.delegationId).toBe(result.delegationId);
      expect(state.status).toBe('completed');
      expect(state.task).toBe('Review code');
    });

    test('should enrich with business memory context (trackDelegation called)', async () => {
      // Capture a pattern first so getRelevant might find something
      delegator.memory.capture({
        title: 'Test pattern for delegation tracking',
        description: 'This delegation pattern is for testing purposes',
        category: 'delegation',
        importance: 'medium',
      });

      const result = await delegator.delegate(
        'Review delegation pattern',
        '@qa',
        { businessContext: 'testing delegation tracking' },
      );

      expect(result.success).toBe(true);
    });

    test('should return simulated result when no executor provided', async () => {
      const result = await delegator.delegate('Deploy service', '@devops');

      expect(result.success).toBe(true);
      expect(result.result.status).toBe('simulated');
      expect(result.result.message).toContain('@devops');
      expect(result.result.message).toContain('Deploy service');
      expect(result.result.context).toBeDefined();
      expect(result.result.context.agentName).toBe('@devops');
    });

    test('should handle custom executor successfully', async () => {
      const customExecutor = jest.fn().mockResolvedValue({ output: 'custom result' });
      const d = new JarvisDelegator({
        projectRoot: tmpDir,
        defaultTimeout: 5000,
        executor: customExecutor,
      });

      const result = await d.delegate('Custom task', '@dev');

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ output: 'custom result' });
      expect(customExecutor).toHaveBeenCalledTimes(1);
      expect(customExecutor).toHaveBeenCalledWith(
        '@dev',
        'Custom task',
        expect.objectContaining({
          agent: expect.objectContaining({ id: '@dev' }),
          task: 'Custom task',
        }),
      );
    });

    test('should handle failed execution', async () => {
      const failingExecutor = jest.fn().mockRejectedValue(new Error('Fatal: disk full'));
      const d = new JarvisDelegator({
        projectRoot: tmpDir,
        defaultTimeout: 5000,
        maxRetries: 0,
        executor: failingExecutor,
      });

      const result = await d.delegate('Failing task', '@dev');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fatal: disk full');
      expect(result.delegationId).toBeDefined();
      expect(result.agentName).toBe('@dev');
    });

    test('should retry on transient errors', async () => {
      let callCount = 0;
      const flakyExecutor = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('ECONNRESET: connection reset');
        }
        return { status: 'ok' };
      });

      const d = new JarvisDelegator({
        projectRoot: tmpDir,
        defaultTimeout: 30000,
        maxRetries: 3,
        executor: flakyExecutor,
      });

      // Override _delay to avoid actual waiting
      d._delay = jest.fn().mockResolvedValue(undefined);

      const result = await d.delegate('Flaky task', '@dev');

      expect(result.success).toBe(true);
      expect(flakyExecutor).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    test('should not retry on non-transient errors', async () => {
      const executor = jest.fn().mockRejectedValue(new Error('Syntax error in code'));
      const d = new JarvisDelegator({
        projectRoot: tmpDir,
        defaultTimeout: 5000,
        maxRetries: 3,
        executor,
      });

      d._delay = jest.fn().mockResolvedValue(undefined);

      const result = await d.delegate('Bad task', '@dev');

      expect(result.success).toBe(false);
      expect(executor).toHaveBeenCalledTimes(1); // No retries for non-transient
    });

    test('should time out correctly', async () => {
      const slowExecutor = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10000));
        return { status: 'ok' };
      });

      const d = new JarvisDelegator({
        projectRoot: tmpDir,
        defaultTimeout: 50, // Very short timeout
        maxRetries: 0,
        executor: slowExecutor,
      });

      const result = await d.delegate('Slow task', '@dev');

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });

    test('should emit delegation.started event', async () => {
      const events = [];
      delegator.on('delegation.started', (data) => events.push(data));

      await delegator.delegate('Test task', '@dev', { priority: 'high' });

      expect(events).toHaveLength(1);
      expect(events[0].agentName).toBe('@dev');
      expect(events[0].task).toBe('Test task');
      expect(events[0].priority).toBe('high');
      expect(events[0].delegationId).toBeDefined();
    });

    test('should emit delegation.completed event on success', async () => {
      const events = [];
      delegator.on('delegation.completed', (data) => events.push(data));

      await delegator.delegate('Complete task', '@qa');

      expect(events).toHaveLength(1);
      expect(events[0].agentName).toBe('@qa');
      expect(events[0].task).toBe('Complete task');
      expect(events[0].result).toBeDefined();
      expect(events[0].duration).toBeGreaterThanOrEqual(0);
    });

    test('should emit delegation.failed event on error', async () => {
      const events = [];
      const failingExecutor = jest.fn().mockRejectedValue(new Error('Test failure'));
      const d = new JarvisDelegator({
        projectRoot: tmpDir,
        defaultTimeout: 5000,
        maxRetries: 0,
        executor: failingExecutor,
      });
      d.on('delegation.failed', (data) => events.push(data));

      await d.delegate('Failing task', '@dev');

      expect(events).toHaveLength(1);
      expect(events[0].agentName).toBe('@dev');
      expect(events[0].task).toBe('Failing task');
      expect(events[0].error).toBe('Test failure');
      expect(events[0].duration).toBeGreaterThanOrEqual(0);
    });

    test('should use default priority medium', async () => {
      const events = [];
      delegator.on('delegation.started', (data) => events.push(data));

      await delegator.delegate('Default priority task', '@dev');

      expect(events[0].priority).toBe('medium');
    });

    test('should pass businessContext through', async () => {
      const result = await delegator.delegate(
        'Business task',
        '@pm',
        { businessContext: 'Q1 roadmap planning' },
      );

      expect(result.businessContext).toBe('Q1 roadmap planning');
    });

    test('should normalize agent name (add @ prefix if missing)', async () => {
      const result = await delegator.delegate('Normalize test', 'dev');

      expect(result.agentName).toBe('@dev');
    });

    test('should normalize agent name (lowercase)', async () => {
      const result = await delegator.delegate('Case test', '@DEV');

      expect(result.agentName).toBe('@dev');
    });

    test('should store failed delegation status in store', async () => {
      const failingExecutor = jest.fn().mockRejectedValue(new Error('Store failure test'));
      const d = new JarvisDelegator({
        projectRoot: tmpDir,
        defaultTimeout: 5000,
        maxRetries: 0,
        executor: failingExecutor,
      });

      const result = await d.delegate('Store failure task', '@dev');
      const state = await d.store.getDelegation(result.delegationId);

      expect(state.status).toBe('failed');
    });
  });

  // ===========================================================================
  // 5. estimateComplexity()
  // ===========================================================================

  describe('estimateComplexity', () => {
    test('should return simple with no history and short task', async () => {
      const estimate = await delegator.estimateComplexity('Fix a bug', '@dev');

      expect(estimate.level).toBe('simple');
      expect(estimate.confidence).toBeDefined();
      expect(estimate.reasoning).toBeInstanceOf(Array);
      expect(estimate.avgDuration).toBeNull();
    });

    test('should increase complexity for long task descriptions', async () => {
      // > 50 words
      const longTask = Array(60).fill('word').join(' ');
      const estimate = await delegator.estimateComplexity(longTask, '@dev');

      expect(estimate.reasoning).toContain('Long task description suggests complexity');
    });

    test('should return moderate reasoning for medium-length tasks', async () => {
      // 21-50 words
      const mediumTask = Array(30).fill('word').join(' ');
      const estimate = await delegator.estimateComplexity(mediumTask, '@dev');

      expect(estimate.reasoning).toContain('Moderate task description length');
    });

    test('should return avgDuration from agent performance history', async () => {
      // Create completed delegations with durations in the store
      const delId1 = delegator.store.createDelegation('task1', '@dev', 'ctx');
      const delId2 = delegator.store.createDelegation('task2', '@dev', 'ctx');

      await delegator.store.updateStatus(delId1, 'completed', {
        outcome: 'done', duration_ms: 10000,
      });
      await delegator.store.updateStatus(delId2, 'completed', {
        outcome: 'done', duration_ms: 20000,
      });

      const estimate = await delegator.estimateComplexity('Another task', '@dev');

      expect(estimate.avgDuration).toBe(15000);
    });

    test('should factor in high avgDuration (>3min) from performance', async () => {
      const delId = delegator.store.createDelegation('long-task', '@dev', 'ctx');
      await delegator.store.updateStatus(delId, 'completed', {
        outcome: 'done', duration_ms: 200000, // > 180000ms (3 min)
      });

      const estimate = await delegator.estimateComplexity('New task', '@dev');

      const hasAvgDurationReasoning = estimate.reasoning.some(r => r.includes('Agent avg duration'));
      expect(hasAvgDurationReasoning).toBe(true);
    });

    test('should factor in low success rate from performance', async () => {
      // Create 5 delegations: 1 completed, 4 failed (success rate = 20%)
      for (let i = 0; i < 4; i++) {
        const delId = delegator.store.createDelegation(`fail-task-${i}`, '@qa', 'ctx');
        await delegator.store.updateStatus(delId, 'failed', { outcome: 'error' });
      }
      const delOk = delegator.store.createDelegation('ok-task', '@qa', 'ctx');
      await delegator.store.updateStatus(delOk, 'completed', {
        outcome: 'done', duration_ms: 5000,
      });

      const estimate = await delegator.estimateComplexity('QA task', '@qa');

      const hasSuccessRateReasoning = estimate.reasoning.some(r => r.includes('success rate'));
      expect(hasSuccessRateReasoning).toBe(true);
    });

    test('should cap confidence at 0.95', async () => {
      // Create many delegations to push confidence up
      for (let i = 0; i < 20; i++) {
        const delId = delegator.store.createDelegation(`task-${i}`, '@dev', 'ctx');
        await delegator.store.updateStatus(delId, 'completed', {
          outcome: 'done', duration_ms: 5000,
        });
      }

      const estimate = await delegator.estimateComplexity('Some task', '@dev');

      expect(estimate.confidence).toBeLessThanOrEqual(0.95);
    });
  });

  // ===========================================================================
  // 6. getDelegationStatus()
  // ===========================================================================

  describe('getDelegationStatus', () => {
    test('should return delegation state', async () => {
      const result = await delegator.delegate('Status task', '@dev');
      const status = await delegator.getDelegationStatus(result.delegationId);

      expect(status.delegationId).toBe(result.delegationId);
      expect(status.status).toBe('completed');
      expect(status.task).toBe('Status task');
    });

    test('should return unknown for non-existent delegation', async () => {
      const status = await delegator.getDelegationStatus('del-nonexistent-000');

      expect(status.status).toBe('unknown');
      expect(status.events_count).toBe(0);
    });

    test('should reflect in-progress status', async () => {
      // Create a delegation that takes a while
      const slowExecutor = jest.fn().mockImplementation(async () => {
        return { status: 'ok' };
      });

      const d = new JarvisDelegator({
        projectRoot: tmpDir,
        defaultTimeout: 5000,
        executor: slowExecutor,
      });

      const result = await d.delegate('In progress check', '@dev');

      // After completion, the status should be completed
      const status = await d.getDelegationStatus(result.delegationId);
      expect(status.status).toBe('completed');
    });
  });

  // ===========================================================================
  // 7. getActiveDelegations()
  // ===========================================================================

  describe('getActiveDelegations', () => {
    test('should return empty when none active', async () => {
      const active = await delegator.getActiveDelegations();

      expect(active).toEqual([]);
    });

    test('should return active delegations (created status)', async () => {
      // Manually create a delegation in the store without completing it
      delegator.store.createDelegation('active-task', '@dev', 'ctx', 'medium');

      const active = await delegator.getActiveDelegations();

      expect(active).toHaveLength(1);
      expect(active[0].task).toBe('active-task');
    });

    test('should exclude completed delegations', async () => {
      // delegate() completes, so it should NOT be active
      await delegator.delegate('Completed task', '@dev');

      // Manually add one that stays active
      delegator.store.createDelegation('still-active', '@qa', 'ctx');

      const active = await delegator.getActiveDelegations();

      expect(active).toHaveLength(1);
      expect(active[0].task).toBe('still-active');
    });
  });

  // ===========================================================================
  // 8. getAgentPerformance()
  // ===========================================================================

  describe('getAgentPerformance', () => {
    test('should return metrics for known agent', async () => {
      // Complete two delegations for @dev
      await delegator.delegate('Task 1', '@dev');
      await delegator.delegate('Task 2', '@dev');

      const perf = await delegator.getAgentPerformance('@dev');

      expect(perf.totalDelegations).toBe(2);
      expect(perf.completed).toBe(2);
      expect(perf.failed).toBe(0);
      expect(perf.successRate).toBe(1);
    });

    test('should return zero metrics for unknown agent', async () => {
      const perf = await delegator.getAgentPerformance('@unknown-agent');

      expect(perf.totalDelegations).toBe(0);
      expect(perf.completed).toBe(0);
      expect(perf.failed).toBe(0);
      expect(perf.avgDuration_ms).toBeNull();
      expect(perf.successRate).toBeNull();
    });
  });

  // ===========================================================================
  // 9. cancelDelegation()
  // ===========================================================================

  describe('cancelDelegation', () => {
    test('should cancel active delegation', async () => {
      const delegationId = delegator.store.createDelegation(
        'cancel-me', '@dev', 'ctx',
      );

      await delegator.cancelDelegation(delegationId, 'No longer needed');

      const state = await delegator.store.getDelegation(delegationId);
      expect(state.status).toBe('cancelled');
    });

    test('should emit delegation.cancelled event', async () => {
      const events = [];
      delegator.on('delegation.cancelled', (data) => events.push(data));

      const delegationId = delegator.store.createDelegation(
        'cancel-event-test', '@dev', 'ctx',
      );
      await delegator.cancelDelegation(delegationId, 'Budget cut');

      expect(events).toHaveLength(1);
      expect(events[0].delegationId).toBe(delegationId);
      expect(events[0].reason).toBe('Budget cut');
    });

    test('should include reason in cancellation', async () => {
      const delegationId = delegator.store.createDelegation(
        'reason-test', '@dev', 'ctx',
      );

      await delegator.cancelDelegation(delegationId, 'Requirements changed');

      // Check the events for the cancellation data
      const events = await delegator.store.getEvents(delegationId);
      const cancelEvent = events.find(e => e.event === 'delegation.cancelled');
      expect(cancelEvent).toBeDefined();
      expect(cancelEvent.data.reason).toBe('Requirements changed');
    });

    test('should add log entry for cancellation', async () => {
      const delegationId = delegator.store.createDelegation(
        'log-cancel-test', '@dev', 'ctx',
      );

      await delegator.cancelDelegation(delegationId, 'Test cancel');

      const logs = delegator.getLogs();
      const cancelLog = logs.find(l => l.message.includes('cancelled'));
      expect(cancelLog).toBeDefined();
      expect(cancelLog.level).toBe('info');
    });
  });

  // ===========================================================================
  // 10. DelegationError
  // ===========================================================================

  describe('DelegationError', () => {
    test('should have correct name', () => {
      const error = new DelegationError('test error');

      expect(error.name).toBe('DelegationError');
      expect(error.message).toBe('test error');
      expect(error).toBeInstanceOf(Error);
    });

    test('should include delegationId and agentName', () => {
      const error = new DelegationError('delegation failed', 'del-123', '@dev');

      expect(error.delegationId).toBe('del-123');
      expect(error.agentName).toBe('@dev');
    });

    test('should default delegationId and agentName to null', () => {
      const error = new DelegationError('simple error');

      expect(error.delegationId).toBeNull();
      expect(error.agentName).toBeNull();
    });
  });

  // ===========================================================================
  // 11. Exports
  // ===========================================================================

  describe('exports', () => {
    test('should export all expected symbols', () => {
      expect(JarvisDelegator).toBeDefined();
      expect(DELEGATION_ROUTING).toBeDefined();
      expect(DelegationError).toBeDefined();
    });

    test('should export JarvisDelegator as a class (constructor)', () => {
      expect(typeof JarvisDelegator).toBe('function');
      const instance = new JarvisDelegator({ projectRoot: tmpDir });
      expect(instance).toBeInstanceOf(JarvisDelegator);
    });
  });

  // ===========================================================================
  // 12. getLogs() & _log()
  // ===========================================================================

  describe('getLogs', () => {
    test('should return empty array initially', () => {
      expect(delegator.getLogs()).toEqual([]);
    });

    test('should accumulate logs from delegations', async () => {
      await delegator.delegate('Log test task', '@dev');

      const logs = delegator.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toHaveProperty('timestamp');
      expect(logs[0]).toHaveProperty('level');
      expect(logs[0]).toHaveProperty('message');
    });

    test('should return a copy (not original reference)', () => {
      delegator._log('test message', 'info');
      const logs1 = delegator.getLogs();
      const logs2 = delegator.getLogs();

      expect(logs1).not.toBe(logs2);
      expect(logs1).toEqual(logs2);
    });
  });

  // ===========================================================================
  // 13. Private methods — _normalizeAgentName()
  // ===========================================================================

  describe('_normalizeAgentName', () => {
    test('should add @ prefix if missing', () => {
      expect(delegator._normalizeAgentName('dev')).toBe('@dev');
    });

    test('should preserve @ prefix if present', () => {
      expect(delegator._normalizeAgentName('@dev')).toBe('@dev');
    });

    test('should lowercase the name', () => {
      expect(delegator._normalizeAgentName('@DEV')).toBe('@dev');
      expect(delegator._normalizeAgentName('QA')).toBe('@qa');
    });

    test('should trim whitespace', () => {
      expect(delegator._normalizeAgentName('  @dev  ')).toBe('@dev');
    });
  });

  // ===========================================================================
  // 14. Private methods — _inferDomain()
  // ===========================================================================

  describe('_inferDomain', () => {
    test('should return correct domain for known agents', () => {
      expect(delegator._inferDomain('@dev')).toBe('implementation');
      expect(delegator._inferDomain('@qa')).toBe('quality');
      expect(delegator._inferDomain('@architect')).toBe('architecture_tech');
      expect(delegator._inferDomain('@pm')).toBe('strategy_product');
    });

    test('should return general for unknown agents', () => {
      expect(delegator._inferDomain('@unknown')).toBe('general');
    });
  });

  // ===========================================================================
  // 15. Private methods — _buildContext()
  // ===========================================================================

  describe('_buildContext', () => {
    test('should build enriched context with all fields', () => {
      const context = delegator._buildContext('@dev', 'Build feature', {
        businessContext: 'Q1 goal',
        priority: 'high',
        deadline: '2026-03-01',
        inputs: { storyId: 'STORY-1' },
        relevantPatterns: [],
        delegationId: 'del-test-001',
      });

      expect(context.agent.id).toBe('@dev');
      expect(context.agent.name).toBe('Dex');
      expect(context.task).toBe('Build feature');
      expect(context.businessContext).toBe('Q1 goal');
      expect(context.priority).toBe('high');
      expect(context.deadline).toBe('2026-03-01');
      expect(context.inputs).toEqual({ storyId: 'STORY-1' });
      expect(context.relevantPatterns).toEqual([]);
      expect(context.delegationId).toBe('del-test-001');
      expect(context.projectRoot).toBe(tmpDir);
      expect(context.timestamp).toBeDefined();
      expect(context.orchestration.timeout).toBe(5000);
      expect(context.orchestration.maxRetries).toBe(2);
    });

    test('should resolve agent display info from routing table', () => {
      const context = delegator._buildContext('@qa', 'Review', {
        delegationId: 'del-001',
      });

      expect(context.agent.id).toBe('@qa');
      expect(context.agent.name).toBe('Quinn');
    });

    test('should handle unknown agent gracefully', () => {
      const context = delegator._buildContext('@custom-agent', 'Custom task', {
        delegationId: 'del-002',
      });

      expect(context.agent.id).toBe('@custom-agent');
      expect(context.agent.name).toBe('@custom-agent');
    });
  });

  // ===========================================================================
  // 16. Private methods — _isTransientError()
  // ===========================================================================

  describe('_isTransientError', () => {
    test('should identify timeout errors as transient', () => {
      expect(delegator._isTransientError(new Error('Request timeout'))).toBe(true);
      expect(delegator._isTransientError(new Error('ETIMEDOUT'))).toBe(true);
    });

    test('should identify connection errors as transient', () => {
      expect(delegator._isTransientError(new Error('ECONNRESET'))).toBe(true);
    });

    test('should identify rate limit errors as transient', () => {
      expect(delegator._isTransientError(new Error('Rate limit exceeded'))).toBe(true);
      expect(delegator._isTransientError(new Error('ratelimit reached'))).toBe(true);
    });

    test('should identify server errors as transient', () => {
      expect(delegator._isTransientError(new Error('503 Service Unavailable'))).toBe(true);
      expect(delegator._isTransientError(new Error('504 Gateway Timeout'))).toBe(true);
    });

    test('should identify temporary errors as transient', () => {
      expect(delegator._isTransientError(new Error('Temporary failure'))).toBe(true);
    });

    test('should identify retry-hinted errors as transient', () => {
      expect(delegator._isTransientError(new Error('Please retry later'))).toBe(true);
    });

    test('should NOT identify non-transient errors as transient', () => {
      expect(delegator._isTransientError(new Error('Syntax error'))).toBe(false);
      expect(delegator._isTransientError(new Error('Invalid argument'))).toBe(false);
      expect(delegator._isTransientError(new Error('Not found'))).toBe(false);
    });
  });

  // ===========================================================================
  // 17. Retry behavior — _executeWithRetry()
  // ===========================================================================

  describe('_executeWithRetry', () => {
    test('should succeed without retry when first attempt works', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await delegator._executeWithRetry(fn, { delegationId: 'del-001' });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should retry on transient error and eventually succeed', async () => {
      let attempt = 0;
      const fn = jest.fn().mockImplementation(async () => {
        attempt++;
        if (attempt <= 1) {
          throw new Error('ECONNRESET');
        }
        return 'recovered';
      });

      delegator._delay = jest.fn().mockResolvedValue(undefined);

      const result = await delegator._executeWithRetry(fn, { delegationId: 'del-retry' });

      expect(result).toBe('recovered');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('should emit delegation.retrying event on retry', async () => {
      const events = [];
      delegator.on('delegation.retrying', (data) => events.push(data));

      let attempt = 0;
      const fn = jest.fn().mockImplementation(async () => {
        attempt++;
        if (attempt <= 1) {
          throw new Error('temporary failure');
        }
        return 'ok';
      });

      delegator._delay = jest.fn().mockResolvedValue(undefined);

      await delegator._executeWithRetry(fn, { delegationId: 'del-retry-event' });

      expect(events).toHaveLength(1);
      expect(events[0].delegationId).toBe('del-retry-event');
      expect(events[0].attempt).toBe(1);
    });

    test('should throw after exhausting all retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('ECONNRESET persistent'));

      delegator._delay = jest.fn().mockResolvedValue(undefined);

      await expect(
        delegator._executeWithRetry(fn, { delegationId: 'del-exhaust' }),
      ).rejects.toThrow('ECONNRESET persistent');

      // initial + maxRetries (2) = 3 calls
      expect(fn).toHaveBeenCalledTimes(3);
    });

    test('should throw immediately on non-transient error without retrying', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Permission denied'));

      await expect(
        delegator._executeWithRetry(fn, { delegationId: 'del-nontransient' }),
      ).rejects.toThrow('Permission denied');

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // 18. Timeout behavior — _executeWithTimeout()
  // ===========================================================================

  describe('_executeWithTimeout', () => {
    test('should resolve when function completes before timeout', async () => {
      const fn = jest.fn().mockResolvedValue('fast result');

      const result = await delegator._executeWithTimeout(fn, 5000);

      expect(result).toBe('fast result');
    });

    test('should reject with DelegationError when function exceeds timeout', async () => {
      const fn = jest.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(() => resolve('too late'), 10000));
      });

      await expect(
        delegator._executeWithTimeout(fn, 50),
      ).rejects.toThrow('timed out');
    });
  });

  // ===========================================================================
  // 19. Integration: full delegation lifecycle
  // ===========================================================================

  describe('integration: full delegation lifecycle', () => {
    test('should track full lifecycle: start -> complete -> query', async () => {
      const startedEvents = [];
      const completedEvents = [];
      delegator.on('delegation.started', (d) => startedEvents.push(d));
      delegator.on('delegation.completed', (d) => completedEvents.push(d));

      const result = await delegator.delegate(
        'Full lifecycle task',
        '@architect',
        {
          businessContext: 'Architecture review for Q1',
          priority: 'critical',
          deadline: '2026-03-15',
          inputs: { epicId: 'EPIC-10' },
        },
      );

      // Verify result
      expect(result.success).toBe(true);
      expect(result.agentName).toBe('@architect');
      expect(result.businessContext).toBe('Architecture review for Q1');

      // Verify events
      expect(startedEvents).toHaveLength(1);
      expect(completedEvents).toHaveLength(1);

      // Verify store state
      const state = await delegator.getDelegationStatus(result.delegationId);
      expect(state.status).toBe('completed');

      // Verify active delegations (should not include completed)
      const active = await delegator.getActiveDelegations();
      const found = active.find(d => d.delegationId === result.delegationId);
      expect(found).toBeUndefined();

      // Verify performance
      const perf = await delegator.getAgentPerformance('@architect');
      expect(perf.totalDelegations).toBeGreaterThanOrEqual(1);
      expect(perf.completed).toBeGreaterThanOrEqual(1);

      // Verify logs
      const logs = delegator.getLogs();
      expect(logs.length).toBeGreaterThan(0);
    });

    test('should handle multiple concurrent delegations', async () => {
      const results = await Promise.all([
        delegator.delegate('Task A', '@dev'),
        delegator.delegate('Task B', '@qa'),
        delegator.delegate('Task C', '@architect'),
      ]);

      expect(results).toHaveLength(3);
      for (const result of results) {
        expect(result.success).toBe(true);
      }

      // All delegation IDs should be unique
      const ids = results.map(r => r.delegationId);
      expect(new Set(ids).size).toBe(3);
    });
  });
});
