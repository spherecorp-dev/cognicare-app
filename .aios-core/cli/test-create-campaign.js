#!/usr/bin/env node
/**
 * Create MEMFR02 campaign on Meta Ads (PAUSED)
 *
 * - CBO (budget at campaign level)
 * - Bid Cap R$150 (limite de lance)
 * - Worldwide excl TW/BR/VE/SG, French (All) language
 * - Pixel: NEURO FR
 * - URL params via url_tags (separate from link)
 * - 5 creatives from batch-002
 * - Everything PAUSED
 *
 * Usage: node .aios-core/cli/test-create-campaign.js
 */

const fs = require('fs');
const path = require('path');

// Load .env.local
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

// ─── Config ──────────────────────────────────────────────────────────────────

const TOKEN = process.env.META_ADS_ACCESS_TOKEN;
const ACCOUNT_ID = process.env.META_ADS_ACCOUNT_ID;
const PAGE_ID = '989801267547129'; // NeuroFocus (published)
const PIXEL_ID = '685514171170887'; // NEURO FR

const META_API = 'https://graph.facebook.com/v21.0';

const BATCH_DIR = path.join(
  __dirname, '../../data/offers/MEMFR02/assets/criativos/batches/2026-02-23-batch-002'
);

// Link limpo (sem params) — params vão no url_tags
const LINK_URL = 'https://vsl.memoforce.click/6949b2fa0ee5f12c0fb30ef0';

// URL parameters (campo separado no Meta Ads)
const URL_TAGS = 'sub1={{ad.id}}&sub2={{adset.id}}&sub3={{campaign.id}}&sub4={{ad.name}}&sub5={{adset.name}}&sub6={{campaign.name}}&sub7={{placement}}&sub8={{site_source_name}}&utm_source=facebook&utm_medium=paid';

const CREATIVES = [
  {
    file: 'STE-IMG-MEMFR02-01H00',
    image: 'images/STE-IMG-MEMFR02-01H00.png',
    headline: 'Et si vous oubliiez qui vous êtes ?',
    description: "Un rituel ancestral de 8 secondes redonne à des milliers de Français leur mémoire et leur identité. Découvrez comment.",
    message: "Marie avait 68 ans quand elle a commencé à oublier les prénoms de ses petits-enfants.\n\nPas les visages. Les prénoms.\n\nElle m'a dit : 'Je savais qui ils étaient... mais les mots ne venaient plus.'\n\nC'est ça, la vraie peur. Pas de perdre ses clés. Perdre qui on est.\n\nCe qu'elle a découvert ensuite a changé tout. Cliquez pour voir.",
    cta: 'LEARN_MORE',
  },
  {
    file: 'STE-IMG-MEMFR02-02H00',
    image: 'images/STE-IMG-MEMFR02-02H00.png',
    headline: '3 peuples qui ne perdent jamais la mémoire',
    description: "Des chercheurs ont étudié 3 populations qui vieillissent sans perdre la mémoire. Le point commun découvert est surprenant — et accessible à tous.",
    message: "En 2019, une équipe de chercheurs a posé une question simple :\n\nPourquoi certains peuples ne semblent jamais perdre la mémoire ?\n\nIls ont étudié les habitants de Sardaigne, d'Okinawa et de l'Himalaya.\n\nLe point commun qu'ils ont trouvé a stupéfié la communauté scientifique.\n\nFaites défiler pour voir ce qu'ils ont découvert →",
    cta: 'LEARN_MORE',
  },
  {
    file: 'STE-IMG-MEMFR02-03H00',
    image: 'images/STE-IMG-MEMFR02-03H00.png',
    headline: "Il y a encore quelque chose que vous pouvez faire.",
    description: "Si vous voyez un proche perdre sa mémoire et vous sentez impuissant — cette découverte est pour vous. Une méthode naturelle, simple, à faire ensemble.",
    message: "Sophie avait regardé son père oublier son propre prénom.\n\nChaque dimanche, elle lui rendait visite. Chaque dimanche, il semblait un peu plus... absent.\n\nUn jour, une amie lui a parlé d'une méthode. Naturelle. Simple. Deux ingrédients.\n\nSix semaines plus tard, son père lui a rappelé une histoire d'enfance qu'elle avait oubliée elle-même.\n\nSi vous aimez quelqu'un qui oublie, lisez ceci →",
    cta: 'LEARN_MORE',
  },
  {
    file: 'STE-IMG-MEMFR02-04H00',
    image: 'images/STE-IMG-MEMFR02-04H00.png',
    headline: '16 000 Français ont retrouvé leur mémoire. Comment ?',
    description: "Une étude menée auprès de 16 000 adultes de 50 à 90 ans révèle des résultats remarquables sur la restauration cognitive grâce à une préparation ancestrale au miel.",
    message: "En 2022, une étude a suivi 16 000 adultes de 50 à 90 ans pendant 6 mois.\n\nUne seule variable : un rituel naturel de 8 secondes chaque matin.\n\nRésultat : 97% ont montré une amélioration cognitive significative.\n\n9 participants sur 10 présentant des signes précoces d'Alzheimer ont vu une régression des symptômes.\n\nCe que cette étude révèle — et pourquoi vous n'en avez pas entendu parler. Cliquez ici →",
    cta: 'LEARN_MORE',
  },
  {
    file: 'STE-IMG-MEMFR02-05H00',
    image: 'images/STE-IMG-MEMFR02-05H00.png',
    headline: 'Sans mémoire, qui êtes-vous vraiment ?',
    description: "La perte de mémoire n'est pas inévitable. Un rituel ancestral de 8 secondes aide des milliers de Français à préserver leur lucidité et leur identité. Découvrez comment.",
    message: "Jean-Pierre, 72 ans, m'a confié quelque chose qui m'a arrêté net.\n\n'Le pire, ce n'est pas d'oublier les dates. C'est de ne plus savoir qui on est.'\n\nIl avait raison. La mémoire, c'est notre identité. Nos histoires. Nos liens.\n\nCe qu'il a découvert ensuite — un rituel de 8 secondes à base de miel — a changé sa trajectoire.\n\nSi vous vous reconnaissez dans ses mots, lisez ceci →",
    cta: 'LEARN_MORE',
  },
];

// ─── API helper ──────────────────────────────────────────────────────────────

async function apiPost(endpoint, body = {}) {
  const url = `${META_API}/${endpoint}`;
  const formBody = new URLSearchParams();
  formBody.set('access_token', TOKEN);
  for (const [key, value] of Object.entries(body)) {
    formBody.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody.toString(),
  });
  const data = await res.json();

  if (data.error) {
    const details = data.error.error_user_msg || data.error.error_subcode || '';
    throw new Error(`${data.error.message} (code: ${data.error.code})${details ? ' — ' + details : ''}`);
  }
  return data;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  console.log('═══════════════════════════════════════════════════════');
  console.log('     MEMFR02 — CAMPAIGN CREATION (PAUSED)');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`  Account:   ${ACCOUNT_ID}`);
  console.log(`  Page:      ${PAGE_ID} (NeuroFocus)`);
  console.log(`  Pixel:     ${PIXEL_ID} (NEURO FR)`);
  console.log(`  Targeting: Worldwide excl TW/BR/VE/SG, Francês (Todos)`);
  console.log(`  Bid Cap:   R$150,00 (limite de lance)`);
  console.log(`  Type:      CBO / Sales / PAUSED`);
  console.log(`  Criativos: 5`);
  console.log(`  URL Tags:  ${URL_TAGS.substring(0, 50)}...\n`);

  // 0. Delete old campaign
  console.log('0️⃣  Deletando campanha anterior...');
  try {
    await apiPost('120242465002250310', { status: 'DELETED' });
    console.log('   ✅ Campanha 120242465002250310 deletada');
  } catch (err) {
    console.log(`   ⚠️  ${err.message}`);
  }

  // 1. Verify images
  console.log('\n1️⃣  Verificando imagens...');
  for (const c of CREATIVES) {
    const imgPath = path.join(BATCH_DIR, c.image);
    if (!fs.existsSync(imgPath)) {
      console.log(`   ❌ Não encontrada: ${c.image}`);
      process.exit(1);
    }
    const stats = fs.statSync(imgPath);
    console.log(`   ✅ ${c.file} — ${(stats.size / 1024).toFixed(0)} KB`);
  }

  // 2. Create campaign (CBO, Sales, Bid Cap = limite de lance)
  console.log('\n2️⃣  Criando campanha CBO (Sales, Bid Cap R$150)...');
  let campaign;
  try {
    campaign = await apiPost(`${ACCOUNT_ID}/campaigns`, {
      name: 'CBO - TDC - MEMFR02 - AI - 23.02',
      objective: 'OUTCOME_SALES',
      status: 'PAUSED',
      special_ad_categories: [],
      daily_budget: 10000, // R$100/dia (centavos) — CBO
      bid_strategy: 'LOWEST_COST_WITH_BID_CAP',
    });
    console.log(`   ✅ Campaign ID: ${campaign.id}`);
  } catch (err) {
    console.log(`   ❌ Erro: ${err.message}`);
    process.exit(1);
  }

  // 3. Create ad set (WW excl TW/BR/VE/SG, French All, Pixel NEURO FR, Bid Cap R$150)
  console.log('\n3️⃣  Criando Ad Set (WW French, Bid Cap R$150)...');
  let adSet;
  try {
    adSet = await apiPost(`${ACCOUNT_ID}/adsets`, {
      campaign_id: campaign.id,
      name: 'CBO - TDC - MEMFR02 - AI - 23.02 - AdSet',
      targeting: {
        geo_locations: {
          country_groups: ['europe', 'north_america', 'south_america', 'asia', 'oceania'],
        },
        excluded_geo_locations: {
          countries: ['TW', 'BR', 'VE', 'SG', 'GF'],
        },
        locales: [9, 44, 1003], // Francês (França), Francês (Canadá), Francês (Todos)
      },
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'OFFSITE_CONVERSIONS',
      bid_amount: 20000, // R$200 bid cap / limite de lance (centavos)
      promoted_object: { pixel_id: PIXEL_ID, custom_event_type: 'PURCHASE' },
      status: 'PAUSED',
    });
    console.log(`   ✅ Ad Set ID: ${adSet.id}`);
  } catch (err) {
    console.log(`   ❌ Erro: ${err.message}`);
    process.exit(1);
  }

  // 4. Upload images, create creatives & ads
  console.log('\n4️⃣  Upload de imagens e criação de ads...');
  const results = [];

  for (const c of CREATIVES) {
    const imgPath = path.join(BATCH_DIR, c.image);
    console.log(`\n   📸 ${c.file}...`);

    try {
      // Upload image (reuses hash if already uploaded)
      const imageBuffer = fs.readFileSync(imgPath);
      const base64Image = imageBuffer.toString('base64');

      const imgResult = await apiPost(`${ACCOUNT_ID}/adimages`, {
        bytes: base64Image,
      });
      const imageHash = Object.values(imgResult.images || {})[0]?.hash;
      if (!imageHash) throw new Error('No image hash returned');
      console.log(`      ✅ Image hash: ${imageHash}`);

      // Create ad creative (link limpo, sem url params)
      const creative = await apiPost(`${ACCOUNT_ID}/adcreatives`, {
        name: c.file,
        object_story_spec: {
          page_id: PAGE_ID,
          link_data: {
            image_hash: imageHash,
            link: LINK_URL,
            message: c.message,
            name: c.headline,
            description: c.description,
            call_to_action: {
              type: c.cta,
              value: { link: LINK_URL },
            },
          },
        },
        url_tags: URL_TAGS, // URL parameters separados
      });
      console.log(`      ✅ Creative ID: ${creative.id}`);

      // Create ad (name = filename sem extensão)
      const ad = await apiPost(`${ACCOUNT_ID}/ads`, {
        name: c.file,
        adset_id: adSet.id,
        creative: { creative_id: creative.id },
        status: 'PAUSED',
        tracking_specs: [{
          'action.type': ['offsite_conversion'],
          fb_pixel: [PIXEL_ID],
        }],
      });
      console.log(`      ✅ Ad ID: ${ad.id}`);

      results.push({ file: c.file, imageHash, creativeId: creative.id, adId: ad.id, status: 'OK' });
    } catch (err) {
      console.log(`      ❌ Erro: ${err.message}`);
      results.push({ file: c.file, status: 'FAILED', error: err.message });
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('                    RESULTADO');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`  Campaign: ${campaign.id} (CBO, Sales, Bid Cap R$150, PAUSED)`);
  console.log(`  Ad Set:   ${adSet.id} (WW excl TW/BR/VE/SG, FR All, PAUSED)`);
  console.log(`  Ads: ${results.filter(r => r.status === 'OK').length}/${CREATIVES.length}\n`);

  for (const r of results) {
    const icon = r.status === 'OK' ? '✅' : '❌';
    console.log(`  ${icon} ${r.file}: ${r.status}`);
    if (r.adId) console.log(`     Ad ID: ${r.adId}`);
    if (r.error) console.log(`     Error: ${r.error}`);
  }

  console.log('\n  URL Tags: ' + URL_TAGS.substring(0, 60) + '...');
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ⚠️  TUDO PAUSED — nada rodando.');
  console.log('  Ative no Meta Ads Manager quando quiser.');
  console.log('═══════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err.message);
  process.exit(1);
});
