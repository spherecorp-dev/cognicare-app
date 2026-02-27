#!/usr/bin/env node
/**
 * Test: Create a campaign with 1 image creative on B2G3 account
 */

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
  console.log('  Image Campaign Test — B2G3 (act_180777711311492)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const builder = new CampaignBuilder(PROJECT_ROOT);

  const result = await builder.createFromOffer({
    offerId: 'MEMFR02',
    campaignConfigId: 'cbo-tdc-ww-fr',
    creativeIds: ['STE-IMG-MEMFR02-01H00'],
    batchId: '2026-02-23-batch',
  });

  console.log('Result:', JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error('FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
