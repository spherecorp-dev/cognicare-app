#!/usr/bin/env node
/**
 * Debug Meta access token — check validity, type, and expiry
 */
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '../../dashboard/.env.local');
const content = fs.readFileSync(ENV_PATH, 'utf-8');
const env = {};
for (const line of content.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
}
for (const [k, v] of Object.entries(env)) process.env[k] = v;

async function main() {
  const token = env.META_ADS_ACCESS_TOKEN;
  const appToken = env.META_ADS_APP_ID + '|' + env.META_ADS_APP_SECRET;

  console.log('=== Token Debug ===\n');
  console.log('Token:', token.slice(0, 25) + '...');
  console.log('Length:', token.length);

  // Debug token
  const debugUrl = `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${appToken}`;
  const debugRes = await fetch(debugUrl);
  const debugData = await debugRes.json();
  console.log('\nDebug info:');
  console.log(JSON.stringify(debugData, null, 2));

  // Try listing accounts
  const { MetaAdsService } = require('../core/services/meta-ads-service');
  const svc = new MetaAdsService();
  try {
    const accounts = await svc.listAccounts();
    console.log('\nlistAccounts OK —', accounts.length, 'accounts');
    accounts.forEach(a => console.log(`  - ${a.name} (${a.account_id})`));
  } catch (e) {
    console.error('\nlistAccounts FAILED:', e.message);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
