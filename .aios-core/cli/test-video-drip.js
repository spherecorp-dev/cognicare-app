#!/usr/bin/env node
/**
 * Test: Video Drip Upload
 *
 * 1. Creates a new campaign (PAUSED)
 * 2. Drips 2 VIDEO creatives, 1 per batch, 1 minute interval
 *
 * Uses the 2 smallest videos: ZA-LS-MEMFR03-37H00.mp4 (59MB) and ZA-LS-MEMFR03-38H00.mp4 (62MB)
 */

// Load env
const envPath = require('path').join(__dirname, '../../dashboard/.env.local');
const envContent = require('fs').readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (!process.env[key]) process.env[key] = val;
}

const { DripExecutor } = require('../core/services/drip-executor');
const { CampaignBuilder } = require('../core/services/campaign-builder');
const { MetaAdsService } = require('../core/services/meta-ads-service');

const PROJECT_ROOT = process.env.AIOS_PROJECT_ROOT || '/Users/balbuena/B2G Capital';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  VIDEO Drip Test (2 vídeos, 1/batch, 1min interval)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Load config and create a fresh campaign
  const builder = new CampaignBuilder(PROJECT_ROOT);
  const { offerConfig, campaignEntry, profile } = await builder.loadConfig('MEMFR02', 'cbo-tdc-ww-fr');

  const meta = new MetaAdsService({
    accountId: offerConfig.account_id,
    pageId: offerConfig.page_id,
  });

  const campaignName = 'CBO - TDC - MEMFR02 - AI - VIDEO TEST - 24.02';

  console.log('Creating new campaign (PAUSED)...');
  const campaign = await meta.createCampaign({
    name: campaignName,
    objective: profile.campaign?.objective || 'OUTCOME_SALES',
    status: 'PAUSED',
    dailyBudget: campaignEntry.daily_budget,
    bidStrategy: profile.campaign?.bid_strategy || 'LOWEST_COST_WITH_BID_CAP',
  });
  console.log(`  Campaign: ${campaign.id} — "${campaignName}"\n`);

  // 2. Verify video files exist
  const fs = require('fs').promises;
  const path = require('path');
  const batchDir = path.join(PROJECT_ROOT, 'data/offers/MEMFR02/assets/criativos/batches/CRIATIVOS EM VIDEO');
  const videoIds = ['ZA-LS-MEMFR03-37H00', 'ZA-LS-MEMFR03-38H00'];

  for (const id of videoIds) {
    const filePath = path.join(batchDir, `${id}.mp4`);
    const stat = await fs.stat(filePath);
    console.log(`  ${id}.mp4 — ${(stat.size / 1024 / 1024).toFixed(1)} MB`);
  }
  console.log('');

  // 3. Start drip on the fresh campaign
  const drip = new DripExecutor(PROJECT_ROOT);

  console.log('Starting video drip...\n');
  const result = await drip.start({
    offerId: 'MEMFR02',
    campaignConfigId: 'cbo-tdc-ww-fr',
    campaignId: campaign.id,
    campaignName,
    creativesPerBatch: 1,
    intervalMinutes: 1,
    creativeIds: videoIds,
    batchId: 'CRIATIVOS EM VIDEO',
  });

  console.log('Drip started:');
  console.log(`  Job ID: ${result.jobId}`);
  console.log(`  Notion Task: ${result.notionTaskId}`);
  console.log(`  Total Batches: ${result.totalBatches}`);
  console.log(`  Schedule: ${result.schedule.creativesPerBatch}/batch, ${result.schedule.intervalMinutes}min interval`);
  console.log(`  Status: ${result.status}`);

  if (result.status === 'completed') {
    console.log('\n  Both batches completed already.');
    const status = await drip.getStatus(result.jobId);
    printFinal(status);
    process.exit(0);
  }

  console.log('\n--- Batch 1 done. Waiting ~1 min for batch 2... ---\n');

  // Poll status every 15 seconds
  const pollInterval = setInterval(async () => {
    try {
      const status = await drip.getStatus(result.jobId);
      const { batches_completed, creatives_uploaded, creatives_failed, next_batch_at } = status.progress;
      console.log(
        `[${new Date().toLocaleTimeString()}] Status: ${status.status} | ` +
        `Batches: ${batches_completed}/${status.schedule.total_batches} | ` +
        `OK: ${creatives_uploaded} Failed: ${creatives_failed} | ` +
        `Next: ${next_batch_at || 'none'}`
      );

      if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled' || status.status === 'paused') {
        clearInterval(pollInterval);
        printFinal(status);
        process.exit(status.status === 'completed' ? 0 : 1);
      }
    } catch (err) {
      console.error('Poll error:', err.message);
    }
  }, 15000);

  // Safety timeout: 10 minutes
  setTimeout(() => {
    console.error('\nTimeout: test took too long (10 min).');
    clearInterval(pollInterval);
    process.exit(1);
  }, 10 * 60 * 1000);
}

function printFinal(status) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  FINAL STATUS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Status: ${status.status}`);
  console.log(`  Batches: ${status.progress.batches_completed}/${status.schedule.total_batches}`);
  console.log(`  Creatives uploaded: ${status.progress.creatives_uploaded}`);
  console.log(`  Creatives failed: ${status.progress.creatives_failed}`);
  console.log(`  Ad Sets: ${status.progress.ad_sets_created.join(', ') || 'none'}`);
  console.log(`  Notion Task: ${status.notion_task_id}`);
  if (status.error) console.log(`  Error: ${status.error}`);
  if (status.batches?.length) {
    console.log('\n  Batch details:');
    for (const b of status.batches) {
      console.log(`    Batch ${b.num}: ${b.created} ok, ${b.failed} failed${b.error ? ` — ${b.error}` : ''} | AdSet: ${b.ad_set_id || 'N/A'}`);
    }
  }
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\nFATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
