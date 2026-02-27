// Lookup French locale IDs in Meta API
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
  const token = process.env.META_ADS_ACCESS_TOKEN;

  // Search for "fran" to find French/Français
  const searches = ['fran', 'franc', 'fren'];
  for (const q of searches) {
    const url = `https://graph.facebook.com/v21.0/search?type=adlocale&q=${q}&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      console.log(`Search "${q}":`);
      data.data.forEach(l => console.log(`  key: ${l.key} — ${l.name}`));
    }
  }
}
main();
