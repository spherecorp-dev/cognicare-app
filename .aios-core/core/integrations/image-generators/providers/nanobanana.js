/**
 * NanoBanana Provider — Stub Implementation
 *
 * Interface defined, mock implementation. Real implementation when API available.
 *
 * Story 2.5: External API Integrations (AC1)
 *
 * @module nanobanana-provider
 */

const { ConfigError } = require('./dall-e');

class NanoBananaProvider {
  /**
   * @param {string} apiKey - NanoBanana API key
   */
  constructor(apiKey) {
    if (!apiKey) throw new ConfigError('NANOBANANA_API_KEY is required for NanoBananaProvider');
    this.apiKey = apiKey;
    this.name = 'nanobanana';
    this.model = 'nanobanana-v1';
  }

  /**
   * Generate image from prompt (stub).
   *
   * @param {string} prompt - Image generation prompt
   * @param {Object} [options]
   * @returns {Promise<Object>} { url, provider, model, metadata }
   */
  async generate(prompt, options = {}) {
    throw new Error('NanoBanana provider not yet implemented. Awaiting API access.');
  }
}

module.exports = { NanoBananaProvider };
