/**
 * Transcription Service — Whisper API Integration
 *
 * Transcribes audio/video files via OpenAI Whisper API.
 * Supports: mp3, mp4, m4a, wav, webm, ogg
 *
 * @module core/services/transcription-service
 * @version 1.0.0
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

class TranscriptionService {
  /**
   * @param {Object} options
   * @param {string} [options.openaiApiKey] - OpenAI API key
   * @param {string} [options.model='whisper-1'] - Whisper model
   * @param {string} [options.language] - Force language (e.g., 'fr', 'en', 'es', 'pt')
   */
  constructor(options = {}) {
    this.apiKey = options.openaiApiKey || process.env.OPENAI_API_KEY;
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is required for TranscriptionService');
    }
    this.model = options.model || 'whisper-1';
    this.language = options.language || null;
  }

  /**
   * Transcribe an audio/video file
   *
   * @param {string} filePath - Path to audio/video file
   * @param {Object} [options]
   * @param {string} [options.language] - Override language
   * @param {boolean} [options.timestamps=true] - Include word timestamps
   * @returns {Promise<{text: string, segments: Array, language: string, duration: number}>}
   */
  async transcribe(filePath, options = {}) {
    const OpenAI = require('openai').default;
    const client = new OpenAI({ apiKey: this.apiKey });

    // Verify file exists
    await fsPromises.access(filePath);

    const fileStream = fs.createReadStream(filePath);

    const params = {
      file: fileStream,
      model: this.model,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    };

    if (options.language || this.language) {
      params.language = options.language || this.language;
    }

    const response = await client.audio.transcriptions.create(params);

    return {
      text: response.text,
      segments: (response.segments || []).map((seg) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text,
      })),
      language: response.language || options.language || 'unknown',
      duration: response.duration || null,
    };
  }

  /**
   * Extract audio from video file using ffmpeg
   *
   * @param {string} videoPath - Path to video file
   * @param {string} [outputDir] - Output directory (defaults to same dir as video)
   * @returns {Promise<string>} Path to extracted audio file
   */
  async extractAudio(videoPath, outputDir) {
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);

    const dir = outputDir || path.dirname(videoPath);
    const baseName = path.basename(videoPath, path.extname(videoPath));
    const audioPath = path.join(dir, `${baseName}.mp3`);

    try {
      await execFileAsync('ffmpeg', [
        '-i', videoPath,
        '-vn',                    // No video
        '-acodec', 'libmp3lame',  // MP3 codec
        '-ab', '128k',            // 128kbps
        '-y',                     // Overwrite
        audioPath,
      ], { timeout: 120000 }); // 2 min timeout
    } catch (error) {
      throw new Error(`ffmpeg audio extraction failed: ${error.message}`);
    }

    return audioPath;
  }

  /**
   * Transcribe video (extract audio first, then transcribe)
   *
   * @param {string} videoPath - Path to video file
   * @param {Object} [options] - Same as transcribe()
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeVideo(videoPath, options = {}) {
    const ext = path.extname(videoPath).toLowerCase();
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv'];

    let audioPath = videoPath;

    if (videoExtensions.includes(ext)) {
      audioPath = await this.extractAudio(videoPath);
    }

    try {
      return await this.transcribe(audioPath, options);
    } finally {
      // Clean up extracted audio if we created it
      if (audioPath !== videoPath) {
        await fsPromises.unlink(audioPath).catch(() => {});
      }
    }
  }

  /**
   * Assess transcription quality
   *
   * @param {Object} transcription - Result from transcribe()
   * @returns {Object} Quality assessment
   */
  assessQuality(transcription) {
    const { text, segments, duration } = transcription;

    if (!text || text.trim().length === 0) {
      return { quality: 'no_speech', score: 0, usable: false };
    }

    const wordCount = text.split(/\s+/).length;
    const wordsPerSecond = duration ? wordCount / duration : 0;

    // Heuristics for quality detection
    let quality = 'clean';
    let score = 1.0;

    if (wordsPerSecond < 0.5) {
      quality = 'music_heavy';
      score = 0.3;
    } else if (wordsPerSecond < 1.0) {
      quality = 'noisy';
      score = 0.6;
    }

    // Check for very short segments (might indicate noise)
    if (segments && segments.length > 0) {
      const avgSegmentLength = segments.reduce((sum, s) => sum + s.text.length, 0) / segments.length;
      if (avgSegmentLength < 10) {
        quality = 'noisy';
        score = Math.min(score, 0.5);
      }
    }

    return {
      quality,
      score,
      usable: score >= 0.3,
      wordCount,
      wordsPerSecond: Math.round(wordsPerSecond * 10) / 10,
      duration,
    };
  }
}

module.exports = { TranscriptionService };
