/**
 * ImageGeneratorClient — Multi-provider image generation with fallback, circuit breaker, and retry.
 *
 * Supports DALL-E (real), MidJourney, NanoBanana, Flux (stubs).
 * Each provider has independent circuit breaker and retry logic.
 *
 * Story 2.5: External API Integrations (AC1-AC4)
 *
 * @module image-generator-client
 */

const { GptImageProvider, ConfigError } = require('./providers/dall-e');
const { MidJourneyProvider } = require('./providers/midjourney');
const { NanoBananaProvider } = require('./providers/nanobanana');
const { FluxProvider } = require('./providers/flux');
const { CircuitBreakerRegistry } = require('../../orchestration/squad-engine/circuit-breaker');
const { RetryHandler } = require('../../orchestration/squad-engine/retry-handler');
const { APIErrorLogger } = require('../api-error-logger');

// Content policy forbidden terms (simplified — expand as needed)
const FORBIDDEN_TERMS = [
  'violence', 'gore', 'explicit', 'nsfw', 'nude', 'sexual',
  'hate', 'terrorism', 'self-harm', 'child abuse',
];

// Provider constructors map
const PROVIDER_MAP = {
  'gpt-image': GptImageProvider,
  'dall-e': GptImageProvider, // backward compat alias
  'midjourney': MidJourneyProvider,
  'nanobanana': NanoBananaProvider,
  'flux': FluxProvider,
};

class ImageGeneratorClient {
  /**
   * @param {Object} options
   * @param {Object} options.apiKeys - Map of provider → API key
   * @param {CircuitBreakerRegistry} [options.breakerRegistry] - Shared circuit breaker registry
   * @param {RetryHandler} [options.retryHandler] - Shared retry handler
   * @param {APIErrorLogger} [options.errorLogger] - Shared error logger
   * @param {string} [options.runId] - Run ID for logging context
   * @param {Object} [options.breakerOptions] - Default circuit breaker options per provider
   * @param {Object} [options.retryConfig] - Default retry config
   * @param {Object} [options.providerOptions] - Extra options passed to providers (e.g., fetchFn)
   */
  constructor(options = {}) {
    this.apiKeys = options.apiKeys || {};
    this.breakerRegistry = options.breakerRegistry || new CircuitBreakerRegistry();
    this.retryHandler = options.retryHandler || new RetryHandler();
    this.errorLogger = options.errorLogger || new APIErrorLogger();
    this.runId = options.runId || null;
    this.breakerOptions = options.breakerOptions || { failureThreshold: 5, resetTimeout: 60000 };
    this.retryConfig = options.retryConfig || { max_attempts: 3, base_delay_ms: 2000, strategy: 'exponential' };
    this.providerOptions = options.providerOptions || {};

    // Initialize available providers
    this.providers = {};
    for (const [name, key] of Object.entries(this.apiKeys)) {
      if (key && PROVIDER_MAP[name]) {
        this.providers[name] = new PROVIDER_MAP[name](key, this.providerOptions);
      }
    }
  }

  /**
   * Generate image using specified provider with circuit breaker + retry.
   *
   * @param {string} providerName - Provider to use (e.g., 'dall-e')
   * @param {string} prompt - Image generation prompt
   * @param {Object} [options] - Provider-specific options
   * @returns {Promise<Object>} { url, provider, model, metadata }
   */
  async generate(providerName, prompt, options = {}) {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new ConfigError(`Provider '${providerName}' not available. Available: ${Object.keys(this.providers).join(', ')}`);
    }

    const breaker = this.breakerRegistry.getOrCreate(`img-${providerName}`, this.breakerOptions);

    return this.retryHandler.retryWithBackoff(
      async (attempt) => {
        try {
          return await breaker.call(() => provider.generate(prompt, options));
        } catch (error) {
          // Log API error
          this._logError(providerName, error, attempt);

          // Content policy error (400) → sanitize prompt and retry 1x
          if (error.statusCode === 400 && error.errorType === 'content_policy_violation' && attempt === 1) {
            const sanitized = this.sanitizePrompt(prompt);
            if (sanitized !== prompt) {
              return await breaker.call(() => provider.generate(sanitized, options));
            }
          }

          throw error;
        }
      },
      { ...this.retryConfig, stepId: `img-generate-${providerName}`, runId: this.runId }
    );
  }

  /**
   * Generate image with fallback chain.
   * Tries providers in order; if one fails after retries, tries next.
   *
   * @param {string[]} providerNames - Ordered list of providers to try
   * @param {string} prompt - Image generation prompt
   * @param {Object} [options] - Provider-specific options
   * @returns {Promise<Object>} { url, provider, model, metadata }
   * @throws {Error} If all providers fail
   */
  async generateWithFallback(providerNames, prompt, options = {}) {
    const errors = [];

    for (const providerName of providerNames) {
      try {
        return await this.generate(providerName, prompt, options);
      } catch (error) {
        errors.push({ provider: providerName, error: error.message });
      }
    }

    const allFailedError = new Error(
      `All image providers failed: ${errors.map(e => `${e.provider}: ${e.error}`).join('; ')}`
    );
    allFailedError.providers = errors;
    allFailedError.errorType = 'all_providers_failed';
    throw allFailedError;
  }

  /**
   * Sanitize prompt by removing forbidden terms.
   *
   * @param {string} prompt - Original prompt
   * @returns {string} Sanitized prompt
   */
  sanitizePrompt(prompt) {
    let sanitized = prompt;
    for (const term of FORBIDDEN_TERMS) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      sanitized = sanitized.replace(regex, '');
    }
    return sanitized.replace(/\s+/g, ' ').trim();
  }

  /**
   * Log API error (fire-and-forget)
   * @private
   */
  _logError(providerName, error, attempt) {
    if (!this.runId) return;
    try {
      this.errorLogger.log(this.runId, {
        provider: providerName,
        error_type: error.errorType || 'api_error',
        status_code: error.statusCode || error.status || null,
        message: error.message,
        retry_attempt: attempt,
      });
    } catch {
      // fire-and-forget
    }
  }

  /**
   * Get list of available providers
   * @returns {string[]}
   */
  getAvailableProviders() {
    return Object.keys(this.providers);
  }
}

module.exports = { ImageGeneratorClient, ConfigError, PROVIDER_MAP, FORBIDDEN_TERMS };
