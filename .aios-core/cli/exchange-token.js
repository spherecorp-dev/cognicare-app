#!/usr/bin/env node
/**
 * Exchange Meta access token for a long-lived token (60 days)
 *
 * Usage: node .aios-core/cli/exchange-token.js
 *
 * Reads current token from dashboard/.env.local,
 * exchanges it via Meta API, and updates the file.
 */

const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '../../dashboard/.env.local');

function loadEnv() {
  const content = fs.readFileSync(ENV_PATH, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    env[key] = value;
  }
  return env;
}

function updateEnvToken(newToken) {
  let content = fs.readFileSync(ENV_PATH, 'utf-8');
  content = content.replace(
    /^META_ADS_ACCESS_TOKEN=.*/m,
    `META_ADS_ACCESS_TOKEN=${newToken}`
  );
  fs.writeFileSync(ENV_PATH, content);
}

async function main() {
  console.log('=== Meta Token Exchange (60 days) ===\n');

  const env = loadEnv();
  for (const [k, v] of Object.entries(env)) {
    process.env[k] = v;
  }

  const { MetaAdsService } = require('../core/services/meta-ads-service');

  const service = new MetaAdsService({
    accessToken: env.META_ADS_ACCESS_TOKEN,
    appId: env.META_ADS_APP_ID,
    appSecret: env.META_ADS_APP_SECRET,
  });

  console.log(`App ID: ${env.META_ADS_APP_ID}`);
  console.log(`Current token: ${env.META_ADS_ACCESS_TOKEN?.slice(0, 20)}...`);
  console.log('\nExchanging token...');

  const result = await service.exchangeToken();

  console.log(`\n✓ New token received!`);
  console.log(`  Token: ${result.access_token.slice(0, 20)}...`);
  console.log(`  Expires in: ${result.expires_in_days} days (${result.expires_in} seconds)`);

  // Check if token actually changed
  if (result.access_token === env.META_ADS_ACCESS_TOKEN) {
    console.log('\n⚠ Token is the same — it may already be long-lived.');
    return;
  }

  updateEnvToken(result.access_token);
  console.log(`\n✓ Updated dashboard/.env.local with new token.`);
}

main().catch(err => {
  console.error('\n✗ Error:', err.message);
  process.exit(1);
});
