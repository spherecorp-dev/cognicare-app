#!/usr/bin/env node
'use strict';

/**
 * Jarvis Voice — Protótipo Terminal (macOS)
 *
 * Zero dependências npm — usa apenas Node 18+ built-ins + ffmpeg + afplay.
 *
 * Setup:
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   export OPENAI_API_KEY=sk-...
 *
 * Uso:
 *   node jarvis-voice.js
 *
 *   [Enter]  → inicia gravação
 *   [Enter]  → para gravação, Jarvis processa e responde
 *   texto    → envia texto direto (sem mic)
 *   sair     → encerra
 *
 * Variáveis de ambiente opcionais:
 *   JARVIS_TTS=say         → usa macOS 'say' em vez de OpenAI TTS
 *   JARVIS_VOICE=onyx      → voz do OpenAI TTS (alloy|echo|fable|onyx|nova|shimmer)
 *   JARVIS_SAY_VOICE=Luciana → voz do macOS say
 *   JARVIS_MODEL=claude-sonnet-4-5-20250929 → modelo Claude
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ─── Configuração ───────────────────────────────────────────────────────────

const CONFIG = {
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  openaiKey: process.env.OPENAI_API_KEY,
  model: process.env.JARVIS_MODEL || 'claude-opus-4-6',
  tts: process.env.JARVIS_TTS || 'openai',
  voice: process.env.JARVIS_VOICE || 'onyx',
  sayVoice: process.env.JARVIS_SAY_VOICE || 'Luciana',
  tmpDir: path.join(__dirname, '.tmp'),
};

// ─── Cores ANSI ─────────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

// ─── System Prompt (otimizado para voz — respostas curtas) ──────────────────

const SYSTEM_PROMPT = `Você é Jarvis, Chief of Staff AI do CEO da B2G Capital.

PERSONALIDADE:
- Formal mas acessível. Sempre trate o CEO como "senhor".
- Analítico e proativo. Antecipe necessidades.
- Respostas CONCISAS — isto é conversa por voz, não documento.
- Máximo 3-4 frases por resposta, a menos que peçam detalhes.
- Use números concretos sempre que possível.

CAPACIDADES:
- Briefing executivo (status de projetos, métricas, pendências)
- Delegação inteligente (rotear tarefas para o agente correto)
- Avaliação de situações (opções com trade-offs)
- Priorização (MoSCoW/RICE)
- Monitoramento de delegações ativas

CONTEXTO B2G CAPITAL:
- Squad Orchestration Engine: Phases 1-3 completas (18/18 stories), Phase 4 (Scale) ready
- Jarvis Evolution: Phases 1-3 completas (764 testes passando)
- Agentes: @dev, @qa, @architect, @pm, @sm, @analyst, @copy-chief, @data-engineer, @devops
- Dashboard: Next.js 16, React 19, shadcn/ui, Tailwind CSS 4

ESTILO DE FALA:
- Comece com "Senhor," quando apropriado
- Frases curtas e diretas
- Evite listas longas — resuma e ofereça detalhar
- Tom: confiante, competente, respeitoso`;

// ─── Estado ─────────────────────────────────────────────────────────────────

const history = [];

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(icon, msg) {
  process.stdout.write(`  ${icon} ${msg}\n`);
}

function logJarvis(msg) {
  process.stdout.write(`\n  ${C.cyan}${C.bold}Jarvis:${C.reset} ${msg}\n\n`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── Startup Checks ─────────────────────────────────────────────────────────

function checkDeps() {
  const errors = [];

  if (!CONFIG.anthropicKey) {
    errors.push('ANTHROPIC_API_KEY não definida → export ANTHROPIC_API_KEY=sk-ant-...');
  }
  if (!CONFIG.openaiKey) {
    errors.push('OPENAI_API_KEY não definida → export OPENAI_API_KEY=sk-...');
  }

  try {
    require('child_process').execSync('which ffmpeg', { stdio: 'pipe' });
  } catch {
    errors.push('ffmpeg não instalado → brew install ffmpeg');
  }

  if (errors.length > 0) {
    console.error(`\n${C.red}${C.bold}  Erros de configuração:${C.reset}\n`);
    errors.forEach((e) => console.error(`  ${C.red}✗${C.reset} ${e}`));
    console.error('');
    process.exit(1);
  }
}

// ─── Audio Recording (ffmpeg + avfoundation) ────────────────────────────────

function record(outputPath) {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', [
      '-y',                    // overwrite
      '-f', 'avfoundation',   // macOS audio capture
      '-i', ':0',             // default audio input (mic)
      '-ar', '16000',         // 16kHz (Whisper optimal)
      '-ac', '1',             // mono
      '-acodec', 'pcm_s16le', // 16-bit PCM WAV
      outputPath,
    ], {
      stdio: ['pipe', 'pipe', 'pipe'], // suppress ffmpeg output
    });

    // ffmpeg needs a moment to initialize
    setTimeout(() => {
      resolve({
        stop: () => new Promise((res) => {
          proc.on('close', () => res());
          // Send 'q' to ffmpeg stdin for graceful stop (finalizes WAV header)
          proc.stdin.write('q');
          // Fallback kill after 2s
          setTimeout(() => {
            try { proc.kill('SIGTERM'); } catch { /* already exited */ }
          }, 2000);
        }),
      });
    }, 300);
  });
}

// ─── Whisper STT ────────────────────────────────────────────────────────────

async function transcribe(audioPath) {
  const fileBuffer = fs.readFileSync(audioPath);
  const blob = new Blob([fileBuffer], { type: 'audio/wav' });

  const form = new FormData();
  form.append('file', blob, 'audio.wav');
  form.append('model', 'whisper-1');
  form.append('language', 'pt');
  form.append('response_format', 'json');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${CONFIG.openaiKey}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.text;
}

// ─── Claude API ─────────────────────────────────────────────────────────────

async function askJarvis(userText) {
  history.push({ role: 'user', content: userText });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CONFIG.model,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: history.slice(-20), // últimas 20 mensagens para contexto
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude ${res.status}: ${err}`);
  }

  const data = await res.json();
  const reply = data.content[0].text;

  history.push({ role: 'assistant', content: reply });
  return reply;
}

// ─── Text-to-Speech ─────────────────────────────────────────────────────────

async function speak(text) {
  if (CONFIG.tts === 'say') {
    return speakMacOS(text);
  }
  return speakOpenAI(text);
}

function speakMacOS(text) {
  return new Promise((resolve, reject) => {
    // Escape for shell safety
    const escaped = text.replace(/'/g, "'\\''");
    exec(`say -v "${CONFIG.sayVoice}" '${escaped}'`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function speakOpenAI(text) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CONFIG.openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: CONFIG.voice,
      response_format: 'mp3',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS ${res.status}: ${err}`);
  }

  const audioPath = path.join(CONFIG.tmpDir, 'response.mp3');
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(audioPath, buffer);

  return new Promise((resolve, reject) => {
    exec(`afplay "${audioPath}"`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// ─── Main Loop ──────────────────────────────────────────────────────────────

async function main() {
  checkDeps();
  ensureDir(CONFIG.tmpDir);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const waitForLine = () =>
    new Promise((resolve) => {
      rl.once('line', (line) => resolve(line.trim()));
    });

  // Welcome
  console.log('');
  console.log(`  ${C.cyan}${C.bold}🤖 Jarvis Voice — Protótipo Terminal${C.reset}`);
  console.log(`  ${C.dim}${'─'.repeat(40)}${C.reset}`);
  console.log(`  ${C.dim}[Enter]     → gravar voz${C.reset}`);
  console.log(`  ${C.dim}[Enter]     → parar e enviar${C.reset}`);
  console.log(`  ${C.dim}texto+Enter → enviar texto direto${C.reset}`);
  console.log(`  ${C.dim}sair        → encerrar${C.reset}`);
  console.log(`  ${C.dim}TTS: ${CONFIG.tts} | Voice: ${CONFIG.tts === 'say' ? CONFIG.sayVoice : CONFIG.voice} | Model: ${CONFIG.model}${C.reset}`);
  console.log('');

  // Greeting
  const greeting = 'Bom dia, senhor. Estou ouvindo.';
  logJarvis(greeting);
  try {
    await speak(greeting);
  } catch (err) {
    log('⚠️', `${C.yellow}TTS indisponível: ${err.message} — continuando em texto${C.reset}`);
    CONFIG.tts = 'disabled';
  }

  // Loop principal
  while (true) {
    process.stdout.write(`  ${C.dim}> ${C.reset}`);
    const input = await waitForLine();

    // Sair
    if (input.toLowerCase() === 'sair' || input.toLowerCase() === 'exit') {
      const bye = 'Até logo, senhor.';
      logJarvis(bye);
      if (CONFIG.tts !== 'disabled') {
        try { await speak(bye); } catch { /* ok */ }
      }
      break;
    }

    // Texto direto (não vazio)
    if (input.length > 0) {
      log('📝', `${C.dim}${input}${C.reset}`);
      try {
        log('⏳', 'Pensando...');
        const reply = await askJarvis(input);
        logJarvis(reply);
        if (CONFIG.tts !== 'disabled') {
          log('🔊', 'Falando...');
          await speak(reply);
        }
      } catch (err) {
        log('❌', `${C.red}Erro: ${err.message}${C.reset}`);
      }
      continue;
    }

    // Gravação de voz
    const audioPath = path.join(CONFIG.tmpDir, 'input.wav');

    try {
      log('🎙️', `${C.red}${C.bold}Gravando...${C.reset} ${C.dim}[Enter] para parar${C.reset}`);
      const recorder = await record(audioPath);
      await waitForLine();
      await recorder.stop();

      // Verificar se tem conteúdo
      if (!fs.existsSync(audioPath)) {
        log('⚠️', 'Arquivo de áudio não foi criado. Tente novamente.');
        continue;
      }
      const stats = fs.statSync(audioPath);
      if (stats.size < 1000) {
        log('⚠️', 'Áudio muito curto. Tente novamente.');
        continue;
      }

      // Transcrever
      log('⏳', 'Transcrevendo...');
      const text = await transcribe(audioPath);
      log('📝', `${C.dim}"${text}"${C.reset}`);

      if (!text || text.trim().length === 0) {
        log('⚠️', 'Não consegui entender. Tente novamente.');
        continue;
      }

      // Pensar
      log('⏳', 'Pensando...');
      const reply = await askJarvis(text);
      logJarvis(reply);

      // Falar
      if (CONFIG.tts !== 'disabled') {
        log('🔊', 'Falando...');
        await speak(reply);
      }
    } catch (err) {
      log('❌', `${C.red}Erro: ${err.message}${C.reset}`);
    }
  }

  // Cleanup
  rl.close();
  try {
    if (fs.existsSync(CONFIG.tmpDir)) {
      fs.rmSync(CONFIG.tmpDir, { recursive: true, force: true });
    }
  } catch { /* ok */ }
  process.exit(0);
}

// ─── Cleanup on SIGINT ──────────────────────────────────────────────────────

process.on('SIGINT', () => {
  console.log(`\n\n  ${C.dim}Jarvis encerrado.${C.reset}\n`);
  try {
    if (fs.existsSync(CONFIG.tmpDir)) {
      fs.rmSync(CONFIG.tmpDir, { recursive: true, force: true });
    }
  } catch { /* ok */ }
  process.exit(0);
});

// ─── Start ──────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error(`\n  ${C.red}${C.bold}Fatal:${C.reset} ${err.message}\n`);
  process.exit(1);
});
