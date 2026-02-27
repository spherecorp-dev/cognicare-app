#!/usr/bin/env node
/**
 * Test: CampaignBuilder.createFromOffer()
 * Creates a REAL campaign (PAUSED) on Meta Ads using the CampaignBuilder module.
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
  console.log('  CampaignBuilder.createFromOffer() — Test');
  console.log('═══════════════════════════════════════════════════════════\n');

  const builder = new CampaignBuilder(PROJECT_ROOT);

  const params = {
    offerId: 'MEMFR02',
    campaignConfigId: 'cbo-tdc-ww-fr',
    // Use only 2 creatives to save API calls
    creativeIds: ['STE-IMG-MEMFR02-01H00', 'STE-IMG-MEMFR02-03H00'],
  };

  console.log('Params:', JSON.stringify(params, null, 2));
  console.log('');

  try {
    const result = await builder.createFromOffer(params);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  RESULT');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Campaign ID: ${result.campaignId}`);
    console.log(`Campaign Name: ${result.campaignName}`);
    console.log(`Ad Set ID: ${result.adSetId}`);
    console.log(`Ads Created: ${result.summary.created}/${result.summary.total}`);
    console.log(`Failed: ${result.summary.failed}`);
    console.log('Status: ALL PAUSED');
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\nFAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
