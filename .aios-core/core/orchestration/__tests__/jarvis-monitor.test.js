/**
 * Jarvis Monitor - Unit Tests
 *
 * Comprehensive tests for delegation monitoring, stale detection,
 * alert generation, health reports, and event emission.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  JarvisMonitor,
  PRIORITY_MULTIPLIERS,
  AlertSeverity,
} = require('../jarvis-monitor');
const { JarvisDelegationStore } = require('../jarvis-delegation-store');

describe('JarvisMonitor', () => {
  let store;
  let tmpDir;

  beforeEach(() => {
    tmpDir = path.join(
      os.tmpdir(),
      `jarvis-monitor-test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    );
    store = new JarvisDelegationStore(tmpDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ===========================================================================
  // 1. Constructor
  // ===========================================================================

  describe('constructor', () => {
    test('should create instance with default options', () => {
      const monitor = new JarvisMonitor({ delegationStore: store });

      expect(monitor._staleThresholdMs).toBe(2 * 60 * 60 * 1000); // 2h
      expect(monitor._pollIntervalMs).toBe(5 * 60 * 1000);        // 5 min
      expect(monitor._maxAlertsPerDelegation).toBe(3);
      expect(monitor._running).toBe(false);
    });

    test('should create instance with custom options', () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 1000,
        pollIntervalMs: 500,
        maxAlertsPerDelegation: 5,
      });

      expect(monitor._staleThresholdMs).toBe(1000);
      expect(monitor._pollIntervalMs).toBe(500);
      expect(monitor._maxAlertsPerDelegation).toBe(5);
    });

    test('should throw if delegationStore is not provided', () => {
      expect(() => new JarvisMonitor()).toThrow('delegationStore is required');
      expect(() => new JarvisMonitor({})).toThrow('delegationStore is required');
    });

    test('should initialize with empty alert history and counts', () => {
      const monitor = new JarvisMonitor({ delegationStore: store });

      expect(monitor._alertHistory).toEqual([]);
      expect(monitor._alertCounts.size).toBe(0);
      expect(monitor._interval).toBeNull();
    });
  });

  // ===========================================================================
  // 2. PRIORITY_MULTIPLIERS
  // ===========================================================================

  describe('PRIORITY_MULTIPLIERS', () => {
    test('should have all 4 priority levels', () => {
      expect(Object.keys(PRIORITY_MULTIPLIERS)).toHaveLength(4);
      expect(PRIORITY_MULTIPLIERS).toHaveProperty('critical');
      expect(PRIORITY_MULTIPLIERS).toHaveProperty('high');
      expect(PRIORITY_MULTIPLIERS).toHaveProperty('medium');
      expect(PRIORITY_MULTIPLIERS).toHaveProperty('low');
    });

    test('should have correct multiplier values', () => {
      expect(PRIORITY_MULTIPLIERS.critical).toBe(0.25);
      expect(PRIORITY_MULTIPLIERS.high).toBe(0.5);
      expect(PRIORITY_MULTIPLIERS.medium).toBe(1.0);
      expect(PRIORITY_MULTIPLIERS.low).toBe(2.0);
    });
  });

  // ===========================================================================
  // 3. AlertSeverity
  // ===========================================================================

  describe('AlertSeverity', () => {
    test('should have info, warning, and critical levels', () => {
      expect(AlertSeverity.INFO).toBe('info');
      expect(AlertSeverity.WARNING).toBe('warning');
      expect(AlertSeverity.CRITICAL).toBe('critical');
    });

    test('should have exactly 3 severity levels', () => {
      expect(Object.keys(AlertSeverity)).toHaveLength(3);
    });
  });

  // ===========================================================================
  // 4. start() / stop()
  // ===========================================================================

  describe('start() / stop()', () => {
    let monitor;

    beforeEach(() => {
      monitor = new JarvisMonitor({
        delegationStore: store,
        pollIntervalMs: 60000, // Long interval to avoid accidental triggers
      });
    });

    afterEach(() => {
      monitor.stop();
    });

    test('should set running state to true on start()', () => {
      monitor.start();
      expect(monitor._running).toBe(true);
    });

    test('should emit monitor.started event', () => {
      const handler = jest.fn();
      monitor.on('monitor.started', handler);

      monitor.start();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('should return this for chaining', () => {
      const result = monitor.start();
      expect(result).toBe(monitor);
    });

    test('should not create multiple intervals when called twice', () => {
      monitor.start();
      const firstInterval = monitor._interval;

      monitor.start(); // second call
      const secondInterval = monitor._interval;

      // Should be the same interval reference (no duplicate)
      expect(secondInterval).toBe(firstInterval);
    });

    test('should emit monitor.stopped and clear interval on stop()', () => {
      const handler = jest.fn();
      monitor.on('monitor.stopped', handler);

      monitor.start();
      expect(monitor._interval).not.toBeNull();

      monitor.stop();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(monitor._running).toBe(false);
      expect(monitor._interval).toBeNull();
    });

    test('should not emit monitor.stopped if not running', () => {
      const handler = jest.fn();
      monitor.on('monitor.stopped', handler);

      monitor.stop(); // not running

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 5. checkNow()
  // ===========================================================================

  describe('checkNow()', () => {
    test('should return empty array when no delegations exist', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 50,
      });

      const alerts = await monitor.checkNow();
      expect(alerts).toEqual([]);
    });

    test('should return empty array when delegations are healthy (fresh)', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 60000, // 1 minute - plenty of time
      });

      store.createDelegation('task1', '@dev', 'context', 'medium');

      const alerts = await monitor.checkNow();
      expect(alerts).toEqual([]);
    });

    test('should detect stale delegation', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 50,
      });

      store.createDelegation('stale task', '@dev', 'context', 'medium');

      // Wait for the delegation to become stale
      await new Promise(r => setTimeout(r, 100));

      const alerts = await monitor.checkNow();

      expect(alerts.length).toBeGreaterThanOrEqual(1);
      expect(alerts[0].severity).toBeDefined();
      expect(alerts[0].message).toContain('stale');
    });

    test('should detect escalated delegation', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 999999, // high threshold to avoid stale detection
      });

      const delId = store.createDelegation('escalated task', '@dev', 'context', 'medium');
      await store.updateStatus(delId, 'escalated', { reason: 'needs help' });

      const alerts = await monitor.checkNow();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[0].message).toContain('escalated');
      expect(alerts[0].message).toContain('CEO attention');
    });

    test('should return correct alert structure', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 50,
      });

      store.createDelegation('review PR', '@qa', 'quality check', 'medium');
      await new Promise(r => setTimeout(r, 100));

      const alerts = await monitor.checkNow();

      expect(alerts.length).toBeGreaterThanOrEqual(1);
      const alert = alerts[0];
      expect(alert).toHaveProperty('delegationId');
      expect(alert).toHaveProperty('agentName');
      expect(alert).toHaveProperty('task');
      expect(alert).toHaveProperty('severity');
      expect(alert).toHaveProperty('message');
      expect(alert).toHaveProperty('timestamp');
      expect(alert.agentName).toBe('@qa');
      expect(alert.task).toBe('review PR');
    });

    test('should respect priority multipliers (critical gets stale faster)', async () => {
      // staleThresholdMs = 200
      // critical multiplier = 0.25 => effective threshold = 50ms
      // low multiplier = 2.0 => effective threshold = 400ms
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 200,
      });

      store.createDelegation('critical task', '@dev', 'ctx', 'critical');
      store.createDelegation('low task', '@dev', 'ctx', 'low');

      // Wait 80ms: past critical threshold (50ms) but not low (400ms)
      await new Promise(r => setTimeout(r, 80));

      const alerts = await monitor.checkNow();

      // Critical should be stale, low should not be stale yet
      const criticalAlerts = alerts.filter(a => a.task === 'critical task');
      const lowAlerts = alerts.filter(a => a.task === 'low task' && a.message.includes('stale'));

      expect(criticalAlerts.length).toBeGreaterThanOrEqual(1);
      expect(lowAlerts.length).toBe(0);
    });

    test('should NOT alert for completed delegations', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 50,
      });

      const delId = store.createDelegation('done task', '@dev', 'ctx', 'medium');
      await store.updateStatus(delId, 'completed', { outcome: 'done' });

      await new Promise(r => setTimeout(r, 100));

      const alerts = await monitor.checkNow();
      expect(alerts).toEqual([]);
    });

    test('should NOT alert for failed delegations', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 50,
      });

      const delId = store.createDelegation('failed task', '@dev', 'ctx', 'medium');
      await store.updateStatus(delId, 'failed', { outcome: 'error' });

      await new Promise(r => setTimeout(r, 100));

      const alerts = await monitor.checkNow();
      expect(alerts).toEqual([]);
    });

    test('should NOT alert for cancelled delegations', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 50,
      });

      const delId = store.createDelegation('cancelled task', '@dev', 'ctx', 'medium');
      await store.updateStatus(delId, 'cancelled', {});

      await new Promise(r => setTimeout(r, 100));

      const alerts = await monitor.checkNow();
      expect(alerts).toEqual([]);
    });
  });

  // ===========================================================================
  // 6. _evaluateDelegation()
  // ===========================================================================

  describe('_evaluateDelegation()', () => {
    let monitor;

    beforeEach(() => {
      monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 1000, // 1 second base
      });
    });

    test('should return null for healthy (fresh) delegation', () => {
      const now = Date.now();
      const delegation = {
        delegationId: 'del-test-001',
        priority: 'medium',
        status: 'in_progress',
        createdAt: new Date(now - 100).toISOString(), // 100ms ago
      };

      const result = monitor._evaluateDelegation(delegation, now);
      expect(result).toBeNull();
    });

    test('should return warning for stale medium-priority delegation', () => {
      const now = Date.now();
      const delegation = {
        delegationId: 'del-test-002',
        priority: 'medium',
        status: 'in_progress',
        createdAt: new Date(now - 2000).toISOString(), // 2s ago, threshold is 1s
      };

      const result = monitor._evaluateDelegation(delegation, now);

      expect(result).not.toBeNull();
      expect(result.status).toBe('stale');
      expect(result.severity).toBe('warning');
      expect(result.delegationId).toBe('del-test-002');
    });

    test('should return critical for stale high-priority delegation', () => {
      const now = Date.now();
      // high multiplier = 0.5, threshold = 500ms
      const delegation = {
        delegationId: 'del-test-003',
        priority: 'high',
        status: 'in_progress',
        createdAt: new Date(now - 600).toISOString(), // 600ms ago, threshold is 500ms
      };

      const result = monitor._evaluateDelegation(delegation, now);

      expect(result).not.toBeNull();
      expect(result.status).toBe('stale');
      expect(result.severity).toBe('critical');
    });

    test('should return critical for stale critical-priority delegation', () => {
      const now = Date.now();
      // critical multiplier = 0.25, threshold = 250ms
      const delegation = {
        delegationId: 'del-test-004',
        priority: 'critical',
        status: 'in_progress',
        createdAt: new Date(now - 300).toISOString(), // 300ms ago, threshold is 250ms
      };

      const result = monitor._evaluateDelegation(delegation, now);

      expect(result).not.toBeNull();
      expect(result.status).toBe('stale');
      expect(result.severity).toBe('critical');
    });

    test('should return warning for stale low-priority delegation', () => {
      const now = Date.now();
      // low multiplier = 2.0, threshold = 2000ms
      const delegation = {
        delegationId: 'del-test-low',
        priority: 'low',
        status: 'in_progress',
        createdAt: new Date(now - 2500).toISOString(), // 2500ms ago, threshold is 2000ms
      };

      const result = monitor._evaluateDelegation(delegation, now);

      expect(result).not.toBeNull();
      expect(result.status).toBe('stale');
      expect(result.severity).toBe('warning'); // low is not critical/high
    });

    test('should return info when approaching threshold (>75%)', () => {
      const now = Date.now();
      // medium threshold = 1000ms, 75% = 750ms
      // Age must be >= 750 but < 1000
      const delegation = {
        delegationId: 'del-test-approaching',
        priority: 'medium',
        status: 'in_progress',
        createdAt: new Date(now - 800).toISOString(), // 800ms ago
      };

      const result = monitor._evaluateDelegation(delegation, now);

      expect(result).not.toBeNull();
      expect(result.status).toBe('approaching');
      expect(result.severity).toBe('info');
      expect(result.message).toContain('approaching stale threshold');
    });

    test('should return critical for escalated delegation', () => {
      const now = Date.now();
      const delegation = {
        delegationId: 'del-test-escalated',
        priority: 'medium',
        status: 'escalated',
        task: 'urgent fix',
        createdAt: new Date(now).toISOString(),
      };

      const result = monitor._evaluateDelegation(delegation, now);

      expect(result).not.toBeNull();
      expect(result.status).toBe('escalated');
      expect(result.severity).toBe('critical');
      expect(result.message).toContain('escalated');
      expect(result.message).toContain('CEO attention');
    });

    test('should return null when delegation has no createdAt and is not escalated', () => {
      const now = Date.now();
      const delegation = {
        delegationId: 'del-test-no-date',
        priority: 'medium',
        status: 'in_progress',
        // no createdAt
      };

      const result = monitor._evaluateDelegation(delegation, now);
      expect(result).toBeNull();
    });

    test('should default to medium priority when priority is missing', () => {
      const now = Date.now();
      // No priority => defaults to medium => threshold = 1000ms
      const delegation = {
        delegationId: 'del-test-no-priority',
        status: 'in_progress',
        createdAt: new Date(now - 1500).toISOString(), // 1500ms ago, past 1000ms threshold
      };

      const result = monitor._evaluateDelegation(delegation, now);

      expect(result).not.toBeNull();
      expect(result.status).toBe('stale');
      expect(result.severity).toBe('warning');
    });
  });

  // ===========================================================================
  // 7. maxAlertsPerDelegation
  // ===========================================================================

  describe('maxAlertsPerDelegation', () => {
    test('should respect maxAlertsPerDelegation limit', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 50,
        maxAlertsPerDelegation: 2,
      });

      store.createDelegation('limited task', '@dev', 'ctx', 'medium');
      await new Promise(r => setTimeout(r, 100));

      // First check - should generate alert
      const alerts1 = await monitor.checkNow();
      expect(alerts1.length).toBe(1);

      // Second check - should generate alert (count = 2, limit = 2)
      const alerts2 = await monitor.checkNow();
      expect(alerts2.length).toBe(1);

      // Third check - should NOT generate alert (count >= limit)
      const alerts3 = await monitor.checkNow();
      expect(alerts3.length).toBe(0);
    });
  });

  // ===========================================================================
  // 8. getHealthReport()
  // ===========================================================================

  describe('getHealthReport()', () => {
    test('should return empty report when no delegations exist', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 1000,
      });

      const report = await monitor.getHealthReport();

      expect(report.healthy).toBe(0);
      expect(report.stale).toBe(0);
      expect(report.escalated).toBe(0);
      expect(report.total).toBe(0);
      expect(report.alerts).toEqual([]);
      expect(report.recommendations).toEqual([]);
    });

    test('should report correct counts with all healthy delegations', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 60000, // very long threshold
      });

      store.createDelegation('task1', '@dev', 'ctx', 'medium');
      store.createDelegation('task2', '@qa', 'ctx', 'low');

      const report = await monitor.getHealthReport();

      expect(report.healthy).toBe(2);
      expect(report.stale).toBe(0);
      expect(report.escalated).toBe(0);
      expect(report.total).toBe(2);
      expect(report.recommendations).toContain(
        'All delegations are running within expected thresholds.',
      );
    });

    test('should report stale delegations with recommendation', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 50,
      });

      store.createDelegation('old task', '@dev', 'ctx', 'medium');
      await new Promise(r => setTimeout(r, 100));

      const report = await monitor.getHealthReport();

      expect(report.stale).toBeGreaterThanOrEqual(1);
      expect(report.total).toBe(1);
      expect(report.recommendations.some(r => r.includes('stale'))).toBe(true);
    });

    test('should report escalated delegations with recommendation', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 999999,
      });

      const delId = store.createDelegation('escalated task', '@dev', 'ctx', 'medium');
      await store.updateStatus(delId, 'escalated', { reason: 'blocked' });

      const report = await monitor.getHealthReport();

      expect(report.escalated).toBe(1);
      expect(report.recommendations.some(r => r.includes('escalated'))).toBe(true);
      expect(report.recommendations.some(r => r.includes('CEO attention'))).toBe(true);
    });

    test('should include alerts array in the report', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 50,
      });

      store.createDelegation('task for report', '@dev', 'ctx', 'medium');
      await new Promise(r => setTimeout(r, 100));

      const report = await monitor.getHealthReport();

      expect(report.alerts).toBeInstanceOf(Array);
      expect(report.alerts.length).toBeGreaterThanOrEqual(1);
      expect(report.alerts[0]).toHaveProperty('delegationId');
      expect(report.alerts[0]).toHaveProperty('status');
      expect(report.alerts[0]).toHaveProperty('severity');
    });

    test('should not include completed delegations in report', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 50,
      });

      const delId = store.createDelegation('done task', '@dev', 'ctx', 'medium');
      await store.updateStatus(delId, 'completed', { outcome: 'done' });

      await new Promise(r => setTimeout(r, 100));

      const report = await monitor.getHealthReport();
      expect(report.total).toBe(0);
    });

    test('should count mixed statuses correctly', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 50,
      });

      // One healthy (completed, excluded from active)
      const del1 = store.createDelegation('completed task', '@dev', 'ctx', 'medium');
      await store.updateStatus(del1, 'completed', { outcome: 'done' });

      // One escalated (active)
      const del2 = store.createDelegation('escalated task', '@dev', 'ctx', 'medium');
      await store.updateStatus(del2, 'escalated', { reason: 'blocked' });

      // One that will be stale
      store.createDelegation('stale task', '@dev', 'ctx', 'medium');
      await new Promise(r => setTimeout(r, 100));

      const report = await monitor.getHealthReport();

      // Total active = 2 (escalated + stale). Completed is excluded.
      expect(report.total).toBe(2);
      expect(report.escalated).toBe(1);
      expect(report.stale).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // 9. getAlertHistory()
  // ===========================================================================

  describe('getAlertHistory()', () => {
    test('should return empty array initially', () => {
      const monitor = new JarvisMonitor({ delegationStore: store });

      const history = monitor.getAlertHistory();
      expect(history).toEqual([]);
    });

    test('should return all alerts after checks', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 50,
      });

      store.createDelegation('task1', '@dev', 'ctx', 'medium');
      store.createDelegation('task2', '@qa', 'ctx', 'medium');
      await new Promise(r => setTimeout(r, 100));

      await monitor.checkNow();

      const history = monitor.getAlertHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    test('should return a copy (not the internal array)', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 50,
      });

      store.createDelegation('task1', '@dev', 'ctx', 'medium');
      await new Promise(r => setTimeout(r, 100));
      await monitor.checkNow();

      const history = monitor.getAlertHistory();
      history.push({ fake: true });

      // Internal array should be unaffected
      expect(monitor.getAlertHistory().length).not.toBe(history.length);
    });
  });

  // ===========================================================================
  // 10. Events
  // ===========================================================================

  describe('events', () => {
    test('should emit alert.stale for stale delegation', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 50,
      });

      const handler = jest.fn();
      monitor.on('alert.stale', handler);

      store.createDelegation('stale task', '@dev', 'ctx', 'medium');
      await new Promise(r => setTimeout(r, 100));

      await monitor.checkNow();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0]).toHaveProperty('delegationId');
      expect(handler.mock.calls[0][0]).toHaveProperty('severity');
    });

    test('should emit alert.critical for critical priority stale delegation', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 200, // critical threshold = 200 * 0.25 = 50ms
      });

      const criticalHandler = jest.fn();
      monitor.on('alert.critical', criticalHandler);

      store.createDelegation('critical task', '@dev', 'ctx', 'critical');
      await new Promise(r => setTimeout(r, 100));

      await monitor.checkNow();

      expect(criticalHandler).toHaveBeenCalledTimes(1);
      expect(criticalHandler.mock.calls[0][0].severity).toBe('critical');
    });

    test('should emit alert.escalated for escalated delegation', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 999999,
      });

      const escalatedHandler = jest.fn();
      monitor.on('alert.escalated', escalatedHandler);

      const delId = store.createDelegation('esc task', '@dev', 'ctx', 'medium');
      await store.updateStatus(delId, 'escalated', { reason: 'needs help' });

      await monitor.checkNow();

      expect(escalatedHandler).toHaveBeenCalledTimes(1);
    });

    test('should emit monitor.check after each check cycle', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 999999,
      });

      const handler = jest.fn();
      monitor.on('monitor.check', handler);

      await monitor.checkNow();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0]).toHaveProperty('alerts');
      expect(handler.mock.calls[0][0]).toHaveProperty('timestamp');
    });

    test('should emit both alert.stale and alert.critical for high-priority stale', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 100, // high threshold = 100 * 0.5 = 50ms
      });

      const staleHandler = jest.fn();
      const criticalHandler = jest.fn();
      monitor.on('alert.stale', staleHandler);
      monitor.on('alert.critical', criticalHandler);

      store.createDelegation('high task', '@dev', 'ctx', 'high');
      await new Promise(r => setTimeout(r, 80));

      await monitor.checkNow();

      // High priority stale should emit both alert.stale and alert.critical
      expect(staleHandler).toHaveBeenCalledTimes(1);
      expect(criticalHandler).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // 11. _formatDuration()
  // ===========================================================================

  describe('_formatDuration()', () => {
    let monitor;

    beforeEach(() => {
      monitor = new JarvisMonitor({ delegationStore: store });
    });

    test('should format minutes only', () => {
      expect(monitor._formatDuration(5 * 60000)).toBe('5m');
    });

    test('should format hours only', () => {
      expect(monitor._formatDuration(2 * 60 * 60000)).toBe('2h');
    });

    test('should format hours and minutes', () => {
      expect(monitor._formatDuration(2 * 60 * 60000 + 30 * 60000)).toBe('2h 30m');
    });

    test('should format zero minutes', () => {
      expect(monitor._formatDuration(0)).toBe('0m');
    });

    test('should format sub-minute as 0m', () => {
      expect(monitor._formatDuration(30000)).toBe('0m');
    });
  });

  // ===========================================================================
  // 12. Integration: multiple delegations with mixed states
  // ===========================================================================

  describe('integration: mixed delegation states', () => {
    test('should handle multiple delegations with different priorities and states', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 200,
        // critical => 50ms, high => 100ms, medium => 200ms, low => 400ms
      });

      // Fresh low-priority (should be healthy at check time)
      store.createDelegation('low task', '@dev', 'ctx', 'low');

      // Escalated
      const escId = store.createDelegation('esc task', '@architect', 'ctx', 'medium');
      await store.updateStatus(escId, 'escalated', { reason: 'blocked' });

      // Completed (should be excluded)
      const doneId = store.createDelegation('done task', '@qa', 'ctx', 'high');
      await store.updateStatus(doneId, 'completed', { outcome: 'passed' });

      // Critical priority (will become stale quickly)
      store.createDelegation('critical task', '@dev', 'ctx', 'critical');

      // Wait for critical to become stale (> 50ms)
      await new Promise(r => setTimeout(r, 80));

      const alerts = await monitor.checkNow();

      // Should have at least: escalated + critical-stale
      expect(alerts.length).toBeGreaterThanOrEqual(2);

      const escAlerts = alerts.filter(a => a.message.includes('escalated'));
      const critStaleAlerts = alerts.filter(a => a.task === 'critical task');

      expect(escAlerts.length).toBe(1);
      expect(critStaleAlerts.length).toBe(1);
    });

    test('should accumulate alerts across multiple checkNow calls', async () => {
      const monitor = new JarvisMonitor({
        delegationStore: store,
        staleThresholdMs: 50,
        maxAlertsPerDelegation: 10,
      });

      store.createDelegation('task1', '@dev', 'ctx', 'medium');
      await new Promise(r => setTimeout(r, 100));

      await monitor.checkNow();
      await monitor.checkNow();

      const history = monitor.getAlertHistory();
      expect(history.length).toBe(2);
    });
  });

  // ===========================================================================
  // 13. Exports
  // ===========================================================================

  describe('exports', () => {
    test('should export all expected symbols', () => {
      expect(JarvisMonitor).toBeDefined();
      expect(PRIORITY_MULTIPLIERS).toBeDefined();
      expect(AlertSeverity).toBeDefined();
    });

    test('JarvisMonitor should be a class (constructor function)', () => {
      expect(typeof JarvisMonitor).toBe('function');
      expect(JarvisMonitor.prototype).toBeDefined();
    });
  });
});
