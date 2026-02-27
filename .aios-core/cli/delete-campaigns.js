// Delete orphan campaigns
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

const TOKEN = process.env.META_ADS_ACCESS_TOKEN;
const API = 'https://graph.facebook.com/v21.0';

async function deleteCampaign(id) {
  const res = await fetch(`${API}/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `access_token=${TOKEN}&status=DELETED`,
  });
  return await res.json();
}

async function main() {
  const orphans = ['120242464917810310', '120242464931580310'];
  for (const id of orphans) {
    const r = await deleteCampaign(id);
    console.log(`Campaign ${id}: ${r.success ? 'DELETED' : JSON.stringify(r)}`);
  }
}
main();
