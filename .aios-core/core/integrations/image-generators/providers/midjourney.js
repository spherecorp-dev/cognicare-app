/**
 * MidJourney Provider — Stub Implementation
 *
 * Interface defined, mock implementation. Real implementation when API available.
 *
 * Story 2.5: External API Integrations (AC1)
 *
 * @module midjourney-provider
 */

const { ConfigError } = require('./dall-e');

class MidJourneyProvider {
  /**
   * @param {string} apiKey - MidJourney API key
   */
  constructor(apiKey) {
    if (!apiKey) throw new ConfigError('MIDJOURNEY_API_KEY is required for MidJourneyProvider');
    this.apiKey = apiKey;
    this.name = 'midjourney';
    this.model = 'midjourney-v6';
  }

  /**
   * Generate image from prompt (stub).
   *
   * @param {string} prompt - Image generation prompt
   * @param {Object} [options]
   * @returns {Promise<Object>} { url, provider, model, metadata }
   */
  async generate(prompt, options = {}) {
    throw new Error('MidJourney provider not yet implemented. Awaiting official API access.');
  }
}

module.exports = { MidJourneyProvider };
