#!/usr/bin/env node

/**
 * B2G Capital — Audio/Video Transcription Tool
 *
 * Usage:
 *   node tools/transcribe.js <file-or-url> [--lang auto] [--output outputs/transcripts]
 *
 * Supports:
 *   - Local audio/video files (mp3, mp4, m4a, wav, webm, ogg, flac)
 *   - YouTube URLs (requires yt-dlp)
 *   - Direct URLs to audio/video files
 *
 * Requirements:
 *   - OPENAI_API_KEY environment variable
 *   - yt-dlp (for YouTube URLs) — brew install yt-dlp
 *   - ffmpeg (for splitting large files) — brew install ffmpeg
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const OpenAI = require('openai');

// --- Config ---
const WHISPER_MAX_SIZE = 25 * 1024 * 1024; // 25MB limit
const CHUNK_DURATION_SECONDS = 600; // 10 min chunks for splitting
const SUPPORTED_FORMATS = ['.mp3', '.mp4', '.m4a', '.wav', '.webm', '.ogg', '.flac', '.mpeg', '.mpga'];
const TEMP_DIR = path.join(__dirname, '..', '.tmp-transcribe');

// --- Argument parsing ---
function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node tools/transcribe.js <file-or-url> [--lang auto] [--output dir]');
    console.error('');
    console.error('Options:');
    console.error('  --lang     Language hint (default: auto). Use ISO codes: en, fr, es, pt');
    console.error('  --output   Output directory (default: outputs/transcripts)');
    console.error('  --format   Output format: txt, md, json (default: md)');
    process.exit(1);
  }

  const input = args[0];
  let lang = 'auto';
  let outputDir = path.join(__dirname, '..', 'outputs', 'transcripts');
  let format = 'md';

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--lang' && args[i + 1]) { lang = args[++i]; }
    if (args[i] === '--output' && args[i + 1]) { outputDir = args[++i]; }
    if (args[i] === '--format' && args[i + 1]) { format = args[++i]; }
  }

  return { input, lang, outputDir, format };
}

// --- URL detection ---
function isURL(str) {
  return str.startsWith('http://') || str.startsWith('https://');
}

function isYouTubeURL(url) {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

// --- Download functions ---
function downloadYouTube(url) {
  console.log('[download] Downloading audio from YouTube...');
  const ytdlp = ensureCommand('yt-dlp', 'brew install yt-dlp OR pip3 install --user yt-dlp');

  fs.mkdirSync(TEMP_DIR, { recursive: true });
  const outputPath = path.join(TEMP_DIR, 'yt-audio.m4a');

  execSync(
    `"${ytdlp}" -f "bestaudio[ext=m4a]/bestaudio" --no-playlist -o "${outputPath}" "${url}"`,
    { stdio: 'inherit' }
  );

  if (!fs.existsSync(outputPath)) {
    throw new Error('yt-dlp download failed — no output file produced');
  }
  return outputPath;
}

function downloadDirectURL(url) {
  console.log('[download] Downloading file from URL...');
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  const ext = path.extname(new URL(url).pathname) || '.mp3';
  const outputPath = path.join(TEMP_DIR, `download${ext}`);

  execSync(`curl -L -o "${outputPath}" "${url}"`, { stdio: 'inherit' });

  if (!fs.existsSync(outputPath)) {
    throw new Error('Download failed — no output file produced');
  }
  return outputPath;
}

// --- File splitting for large files ---
function splitAudio(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.size <= WHISPER_MAX_SIZE) {
    return [filePath];
  }

  const ffmpegPath = ensureCommand('ffmpeg', 'brew install ffmpeg');

  console.log(`[split] File is ${(stat.size / 1024 / 1024).toFixed(1)}MB — splitting into chunks...`);
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  const ext = path.extname(filePath);
  const chunkPattern = path.join(TEMP_DIR, `chunk_%03d${ext}`);

  execSync(
    `"${ffmpegPath}" -i "${filePath}" -f segment -segment_time ${CHUNK_DURATION_SECONDS} -c copy "${chunkPattern}" -y`,
    { stdio: 'pipe' }
  );

  const chunks = fs.readdirSync(TEMP_DIR)
    .filter(f => f.startsWith('chunk_'))
    .sort()
    .map(f => path.join(TEMP_DIR, f));

  console.log(`[split] Created ${chunks.length} chunks`);
  return chunks;
}

// --- Whisper transcription ---
async function transcribeFile(client, filePath, lang) {
  const fileSize = fs.statSync(filePath).size;
  console.log(`[transcribe] Sending ${path.basename(filePath)} (${(fileSize / 1024 / 1024).toFixed(1)}MB)...`);

  const params = {
    file: fs.createReadStream(filePath),
    model: 'whisper-1',
    response_format: 'verbose_json',
  };

  if (lang && lang !== 'auto') {
    params.language = lang;
  }

  const response = await client.audio.transcriptions.create(params);
  return response;
}

async function transcribe(filePath, lang) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set. Export it: export OPENAI_API_KEY=sk-...');
  }

  const client = new OpenAI({ apiKey });
  const chunks = splitAudio(filePath);
  const results = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`[transcribe] Chunk ${i + 1}/${chunks.length}...`);
    const result = await transcribeFile(client, chunks[i], lang);
    results.push(result);
  }

  // Merge results
  const fullText = results.map(r => r.text).join('\n\n');
  const detectedLang = results[0]?.language || 'unknown';
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

  return { text: fullText, language: detectedLang, duration: totalDuration, chunks: results.length };
}

// --- Output formatting ---
function formatOutput(result, inputName, format) {
  const durationStr = formatDuration(result.duration);

  if (format === 'json') {
    return JSON.stringify({
      source: inputName,
      language: result.language,
      duration: result.duration,
      duration_formatted: durationStr,
      chunks: result.chunks,
      text: result.text,
      transcribed_at: new Date().toISOString(),
    }, null, 2);
  }

  if (format === 'txt') {
    return result.text;
  }

  // Default: markdown
  return `# Transcript: ${inputName}

| Campo | Valor |
|-------|-------|
| **Fonte** | ${inputName} |
| **Idioma detectado** | ${result.language} |
| **Duracao** | ${durationStr} |
| **Chunks processados** | ${result.chunks} |
| **Transcrito em** | ${new Date().toISOString()} |

---

## Transcricao Completa

${result.text}

---

*Transcrito via OpenAI Whisper API — B2G Capital Tools*
`;
}

function formatDuration(seconds) {
  if (!seconds) return 'N/A';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// --- Utility ---
function findCommand(cmd) {
  // Check common locations beyond PATH
  const extraPaths = [
    `/Users/${process.env.USER}/Library/Python/3.9/bin/${cmd}`,
    `/usr/local/bin/${cmd}`,
    `/opt/homebrew/bin/${cmd}`,
  ];
  try {
    const found = execSync(`which ${cmd}`, { stdio: 'pipe' }).toString().trim();
    return found;
  } catch {
    for (const p of extraPaths) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }
}

function ensureCommand(cmd, installHint) {
  const found = findCommand(cmd);
  if (!found) {
    throw new Error(`'${cmd}' not found. Install it: ${installHint}`);
  }
  return found;
}

function cleanup() {
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

function generateOutputFilename(input, format) {
  let baseName;
  if (isURL(input)) {
    if (isYouTubeURL(input)) {
      baseName = 'youtube';
    } else {
      baseName = path.basename(new URL(input).pathname, path.extname(new URL(input).pathname)) || 'download';
    }
  } else {
    baseName = path.basename(input, path.extname(input));
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${baseName}-${timestamp}.${format === 'json' ? 'json' : 'md'}`;
}

// --- Main ---
async function main() {
  const { input, lang, outputDir, format } = parseArgs();

  console.log(`[start] Input: ${input}`);
  console.log(`[start] Language: ${lang}`);
  console.log(`[start] Output: ${outputDir}`);

  let filePath;
  let inputName = input;

  try {
    // Step 1: Resolve input to local file
    if (isURL(input)) {
      if (isYouTubeURL(input)) {
        filePath = downloadYouTube(input);
        inputName = input;
      } else {
        filePath = downloadDirectURL(input);
        inputName = input;
      }
    } else {
      filePath = path.resolve(input);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      inputName = path.basename(filePath);
    }

    // Step 2: Validate format
    const ext = path.extname(filePath).toLowerCase();
    if (!SUPPORTED_FORMATS.includes(ext)) {
      console.log(`[convert] Format ${ext} may need conversion. Attempting with ffmpeg...`);
      const ffmpegPath = ensureCommand('ffmpeg', 'brew install ffmpeg');
      const converted = path.join(TEMP_DIR || '/tmp', 'converted.mp3');
      fs.mkdirSync(path.dirname(converted), { recursive: true });
      execSync(`"${ffmpegPath}" -i "${filePath}" -vn -acodec libmp3lame -q:a 4 "${converted}" -y`, { stdio: 'pipe' });
      filePath = converted;
    }

    // Step 3: Transcribe
    console.log('[transcribe] Starting transcription...');
    const result = await transcribe(filePath, lang);

    // Step 4: Save output
    fs.mkdirSync(outputDir, { recursive: true });
    const outputFilename = generateOutputFilename(input, format);
    const outputPath = path.join(outputDir, outputFilename);
    const outputContent = formatOutput(result, inputName, format);
    fs.writeFileSync(outputPath, outputContent, 'utf-8');

    console.log('');
    console.log(`[done] Transcription complete!`);
    console.log(`[done] Language: ${result.language}`);
    console.log(`[done] Duration: ${formatDuration(result.duration)}`);
    console.log(`[done] Chunks: ${result.chunks}`);
    console.log(`[done] Output: ${outputPath}`);

    return outputPath;

  } finally {
    cleanup();
  }
}

main().catch(err => {
  console.error(`[error] ${err.message}`);
  cleanup();
  process.exit(1);
});
