/**
 * Jarvis Monitor
 *
 * Monitors active delegations and alerts the CEO proactively when
 * delegations are stale or problematic. Reads from JarvisDelegationStore
 * and emits events for stale, escalated, or critical-priority delegations.
 *
 * @module core/orchestration/jarvis-monitor
 */

const EventEmitter = require('events');
const { JarvisDelegationStore } = require('./jarvis-delegation-store');

// ═══════════════════════════════════════════════════════════════════════════════════
//                              CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════════

/** Priority-adjusted multipliers for stale threshold (lower = stale faster) */
const PRIORITY_MULTIPLIERS = {
  critical: 0.25, // 4x faster (30 min with 2h default)
  high: 0.5,      // 2x faster (1h with 2h default)
  medium: 1.0,    // Default threshold
  low: 2.0,       // 2x more lenient (4h with 2h default)
};

/** Alert severity levels */
const AlertSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
};

// ═══════════════════════════════════════════════════════════════════════════════════
//                              JARVIS MONITOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Monitors active delegations and emits alerts for stale or problematic ones
 */
class JarvisMonitor extends EventEmitter {
  /**
   * @param {Object} options - Configuration options
   * @param {JarvisDelegationStore} options.delegationStore - Required store instance
   * @param {number} [options.staleThresholdMs=7200000] - Base stale threshold (2h)
   * @param {number} [options.pollIntervalMs=300000] - Poll interval (5 min)
   * @param {number} [options.maxAlertsPerDelegation=3] - Max alerts per delegation
   */
  constructor(options = {}) {
    super();
    if (!options.delegationStore) {
      throw new Error('delegationStore is required');
    }
    this._store = options.delegationStore;
    this._staleThresholdMs = options.staleThresholdMs ?? 2 * 60 * 60 * 1000;
    this._pollIntervalMs = options.pollIntervalMs ?? 5 * 60 * 1000;
    this._maxAlertsPerDelegation = options.maxAlertsPerDelegation ?? 3;
    /** @type {Array<Object>} */
    this._alertHistory = [];
    /** @type {Map<string, number>} delegationId -> alert count */
    this._alertCounts = new Map();
    /** @type {NodeJS.Timeout|null} */
    this._interval = null;
    /** @type {boolean} */
    this._running = false;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Starts the polling loop
   * @returns {JarvisMonitor} this (for chaining)
   */
  start() {
    if (this._running) return this;
    this._running = true;
    this._interval = setInterval(() => this._checkDelegations(), this._pollIntervalMs);
    this.emit('monitor.started');
    return this;
  }

  /**
   * Stops the polling loop
   */
  stop() {
    if (!this._running) return;
    clearInterval(this._interval);
    this._interval = null;
    this._running = false;
    this.emit('monitor.stopped');
  }

  /**
   * Manual trigger for immediate check (does not wait for poll)
   * @returns {Promise<Array<Object>>} Array of alerts generated
   */
  async checkNow() {
    return this._checkDelegations();
  }

  /**
   * Summary of all active delegations with health status
   * @returns {Promise<Object>} Health report
   */
  async getHealthReport() {
    const active = await this._store.getActiveDelegations();
    const now = Date.now();
    let healthy = 0;
    let stale = 0;
    let escalated = 0;
    const alerts = [];
    const recommendations = [];

    for (const delegation of active) {
      const ev = this._evaluateDelegation(delegation, now);
      if (!ev) { healthy++; continue; }
      if (ev.status === 'stale') stale++;
      if (ev.status === 'escalated') escalated++;
      alerts.push(ev);
    }

    if (stale > 0) {
      recommendations.push(`${stale} delegation(s) are stale — consider following up or reassigning.`);
    }
    if (escalated > 0) {
      recommendations.push(`${escalated} delegation(s) escalated — require CEO attention.`);
    }
    if (healthy === active.length && active.length > 0) {
      recommendations.push('All delegations are running within expected thresholds.');
    }
    return { healthy, stale, escalated, total: active.length, alerts, recommendations };
  }

  /**
   * Returns all alerts generated so far
   * @returns {Array<Object>} Alert history entries
   */
  getAlertHistory() {
    return [...this._alertHistory];
  }

  // ---------------------------------------------------------------------------
  // Internal methods
  // ---------------------------------------------------------------------------

  /**
   * Check all active delegations and emit alerts
   * @returns {Promise<Array<Object>>} Alerts generated this cycle
   * @private
   */
  async _checkDelegations() {
    const active = await this._store.getActiveDelegations();
    const now = Date.now();
    const cycleAlerts = [];

    for (const delegation of active) {
      const ev = this._evaluateDelegation(delegation, now);
      if (!ev) continue;

      // Enforce max alerts per delegation
      const count = this._alertCounts.get(ev.delegationId) || 0;
      if (count >= this._maxAlertsPerDelegation) continue;

      const alert = {
        delegationId: ev.delegationId,
        agentName: delegation.delegatedTo || null,
        task: delegation.task || null,
        severity: ev.severity,
        message: ev.message,
        timestamp: new Date().toISOString(),
      };

      this._alertHistory.push(alert);
      this._alertCounts.set(ev.delegationId, count + 1);
      cycleAlerts.push(alert);

      // Emit specific alert events
      if (ev.status === 'stale') this.emit('alert.stale', alert);
      if (ev.status === 'escalated') this.emit('alert.escalated', alert);
      if (ev.severity === AlertSeverity.CRITICAL) this.emit('alert.critical', alert);
    }

    this.emit('monitor.check', { alerts: cycleAlerts, timestamp: new Date().toISOString() });
    return cycleAlerts;
  }

  /**
   * Evaluate a single delegation for staleness or problems
   * @param {Object} delegation - Delegation summary from store
   * @param {number} now - Current timestamp (Date.now()) for testability
   * @returns {Object|null} Evaluation result or null if healthy
   * @private
   */
  _evaluateDelegation(delegation, now) {
    const { delegationId, priority: rawPriority, status } = delegation;
    const priority = rawPriority || 'medium';

    // Escalated delegations always alert
    if (status === 'escalated') {
      return {
        delegationId,
        status: 'escalated',
        alert: true,
        severity: AlertSeverity.CRITICAL,
        message: `Delegation ${delegationId} (${delegation.task || 'unknown task'}) has been escalated and needs CEO attention.`,
      };
    }

    // Calculate age from createdAt
    const createdAt = delegation.createdAt ? new Date(delegation.createdAt).getTime() : null;
    if (!createdAt) return null;

    const ageMs = now - createdAt;
    const multiplier = PRIORITY_MULTIPLIERS[priority] ?? PRIORITY_MULTIPLIERS.medium;
    const threshold = this._staleThresholdMs * multiplier;
    const approachingAt = threshold * 0.75;

    if (ageMs >= threshold) {
      const severity = (priority === 'critical' || priority === 'high')
        ? AlertSeverity.CRITICAL
        : AlertSeverity.WARNING;
      return {
        delegationId,
        status: 'stale',
        alert: true,
        severity,
        message: `Delegation ${delegationId} to ${delegation.delegatedTo || 'unknown'} is stale (age: ${this._formatDuration(ageMs)}, threshold: ${this._formatDuration(threshold)}).`,
      };
    }

    if (ageMs >= approachingAt) {
      return {
        delegationId,
        status: 'approaching',
        alert: true,
        severity: AlertSeverity.INFO,
        message: `Delegation ${delegationId} to ${delegation.delegatedTo || 'unknown'} is approaching stale threshold (age: ${this._formatDuration(ageMs)}, threshold: ${this._formatDuration(threshold)}).`,
      };
    }

    return null;
  }

  /**
   * Format milliseconds into human-readable duration (e.g., "2h 15m")
   * @param {number} ms
   * @returns {string}
   * @private
   */
  _formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    if (hours > 0) return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
    return `${minutes}m`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════
//                              EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════════

module.exports = {
  JarvisMonitor,
  PRIORITY_MULTIPLIERS,
  AlertSeverity,
};
