#!/usr/bin/env node
/**
 * Test Meta Ads API connection
 *
 * Lists available ad accounts and pages so user can select which to use.
 *
 * Usage: node .aios-core/cli/test-meta-connection.js
 */

// Load .env.local manually (no dotenv dependency)
const fs = require('fs');
const envPath = require('path').join(__dirname, '../../dashboard/.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  const val = trimmed.slice(eqIdx + 1);
  if (val && !process.env[key]) process.env[key] = val;
}

const META_API_VERSION = 'v21.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

async function apiGet(endpoint, params = {}) {
  const token = process.env.META_ADS_ACCESS_TOKEN;
  if (!token) {
    throw new Error('META_ADS_ACCESS_TOKEN não configurado no .env.local');
  }

  const url = new URL(`${META_API_BASE}/${endpoint}`);
  url.searchParams.set('access_token', token);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.error) {
    throw new Error(`Meta API Error: ${data.error.message} (code: ${data.error.code}, type: ${data.error.type})`);
  }

  return data.data || data;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('         META ADS API — CONNECTION TEST');
  console.log('═══════════════════════════════════════════════════════\n');

  // Step 1: Verify token
  console.log('1️⃣  Verificando access token...');
  try {
    const me = await apiGet('me', { fields: 'id,name' });
    console.log(`   ✅ Token válido — User: ${me.name} (ID: ${me.id})\n`);
  } catch (err) {
    console.log(`   ❌ Token inválido: ${err.message}\n`);
    process.exit(1);
  }

  // Step 2: List ad accounts
  console.log('2️⃣  Listando Ad Accounts...');
  try {
    const accounts = await apiGet('me/adaccounts', {
      fields: 'name,account_id,account_status,currency,business_name,amount_spent',
    });

    const statusMap = { 1: 'ACTIVE', 2: 'DISABLED', 3: 'UNSETTLED', 7: 'PENDING_RISK_REVIEW', 8: 'PENDING_SETTLEMENT', 9: 'IN_GRACE_PERIOD', 100: 'PENDING_CLOSURE', 101: 'CLOSED', 201: 'ANY_ACTIVE', 202: 'ANY_CLOSED' };

    if (accounts.length === 0) {
      console.log('   ⚠️  Nenhuma ad account encontrada\n');
    } else {
      console.log(`   Encontradas ${accounts.length} ad account(s):\n`);
      accounts.forEach((acc, i) => {
        const status = statusMap[acc.account_status] || acc.account_status;
        const spent = acc.amount_spent ? `$${(parseInt(acc.amount_spent) / 100).toFixed(2)}` : '$0.00';
        console.log(`   [${i + 1}] ${acc.name || '(sem nome)'}`);
        console.log(`       ID: ${acc.account_id} (use: act_${acc.account_id})`);
        console.log(`       Status: ${status} | Moeda: ${acc.currency || 'N/A'} | Gasto total: ${spent}`);
        if (acc.business_name) console.log(`       Business: ${acc.business_name}`);
        console.log('');
      });

      // Suggest active accounts
      const active = accounts.filter(a => a.account_status === 1);
      if (active.length > 0) {
        console.log(`   💡 Contas ativas para META_ADS_ACCOUNT_ID:`);
        active.forEach(a => console.log(`      META_ADS_ACCOUNT_ID=act_${a.account_id}`));
        console.log('');
      }
    }
  } catch (err) {
    console.log(`   ❌ Erro ao listar accounts: ${err.message}\n`);
  }

  // Step 3: List pages
  console.log('3️⃣  Listando Facebook Pages...');
  try {
    const pages = await apiGet('me/accounts', {
      fields: 'id,name,category,access_token,is_published',
    });

    if (pages.length === 0) {
      console.log('   ⚠️  Nenhuma page encontrada\n');
    } else {
      console.log(`   Encontradas ${pages.length} page(s):\n`);
      pages.forEach((page, i) => {
        console.log(`   [${i + 1}] ${page.name}`);
        console.log(`       ID: ${page.id} | Categoria: ${page.category || 'N/A'} | Publicada: ${page.is_published ? 'Sim' : 'Não'}`);
        console.log('');
      });

      console.log(`   💡 Para META_ADS_PAGE_ID, use o ID da page desejada:`);
      pages.forEach(p => console.log(`      META_ADS_PAGE_ID=${p.id}  # ${p.name}`));
      console.log('');
    }
  } catch (err) {
    console.log(`   ❌ Erro ao listar pages: ${err.message}\n`);
  }

  // Step 4: Summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Copie os valores acima para dashboard/.env.local');
  console.log('═══════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
