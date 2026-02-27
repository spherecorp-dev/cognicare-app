// List Meta Ads pixels for the configured account
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '../../dashboard/.env.local');
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

async function main() {
  const acct = process.env.META_ADS_ACCOUNT_ID;
  const token = process.env.META_ADS_ACCESS_TOKEN;
  const url = `https://graph.facebook.com/v21.0/${acct}/adspixels?fields=id,name,is_unavailable&access_token=${token}`;
  const res = await fetch(url);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
main();
