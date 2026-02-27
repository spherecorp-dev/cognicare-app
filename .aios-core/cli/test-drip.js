#!/usr/bin/env node
/**
 * Test: DripExecutor — "Criar com Calma"
 *
 * Drip 2 creatives, 1 per batch, 1 minute interval.
 * Should create 2 ad sets PAUSED with ~1 min delay between them.
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

const PROJECT_ROOT = process.env.AIOS_PROJECT_ROOT || '/Users/balbuena/B2G Capital';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  DripExecutor — Test (2 criativos, 1/batch, 1min interval)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Resolve campaign from history
  const builder = new CampaignBuilder(PROJECT_ROOT);
  const historyEntry = await builder.resolveCampaignFromHistory('MEMFR02', 0);
  console.log(`Campaign: "${historyEntry.name}" (${historyEntry.campaign_id})\n`);

  // 2. Start drip
  const drip = new DripExecutor(PROJECT_ROOT);

  console.log('Starting drip...\n');
  const result = await drip.start({
    offerId: 'MEMFR02',
    campaignConfigId: 'cbo-tdc-ww-fr',
    campaignId: historyEntry.campaign_id,
    campaignName: historyEntry.name,
    creativesPerBatch: 1,
    intervalMinutes: 1, // 1 minute for testing
    creativeIds: ['STE-IMG-MEMFR02-01H00', 'STE-IMG-MEMFR02-03H00'],
  });

  console.log('Drip started:');
  console.log(`  Job ID: ${result.jobId}`);
  console.log(`  Notion Task: ${result.notionTaskId}`);
  console.log(`  Total Batches: ${result.totalBatches}`);
  console.log(`  Schedule: ${result.schedule.creativesPerBatch}/batch, ${result.schedule.intervalMinutes}min interval`);
  console.log(`  Status: ${result.status}`);

  // Batch 1 already executed. Now wait for batch 2.
  console.log('\n--- Batch 1 done. Waiting ~1 min for batch 2... ---\n');

  // Poll status every 15 seconds
  const pollInterval = setInterval(async () => {
    try {
      const status = await drip.getStatus(result.jobId);
      const { batches_completed, creatives_uploaded, next_batch_at } = status.progress;
      console.log(
        `[${new Date().toLocaleTimeString()}] Status: ${status.status} | ` +
        `Batches: ${batches_completed}/${status.schedule.total_batches} | ` +
        `Creatives: ${creatives_uploaded}/${status.schedule.total_creatives} | ` +
        `Next: ${next_batch_at || 'none'}`
      );

      if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
        clearInterval(pollInterval);
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('  FINAL STATUS');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`  Status: ${status.status}`);
        console.log(`  Batches: ${status.progress.batches_completed}/${status.schedule.total_batches}`);
        console.log(`  Creatives uploaded: ${status.progress.creatives_uploaded}`);
        console.log(`  Ad Sets: ${status.progress.ad_sets_created.join(', ')}`);
        console.log(`  Notion Task: ${status.notion_task_id}`);
        if (status.error) console.log(`  Error: ${status.error}`);
        console.log('═══════════════════════════════════════════════════════════\n');
        process.exit(0);
      }
    } catch (err) {
      console.error('Poll error:', err.message);
    }
  }, 15000);

  // Safety timeout: 5 minutes
  setTimeout(() => {
    console.error('\nTimeout: test took too long (5 min). Something may be wrong.');
    clearInterval(pollInterval);
    process.exit(1);
  }, 5 * 60 * 1000);
}

main().catch(err => {
  console.error('\nFATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
