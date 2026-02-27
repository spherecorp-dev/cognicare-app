#!/usr/bin/env node
/**
 * CLI Pipeline Runner — Executa squads direto do terminal
 *
 * Uso:
 *   node .aios-core/cli/run-pipeline.js --squad squad-copy --offer MEMFR02
 *   node .aios-core/cli/run-pipeline.js --squad squad-copy --offer MEMFR02 --skip intelligence --quantity 5
 *   node .aios-core/cli/run-pipeline.js --squad squad-copy --offer MEMFR02 --platforms facebook,tiktok
 *
 * Requer: ANTHROPIC_API_KEY no env (ou em dashboard/.env.local)
 */

const path = require('path');
const fs = require('fs');

// ─── Load env from dashboard/.env.local if not already set ─────────────────
const projectRoot = path.resolve(__dirname, '../..');
const envPath = path.join(projectRoot, 'dashboard', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// Set project root env for resolveProjectRoot()
process.env.AIOS_PROJECT_ROOT = process.env.AIOS_PROJECT_ROOT || projectRoot;

const SquadOrchestrator = require('../core/orchestration/squad-engine/squad-orchestrator');

// ─── Parse CLI args ────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    squad: 'squad-copy',
    pipeline: 'creative-pipeline',
    offer: null,
    platforms: ['facebook', 'tiktok'],
    quantity: null,
    variationsPerConcept: null,
    skipPhases: [],
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--squad':
      case '-s':
        opts.squad = args[++i];
        break;
      case '--pipeline':
      case '-p':
        opts.pipeline = args[++i];
        break;
      case '--offer':
      case '-o':
        opts.offer = args[++i];
        break;
      case '--platforms':
        opts.platforms = args[++i].split(',').map(s => s.trim());
        break;
      case '--quantity':
      case '-q':
        opts.quantity = parseInt(args[++i], 10);
        break;
      case '--variations':
        opts.variationsPerConcept = parseInt(args[++i], 10);
        break;
      case '--no-variations':
        opts.variationsPerConcept = 0;
        break;
      case '--skip':
        opts.skipPhases.push(args[++i]);
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return opts;
}

function printHelp() {
  console.log(`
╔══════════════════════════════════════════════════════╗
║         AIOS Pipeline Runner — CLI                   ║
╚══════════════════════════════════════════════════════╝

Uso:
  node .aios-core/cli/run-pipeline.js [opcoes]

Opcoes:
  --squad, -s      Squad name (default: squad-copy)
  --pipeline, -p   Pipeline name (default: creative-pipeline)
  --offer, -o      Offer ID (obrigatorio, ex: MEMFR02)
  --platforms      Plataformas separadas por virgula (default: facebook,tiktok)
  --quantity, -q   Quantidade de conceitos/criativos (default: 3)
  --skip           Fase a pular (pode repetir: --skip intelligence --skip review)
  --help, -h       Mostrar esta ajuda

Exemplos:
  # Rodar pipeline completo
  node .aios-core/cli/run-pipeline.js -o MEMFR02

  # Pular intelligence (spy), 5 criativos
  node .aios-core/cli/run-pipeline.js -o MEMFR02 --skip intelligence -q 5

  # Só Facebook, 3 criativos
  node .aios-core/cli/run-pipeline.js -o MEMFR02 --platforms facebook -q 3
`);
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs();

  if (!opts.offer) {
    console.error('❌ Offer ID obrigatorio. Use --offer MEMFR02');
    console.error('   Rode com --help para ver opcoes.');
    process.exit(1);
  }

  // Verify API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY nao encontrada no env nem em dashboard/.env.local');
    process.exit(1);
  }

  console.log(`
╔══════════════════════════════════════════════════════╗
║               AIOS Pipeline Runner                   ║
╠══════════════════════════════════════════════════════╣
║  Squad:      ${opts.squad.padEnd(38)}║
║  Pipeline:   ${opts.pipeline.padEnd(38)}║
║  Offer:      ${opts.offer.padEnd(38)}║
║  Platforms:  ${opts.platforms.join(', ').padEnd(38)}║
║  Quantity:   ${String(opts.quantity || 3).padEnd(38)}║
║  Variations: ${String(opts.variationsPerConcept != null ? opts.variationsPerConcept : 3).padEnd(38)}║
║  Skip:       ${(opts.skipPhases.join(', ') || 'none').padEnd(38)}║
╚══════════════════════════════════════════════════════╝
`);

  const startTime = Date.now();

  // Build trigger context (same structure as POST /api/runs)
  const triggerContext = {
    trigger: {
      type: 'cli',
      caller: 'run-pipeline',
      offer: opts.offer,
      platforms: opts.platforms,
      ...(opts.quantity ? { quantity: opts.quantity } : {}),
      ...(opts.variationsPerConcept != null ? { variations_per_concept: opts.variationsPerConcept } : {}),
    },
  };

  // Build overrides
  const overrides = {};
  if (opts.skipPhases.length > 0) {
    overrides.skip_phases = opts.skipPhases;
  }

  try {
    // 1. Load squad
    console.log('\n[1/3] Loading squad...');
    const orchestrator = new SquadOrchestrator();
    const run = await orchestrator.loadSquad(opts.squad, opts.pipeline, triggerContext);

    console.log(`  ✓ Run ID: ${run.runId}`);
    console.log(`  ✓ Phases: ${run.phases.length}`);
    const totalSteps = run.phases.reduce((sum, p) => sum + (p.steps?.length || 0), 0);
    console.log(`  ✓ Total steps: ${totalSteps}`);

    // 2. Update state to running
    console.log('\n[2/3] Initializing state...');
    const stateDir = path.join(projectRoot, '.aios', 'squad-runs', run.runId);
    const statePath = path.join(stateDir, 'state.yaml');
    const yaml = require('js-yaml');

    // Read and update state
    const stateContent = await fs.promises.readFile(statePath, 'utf8');
    const state = yaml.load(stateContent);
    state.status = 'running';
    state.trigger = {
      type: 'cli',
      source: 'run-pipeline',
      data: { offerId: opts.offer },
      overrides,
    };
    await fs.promises.writeFile(statePath, yaml.dump(state));
    console.log('  ✓ State: running');

    // 3. Run pipeline
    console.log('\n[3/3] Running pipeline...\n');
    console.log('─'.repeat(60));

    const result = await orchestrator.runPipeline(
      run.runId,
      opts.squad,
      run.pipeline,
      run.context,
      { overrides }
    );

    console.log('─'.repeat(60));

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`
╔══════════════════════════════════════════════════════╗
║                 PIPELINE COMPLETE                     ║
╠══════════════════════════════════════════════════════╣
║  Run ID:     ${run.runId.padEnd(38)}║
║  Duration:   ${(elapsed + 's').padEnd(38)}║
║  Status:     ${'done'.padEnd(38)}║
╚══════════════════════════════════════════════════════╝
`);

    // Show output location
    const outputDir = path.join(projectRoot, '.aios', 'squad-runs', run.runId);
    console.log(`Output: ${outputDir}`);
    console.log(`Logs:   ${outputDir}/logs/execution.log`);

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`\n❌ Pipeline failed after ${elapsed}s: ${error.message}`);

    if (error.stack && process.env.AIOS_DEBUG) {
      console.error(error.stack);
    }

    process.exit(1);
  }
}

main();
