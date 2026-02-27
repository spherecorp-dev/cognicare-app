#!/usr/bin/env node
/**
 * Test: CampaignBuilder.addToExistingCampaign()
 * Adds creatives to a REAL existing campaign, distributed across multiple ad sets.
 */

// Load env manually (dotenv not available in .aios-core)
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

const { CampaignBuilder } = require('../core/services/campaign-builder');

const PROJECT_ROOT = process.env.AIOS_PROJECT_ROOT || '/Users/balbuena/B2G Capital';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  CampaignBuilder.addToExistingCampaign() — Test');
  console.log('═══════════════════════════════════════════════════════════\n');

  const builder = new CampaignBuilder(PROJECT_ROOT);

  // 1. Resolve most recent campaign from history
  console.log('1. Resolving most recent campaign from history...');
  const historyEntry = await builder.resolveCampaignFromHistory('MEMFR02', 0);
  console.log(`   Found: "${historyEntry.name}" (ID: ${historyEntry.campaign_id})`);
  console.log(`   Created: ${historyEntry.created_at}, Ads: ${historyEntry.ads_count}\n`);

  // 2. Add 2 creatives in 2 ad sets to the existing campaign
  const params = {
    offerId: 'MEMFR02',
    campaignConfigId: 'cbo-tdc-ww-fr',
    campaignId: historyEntry.campaign_id,
    campaignName: historyEntry.name,
    adSetsCount: 2,
    creativeIds: ['STE-IMG-MEMFR02-01H00', 'STE-IMG-MEMFR02-03H00'],
  };

  console.log('2. Adding creatives to existing campaign...');
  console.log('   Params:', JSON.stringify(params, null, 2));
  console.log('');

  try {
    const result = await builder.addToExistingCampaign(params);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  RESULT');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Campaign ID: ${result.campaignId}`);
    console.log(`Campaign Name: ${result.campaignName}`);
    console.log(`Ad Sets Created: ${result.summary.adSetsCreated}/${result.summary.adSetsRequested}`);
    console.log(`Total Ads: ${result.summary.totalAdsCreated}/${result.summary.totalCreatives}`);
    console.log(`Failed: ${result.summary.totalAdsFailed}`);
    for (const adSet of result.adSets) {
      console.log(`  - ${adSet.adSetName}: ${adSet.summary?.created || 0} ads (${adSet.adSetId || 'FAILED'})`);
    }
    console.log('Status: ALL PAUSED');
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\nFAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
