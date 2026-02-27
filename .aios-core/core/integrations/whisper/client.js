/**
 * WhisperClient — OpenAI Whisper API for audio/video transcription.
 *
 * Features:
 * - Multi-language support (FR, ES, EN, auto-detect)
 * - Configurable timeout (60s default)
 * - Retry 2x with increasing timeout (60s → 90s → 120s) on timeout errors
 * - Circuit breaker integration
 *
 * Story 2.5: External API Integrations (AC5)
 *
 * @module whisper-client
 */

const fs = require('fs');
const path = require('path');
const { ConfigError } = require('../image-generators/providers/dall-e');
const { CircuitBreakerRegistry } = require('../../orchestration/squad-engine/circuit-breaker');
const { RetryHandler } = require('../../orchestration/squad-engine/retry-handler');
const { APIErrorLogger } = require('../api-error-logger');

class WhisperClient {
  /**
   * @param {Object} options
   * @param {string} options.apiKey - OpenAI API key
   * @param {CircuitBreakerRegistry} [options.breakerRegistry] - Circuit breaker registry
   * @param {RetryHandler} [options.retryHandler] - Retry handler
   * @param {APIErrorLogger} [options.errorLogger] - Error logger
   * @param {string} [options.runId] - Run ID for logging
   * @param {Function} [options.fetchFn] - Custom fetch function (for testing)
   * @param {Function} [options.readFileFn] - Custom file reader (for testing)
   */
  constructor(options = {}) {
    if (!options.apiKey) throw new ConfigError('OPENAI_API_KEY is required for WhisperClient');

    this.apiKey = options.apiKey;
    this.name = 'whisper';
    this.model = 'whisper-1';
    this.breakerRegistry = options.breakerRegistry || new CircuitBreakerRegistry();
    this.retryHandler = options.retryHandler || new RetryHandler();
    this.errorLogger = options.errorLogger || new APIErrorLogger();
    this.runId = options.runId || null;
    this.fetchFn = options.fetchFn || globalThis.fetch;
    this.readFileFn = options.readFileFn || ((filePath) => fs.readFileSync(filePath));
  }

  /**
   * Transcribe audio/video file using OpenAI Whisper API.
   *
   * @param {string} audioFilePath - Path to audio/video file
   * @param {Object} [options]
   * @param {string} [options.language] - Language code: 'fr', 'es', 'en', or null for auto-detect
   * @param {number} [options.timeout=60000] - Timeout in ms
   * @param {string} [options.response_format='verbose_json'] - Response format
   * @returns {Promise<Object>} { text, language, duration_seconds, segments }
   */
  async transcribe(audioFilePath, options = {}) {
    const { language = null, timeout = 60000, response_format = 'verbose_json' } = options;

    const breaker = this.breakerRegistry.getOrCreate('whisper', {
      failureThreshold: 5,
      resetTimeout: 60000,
    });

    // Retry with increasing timeout: 60s → 90s → 120s
    const timeoutMultipliers = [1, 1.5, 2];

    return this.retryHandler.retryWithBackoff(
      async (attempt) => {
        const currentTimeout = Math.round(timeout * (timeoutMultipliers[attempt - 1] || 2));

        try {
          return await breaker.call(() =>
            this._callWhisperAPI(audioFilePath, {
              language,
              timeout: currentTimeout,
              response_format,
            })
          );
        } catch (error) {
          this._logError(error, attempt);
          throw error;
        }
      },
      {
        max_attempts: 3,
        base_delay_ms: 5000,
        strategy: 'linear',
        transient_errors: [429, 502, 503, 504, 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'AbortError'],
        stepId: 'whisper-transcribe',
        runId: this.runId,
      }
    );
  }

  /**
   * Call Whisper API directly.
   *
   * @param {string} audioFilePath
   * @param {Object} options
   * @returns {Promise<Object>} Structured transcription result
   * @private
   */
  async _callWhisperAPI(audioFilePath, options) {
    const { language, timeout, response_format } = options;

    const fileBuffer = this.readFileFn(audioFilePath);
    const fileName = path.basename(audioFilePath);

    // Build multipart form data
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), fileName);
    formData.append('model', this.model);
    formData.append('response_format', response_format);
    if (language) {
      formData.append('language', language);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await this.fetchFn('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = new Error(`Whisper API error: ${response.status}`);
        error.statusCode = response.status;
        try {
          const body = await response.json();
          error.message = body.error?.message || error.message;
        } catch {
          // Could not parse response body
        }
        throw error;
      }

      const data = await response.json();

      return {
        text: data.text,
        language: data.language || language || 'auto',
        duration_seconds: data.duration || null,
        segments: data.segments || [],
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        const timeoutError = new Error(`Whisper API timeout after ${timeout}ms`);
        timeoutError.code = 'ETIMEDOUT';
        timeoutError.statusCode = null;
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Log error (fire-and-forget)
   * @private
   */
  _logError(error, attempt) {
    if (!this.runId) return;
    try {
      this.errorLogger.log(this.runId, {
        provider: 'whisper',
        error_type: error.code === 'ETIMEDOUT' ? 'timeout' : 'api_error',
        status_code: error.statusCode || null,
        message: error.message,
        retry_attempt: attempt,
      });
    } catch {
      // fire-and-forget
    }
  }
}

module.exports = { WhisperClient };
