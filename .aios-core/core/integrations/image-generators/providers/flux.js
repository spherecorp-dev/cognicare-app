/**
 * Flux Provider — Stub Implementation
 *
 * Interface defined, mock implementation. Real implementation when API available.
 *
 * Story 2.5: External API Integrations (AC1)
 *
 * @module flux-provider
 */

const { ConfigError } = require('./dall-e');

class FluxProvider {
  /**
   * @param {string} apiKey - Flux API key
   */
  constructor(apiKey) {
    if (!apiKey) throw new ConfigError('FLUX_API_KEY is required for FluxProvider');
    this.apiKey = apiKey;
    this.name = 'flux';
    this.model = 'flux-v1';
  }

  /**
   * Generate image from prompt (stub).
   *
   * @param {string} prompt - Image generation prompt
   * @param {Object} [options]
   * @returns {Promise<Object>} { url, provider, model, metadata }
   */
  async generate(prompt, options = {}) {
    throw new Error('Flux provider not yet implemented. Awaiting API access.');
  }
}

module.exports = { FluxProvider };
