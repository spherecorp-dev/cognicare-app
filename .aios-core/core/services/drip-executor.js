/**
 * Drip Executor — "Criar com Calma"
 *
 * Orchestrates gradual upload of creatives to Meta Ads over time.
 * Each batch = 1 ad set with N creatives, spaced by configurable interval.
 *
 * State persisted at .aios/drip-jobs/{jobId}/state.yaml
 * Notion integration: task "Campanha em Background" + @mention per batch.
 *
 * @module core/services/drip-executor
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { CampaignBuilder } = require('./campaign-builder');
const { NotionService } = require('./notion-service');
const { resolveProjectRoot } = require('../utils/resolve-project-root');

// Fernando Balbuena Notion User ID (for @mentions)
const NOTIFY_USER_ID = '2a9d872b-594c-8104-93ed-00020f191659';

class DripExecutor {
  constructor(projectRoot) {
    this.projectRoot = projectRoot || resolveProjectRoot();
    this.jobsDir = path.join(this.projectRoot, '.aios', 'drip-jobs');
    this.builder = new CampaignBuilder(this.projectRoot);
    this.notion = new NotionService();
    this._timers = new Map(); // jobId -> setTimeout handle
    this._recoveryDone = false;
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          PUBLIC API
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Start a drip upload job.
   *
   * @param {Object} config
   * @param {string} config.offerId
   * @param {string} config.campaignConfigId
   * @param {string} config.campaignId - Existing Meta campaign ID
   * @param {string} config.campaignName - For ad set naming
   * @param {number} [config.creativesPerBatch=5]
   * @param {number} [config.intervalMinutes=60]
   * @param {string[]} [config.creativeIds] - Filter specific IDs
   * @param {string} [config.batchId] - Override batch directory
   * @param {number} [config.bidAmount] - Override bid cap (cents)
   * @returns {Promise<Object>} { jobId, status, notionTaskId, totalBatches, schedule }
   */
  async start(config) {
    const { offerId, campaignConfigId, campaignId, campaignName } = config;
    const creativesPerBatch = config.creativesPerBatch || 5;
    const intervalMinutes = config.intervalMinutes || 60;

    // 1. Load all creative IDs upfront
    const { offerConfig } = await this.builder.loadConfig(offerId, campaignConfigId);
    const offerDir = path.join(this.projectRoot, 'data/offers', offerId);
    const allCreatives = await this.builder.loadCreatives(offerDir, offerConfig.creatives, {
      creativeIds: config.creativeIds,
      batchId: config.batchId,
      adCopy: config.adCopy,
    });

    if (!allCreatives.length) throw new Error('No creatives found to upload.');

    const totalBatches = Math.ceil(allCreatives.length / creativesPerBatch);
    const creativeIds = allCreatives.map(c => c.id);

    // 2. Determine starting ad set index
    const resolvedAccountId = config.accountId || offerConfig.account_id;
    const { MetaAdsService } = require('./meta-ads-service');
    const meta = new MetaAdsService({ accountId: resolvedAccountId });
    let startIndex;
    try {
      const existing = await meta.listAdSets(campaignId);
      startIndex = existing.length + 1;
    } catch { startIndex = 1; }

    // 3. Generate job ID
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const jobId = `drip-${offerId}-${ts}`;

    // 4. Create Notion task
    let notionTaskId = null;
    try {
      const task = await this.notion.createTask({
        title: `Campanha em Background`,
        description: `Upload gradual: ${allCreatives.length} criativos em ${totalBatches} batches de ${creativesPerBatch}, intervalo ${intervalMinutes}min. Campanha: ${campaignName}`,
        priority: 'High',
        type: 'Campaign',
        squad: 'media-squad',
        source: 'jarvis-chat',
        tags: ['drip-upload', offerId],
        offerId,
      });
      notionTaskId = task.id;

      // Add subtasks for each batch
      const subtasks = [];
      for (let i = 0; i < totalBatches; i++) {
        const batchIds = creativeIds.slice(i * creativesPerBatch, (i + 1) * creativesPerBatch);
        subtasks.push({
          text: `Batch ${i + 1}/${totalBatches}: ${batchIds.length} criativos`,
          checked: false,
        });
      }
      if (subtasks.length) {
        await this.notion.addSubtasks(notionTaskId, subtasks);
      }
    } catch (err) {
      console.warn(`[DripExecutor] Notion task creation failed: ${err.message}`);
    }

    // 5. Create state file
    const state = {
      job_id: jobId,
      status: 'running',
      offer_id: offerId,
      campaign_id: campaignId,
      campaign_name: campaignName,
      campaign_config_id: campaignConfigId,
      schedule: {
        creatives_per_batch: creativesPerBatch,
        interval_minutes: intervalMinutes,
        total_creatives: allCreatives.length,
        total_batches: totalBatches,
      },
      progress: {
        batches_completed: 0,
        creatives_uploaded: 0,
        creatives_failed: 0,
        ad_sets_created: [],
        next_ad_set_index: startIndex,
        next_batch_at: null,
      },
      notion_task_id: notionTaskId,
      creative_ids: creativeIds,
      bid_amount: config.bidAmount || null,
      batch_id: config.batchId || null,
      account_id: config.accountId || null,
      ad_copy: config.adCopy || null,
      batches: [],
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
      error: null,
    };

    await this._saveState(jobId, state);

    // 6. Execute first batch immediately
    await this._executeBatch(jobId);

    // 7. Schedule next batch if more than 1
    const updated = await this._loadState(jobId);
    if (updated.status === 'running' && updated.progress.batches_completed < totalBatches) {
      this._scheduleNext(jobId, intervalMinutes);
      updated.progress.next_batch_at = new Date(
        Date.now() + intervalMinutes * 60 * 1000
      ).toISOString();
      await this._saveState(jobId, updated);
    }

    return {
      jobId,
      status: updated.status,
      notionTaskId,
      totalBatches,
      schedule: { creativesPerBatch, intervalMinutes, totalCreatives: allCreatives.length },
    };
  }

  /**
   * Pause a running drip job.
   */
  async pause(jobId) {
    const state = await this._loadState(jobId);
    if (state.status !== 'running') {
      throw new Error(`Job ${jobId} is ${state.status}, cannot pause`);
    }

    const timer = this._timers.get(jobId);
    if (timer) { clearTimeout(timer); this._timers.delete(jobId); }

    state.status = 'paused';
    state.progress.next_batch_at = null;
    state.updated_at = new Date().toISOString();
    await this._saveState(jobId, state);

    await this._notifyMention(state,
      `Drip PAUSADO em batch ${state.progress.batches_completed}/${state.schedule.total_batches}. ` +
      `${state.progress.creatives_uploaded} criativos enviados até agora.`
    );

    return { jobId, status: 'paused', progress: state.progress };
  }

  /**
   * Resume a paused drip job.
   */
  async resume(jobId) {
    const state = await this._loadState(jobId);
    if (state.status !== 'paused') {
      throw new Error(`Job ${jobId} is ${state.status}, cannot resume`);
    }

    state.status = 'running';
    state.updated_at = new Date().toISOString();
    await this._saveState(jobId, state);

    await this._notifyMention(state,
      `Drip RETOMADO. Continuando do batch ${state.progress.batches_completed + 1}/${state.schedule.total_batches}.`
    );

    // Execute next batch immediately
    await this._executeBatch(jobId);

    // Schedule next if still running
    const updated = await this._loadState(jobId);
    if (updated.status === 'running' && updated.progress.batches_completed < updated.schedule.total_batches) {
      this._scheduleNext(jobId, updated.schedule.interval_minutes);
      updated.progress.next_batch_at = new Date(
        Date.now() + updated.schedule.interval_minutes * 60 * 1000
      ).toISOString();
      await this._saveState(jobId, updated);
    }

    return { jobId, status: updated.status, progress: updated.progress };
  }

  /**
   * Cancel a drip job.
   */
  async cancel(jobId) {
    const state = await this._loadState(jobId);

    const timer = this._timers.get(jobId);
    if (timer) { clearTimeout(timer); this._timers.delete(jobId); }

    state.status = 'cancelled';
    state.completed_at = new Date().toISOString();
    state.updated_at = new Date().toISOString();
    state.progress.next_batch_at = null;
    await this._saveState(jobId, state);

    await this._notifyMention(state,
      `Drip CANCELADO. ${state.progress.creatives_uploaded}/${state.schedule.total_creatives} criativos enviados. ` +
      `${state.progress.ad_sets_created.length} ad sets criados.`
    );

    return { jobId, status: 'cancelled', progress: state.progress };
  }

  /**
   * Get status of a drip job.
   */
  async getStatus(jobId) {
    return await this._loadState(jobId);
  }

  /**
   * List all drip jobs, optionally filtered by status.
   */
  async listJobs(filter) {
    try {
      await fs.mkdir(this.jobsDir, { recursive: true });
      const dirs = await fs.readdir(this.jobsDir);
      const jobs = [];

      for (const dir of dirs) {
        try {
          const state = await this._loadState(dir);
          if (filter && state.status !== filter) continue;
          jobs.push({
            job_id: state.job_id,
            status: state.status,
            offer_id: state.offer_id,
            campaign_name: state.campaign_name,
            progress: state.progress,
            schedule: state.schedule,
            started_at: state.started_at,
            completed_at: state.completed_at,
          });
        } catch { /* skip invalid */ }
      }

      return jobs.sort((a, b) => (b.started_at || '').localeCompare(a.started_at || ''));
    } catch {
      return [];
    }
  }

  /**
   * Lazy recovery: find and resume overdue drip jobs after server restart.
   */
  async recoverPending() {
    if (this._recoveryDone) return [];
    this._recoveryDone = true;

    const recovered = [];
    try {
      const dirs = await fs.readdir(this.jobsDir);
      for (const dir of dirs) {
        try {
          const state = await this._loadState(dir);
          if (state.status !== 'running') continue;
          if (this._timers.has(dir)) continue;

          const nextAt = state.progress.next_batch_at
            ? new Date(state.progress.next_batch_at)
            : null;

          if (nextAt && nextAt <= new Date()) {
            // Overdue — execute immediately
            console.log(`[DripExecutor] Recovering overdue job ${dir}`);
            recovered.push(dir);
            setImmediate(() => this._executeBatch(dir).catch(err =>
              console.error(`[DripExecutor] Recovery batch failed for ${dir}:`, err.message)
            ));
          } else if (nextAt) {
            // Future — re-arm timer
            const delayMs = nextAt.getTime() - Date.now();
            console.log(`[DripExecutor] Re-arming timer for ${dir} (${Math.round(delayMs / 60000)}min)`);
            recovered.push(dir);
            this._scheduleNext(dir, delayMs / 60000);
          }
        } catch { /* skip */ }
      }
    } catch { /* dir doesn't exist yet */ }

    return recovered;
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          INTERNAL
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Execute one batch: create 1 ad set with N creatives.
   */
  async _executeBatch(jobId) {
    const state = await this._loadState(jobId);
    if (state.status !== 'running') return;

    const batchNum = state.progress.batches_completed + 1;
    const { creatives_per_batch, total_batches } = state.schedule;
    const startIdx = (batchNum - 1) * creatives_per_batch;
    const batchCreativeIds = state.creative_ids.slice(startIdx, startIdx + creatives_per_batch);

    if (!batchCreativeIds.length) {
      state.status = 'completed';
      state.completed_at = new Date().toISOString();
      state.progress.next_batch_at = null;
      await this._saveState(jobId, state);
      await this._notifyCompletion(state);
      return;
    }

    console.log(`[DripExecutor] ${jobId} — Batch ${batchNum}/${total_batches} starting (${batchCreativeIds.length} criativos)`);

    try {
      const result = await this.builder.addToExistingCampaign({
        offerId: state.offer_id,
        campaignConfigId: state.campaign_config_id,
        campaignId: state.campaign_id,
        campaignName: state.campaign_name,
        adSetsCount: 1,
        startIndex: state.progress.next_ad_set_index,
        bidAmount: state.bid_amount,
        creativeIds: batchCreativeIds,
        batchId: state.batch_id,
        accountId: state.account_id,
        adCopy: state.ad_copy,
      });

      const adSetResult = result.adSets?.[0];
      const batchRecord = {
        num: batchNum,
        ad_set_id: adSetResult?.adSetId || null,
        ad_set_name: adSetResult?.adSetName || null,
        creatives: batchCreativeIds,
        created: adSetResult?.summary?.created || 0,
        failed: adSetResult?.summary?.failed || 0,
        completed_at: new Date().toISOString(),
      };

      state.batches.push(batchRecord);
      state.progress.batches_completed = batchNum;
      state.progress.creatives_uploaded += batchRecord.created;
      state.progress.creatives_failed += batchRecord.failed;
      if (adSetResult?.adSetId) {
        state.progress.ad_sets_created.push(adSetResult.adSetId);
      }
      state.progress.next_ad_set_index += 1;
      state.updated_at = new Date().toISOString();
      state.error = null;

      if (batchNum >= total_batches) {
        state.status = 'completed';
        state.completed_at = new Date().toISOString();
        state.progress.next_batch_at = null;
      }

      await this._saveState(jobId, state);

      // Notify Notion
      const creativeNames = batchCreativeIds.join(', ');
      await this._notifyMention(state,
        `Batch ${batchNum}/${total_batches} concluído: ${batchRecord.created} ads criados` +
        (batchRecord.failed ? `, ${batchRecord.failed} falharam` : '') +
        `. Ad Set: ${batchRecord.ad_set_name || 'N/A'}. Criativos: ${creativeNames}`
      );

      // Mark Notion subtask
      await this._markSubtask(state, batchNum - 1);

      if (state.status === 'completed') {
        await this._notifyCompletion(state);
      } else {
        // Schedule next
        this._scheduleNext(jobId, state.schedule.interval_minutes);
        state.progress.next_batch_at = new Date(
          Date.now() + state.schedule.interval_minutes * 60 * 1000
        ).toISOString();
        await this._saveState(jobId, state);
      }

    } catch (error) {
      const batchRecord = {
        num: batchNum,
        ad_set_id: null,
        creatives: batchCreativeIds,
        created: 0,
        failed: batchCreativeIds.length,
        completed_at: new Date().toISOString(),
        error: error.message,
      };

      state.batches.push(batchRecord);
      state.progress.batches_completed = batchNum;
      state.progress.creatives_failed += batchCreativeIds.length;
      state.progress.next_ad_set_index += 1;
      state.updated_at = new Date().toISOString();
      state.error = `Batch ${batchNum} failed: ${error.message}`;

      // Auto-pause after 2 consecutive failures
      const lastTwo = state.batches.slice(-2);
      if (lastTwo.length === 2 && lastTwo.every(b => b.error)) {
        state.status = 'paused';
        state.progress.next_batch_at = null;
        console.error(`[DripExecutor] ${jobId} auto-paused after 2 consecutive failures`);
      } else if (batchNum >= total_batches) {
        state.status = 'completed';
        state.completed_at = new Date().toISOString();
        state.progress.next_batch_at = null;
      } else {
        this._scheduleNext(jobId, state.schedule.interval_minutes);
        state.progress.next_batch_at = new Date(
          Date.now() + state.schedule.interval_minutes * 60 * 1000
        ).toISOString();
      }

      await this._saveState(jobId, state);

      await this._notifyMention(state,
        `Batch ${batchNum} FALHOU: ${error.message}` +
        (state.status === 'paused' ? ' — Drip PAUSADO automaticamente (2 falhas consecutivas).' : '')
      );
    }
  }

  _scheduleNext(jobId, intervalMinutes) {
    const existing = this._timers.get(jobId);
    if (existing) clearTimeout(existing);

    const delayMs = Math.max(intervalMinutes * 60 * 1000, 10000); // min 10s
    const timer = setTimeout(() => {
      this._timers.delete(jobId);
      this._executeBatch(jobId).catch(err => {
        console.error(`[DripExecutor] Unhandled batch error for ${jobId}:`, err.message);
      });
    }, delayMs);

    if (timer.unref) timer.unref();
    this._timers.set(jobId, timer);
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          STATE PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════

  async _saveState(jobId, state) {
    const dir = path.join(this.jobsDir, jobId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, 'state.yaml'),
      yaml.dump(state, { lineWidth: -1 }),
      'utf-8'
    );
  }

  async _loadState(jobId) {
    const content = await fs.readFile(
      path.join(this.jobsDir, jobId, 'state.yaml'),
      'utf-8'
    );
    return yaml.load(content);
  }

  // ═══════════════════════════════════════════════════════════════════
  //                          NOTION NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════

  async _notifyMention(state, text) {
    if (!state.notion_task_id) return;
    try {
      await this.notion.addCommentWithMention(
        state.notion_task_id,
        NOTIFY_USER_ID,
        text
      );
    } catch (err) {
      console.warn(`[DripExecutor] Notion comment failed: ${err.message}`);
    }
  }

  async _notifyCompletion(state) {
    const text =
      `Drip FINALIZADO! ${state.progress.creatives_uploaded}/${state.schedule.total_creatives} criativos enviados. ` +
      (state.progress.creatives_failed ? `${state.progress.creatives_failed} falharam. ` : '') +
      `${state.progress.ad_sets_created.length} ad sets criados. Tudo PAUSED.`;

    await this._notifyMention(state, text);

    if (state.notion_task_id) {
      try {
        await this.notion.updateTask(state.notion_task_id, { status: 'Done' });
      } catch (err) {
        console.warn(`[DripExecutor] Notion status update failed: ${err.message}`);
      }
    }
  }

  async _markSubtask(state, index) {
    if (!state.notion_task_id) return;
    try {
      const subtasks = await this.notion.getSubtasks(state.notion_task_id);
      if (subtasks[index]) {
        await this.notion.updateSubtask(subtasks[index].id, true);
      }
    } catch (err) {
      console.warn(`[DripExecutor] Notion subtask update failed: ${err.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              SINGLETON & EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

let _instance = null;

function getDripExecutor(projectRoot) {
  if (!_instance) {
    _instance = new DripExecutor(projectRoot);
  }
  return _instance;
}

module.exports = { DripExecutor, getDripExecutor };
