/**
 * Jarvis Workflow: Monitor
 *
 * Sprint 4 C.5: High-priority workflow
 *
 * Continuous monitoring of active delegations and squad runs.
 * Uses JarvisMonitor for delegation health and provides
 * squad run status via state files.
 *
 * @module core/intelligence/jarvis-workflows/monitor
 */

const { JarvisMonitor } = require('../../orchestration/jarvis-monitor');
const { JarvisDelegationStore } = require('../../orchestration/jarvis-delegation-store');
const path = require('path');
const fs = require('fs').promises;

class MonitorWorkflow {
  /**
   * @param {Object} options
   * @param {string} [options.projectRoot] - Project root path
   * @param {JarvisMonitor} [options.monitor] - Existing monitor instance
   * @param {JarvisDelegationStore} [options.delegationStore] - Existing store
   * @param {number} [options.staleThresholdMs=7200000] - Stale threshold (2h)
   */
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();

    this.delegationStore = options.delegationStore || new JarvisDelegationStore(
      path.join(this.projectRoot, '.aios', 'jarvis', 'delegations'),
    );

    this.monitor = options.monitor || new JarvisMonitor({
      delegationStore: this.delegationStore,
      staleThresholdMs: options.staleThresholdMs || 2 * 60 * 60 * 1000,
    });
  }

  /**
   * Execute a monitoring check
   *
   * @returns {Promise<Object>} Health report with alerts
   */
  async execute() {
    // Run delegation health check
    const healthReport = await this.monitor.getHealthReport();

    // Check squad runs
    const runStatus = await this._checkRunStatus();

    // Combine alerts
    const alerts = [
      ...healthReport.alerts.map(a => ({
        source: 'delegation',
        ...a,
      })),
      ...runStatus.alerts.map(a => ({
        source: 'squad_run',
        ...a,
      })),
    ];

    return {
      success: true,
      checkedAt: new Date().toISOString(),

      delegations: {
        healthy: healthReport.healthy,
        stale: healthReport.stale,
        escalated: healthReport.escalated,
        total: healthReport.total,
      },

      runs: {
        active: runStatus.active,
        paused: runStatus.paused,
        completed: runStatus.completed,
        failed: runStatus.failed,
        total: runStatus.total,
      },

      alerts,
      recommendations: [
        ...healthReport.recommendations,
        ...runStatus.recommendations,
      ],
    };
  }

  /**
   * Start background monitoring (polling)
   */
  start() {
    this.monitor.start();
    return this;
  }

  /**
   * Stop background monitoring
   */
  stop() {
    this.monitor.stop();
  }

  /**
   * Check status of squad runs
   * @private
   */
  async _checkRunStatus() {
    const stateDir = path.join(this.projectRoot, '.aios-core', '.state');
    const result = {
      active: 0,
      paused: 0,
      completed: 0,
      failed: 0,
      total: 0,
      alerts: [],
      recommendations: [],
    };

    try {
      const files = await fs.readdir(stateDir);
      const stateFiles = files.filter(f => f.endsWith('.state.yaml'));
      result.total = stateFiles.length;

      for (const filename of stateFiles) {
        try {
          const content = await fs.readFile(path.join(stateDir, filename), 'utf8');
          const status = this._extractField(content, 'status') || 'unknown';
          const runId = this._extractField(content, 'runId') || filename.replace('.state.yaml', '');
          const squadId = this._extractField(content, 'squadId') || 'unknown';
          const startedAt = this._extractField(content, 'startedAt');

          switch (status) {
            case 'running':
              result.active++;
              // Check for long-running
              if (startedAt) {
                const age = Date.now() - new Date(startedAt).getTime();
                if (age > 30 * 60 * 1000) { // >30min
                  result.alerts.push({
                    severity: 'warning',
                    message: `Run ${runId} (${squadId}) running for ${Math.round(age / 60000)}min`,
                    runId,
                    squadId,
                  });
                }
              }
              break;
            case 'paused':
              result.paused++;
              result.alerts.push({
                severity: 'info',
                message: `Run ${runId} (${squadId}) is paused`,
                runId,
                squadId,
              });
              break;
            case 'completed':
              result.completed++;
              break;
            case 'failed':
              result.failed++;
              result.alerts.push({
                severity: 'warning',
                message: `Run ${runId} (${squadId}) failed`,
                runId,
                squadId,
              });
              break;
          }
        } catch {
          // Skip
        }
      }

      if (result.failed > 0) {
        result.recommendations.push(
          `${result.failed} squad run(s) falharam — revisar logs e considerar reexecução.`
        );
      }
      if (result.paused > 0) {
        result.recommendations.push(
          `${result.paused} squad run(s) pausados — retomar quando pronto.`
        );
      }
    } catch {
      // State dir doesn't exist
    }

    return result;
  }

  /**
   * Extract a YAML field value
   * @private
   */
  _extractField(content, field) {
    const regex = new RegExp(`^${field}:\\s*['"]?(.+?)['"]?\\s*$`, 'm');
    const match = content.match(regex);
    return match ? match[1].trim() : null;
  }
}

module.exports = { MonitorWorkflow };
