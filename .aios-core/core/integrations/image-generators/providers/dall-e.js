/**
 * GPT Image Provider — OpenAI GPT Image 1.5 API
 *
 * Replaces DALL-E 3 (deprecated May 2026).
 * GPT Image 1.5: better instruction following, text rendering, no style param,
 * always returns base64, sizes: 1024x1024, 1536x1024, 1024x1536, auto.
 *
 * Story 2.5: External API Integrations (AC1)
 *
 * @module gpt-image-provider
 */

class GptImageProvider {
  /**
   * @param {string} apiKey - OpenAI API key
   * @param {Object} [options]
   * @param {Function} [options.fetchFn] - Custom fetch function (for testing)
   */
  constructor(apiKey, options = {}) {
    if (!apiKey) throw new ConfigError('OPENAI_API_KEY is required for GptImageProvider');
    this.apiKey = apiKey;
    this.name = 'gpt-image';
    this.model = 'gpt-image-1.5';
    this.fetchFn = options.fetchFn || globalThis.fetch;
  }

  /**
   * Generate image from prompt via OpenAI GPT Image API.
   *
   * @param {string} prompt - Image generation prompt (max 32,000 chars)
   * @param {Object} [options]
   * @param {string} [options.size='1024x1024'] - Image size (1024x1024, 1536x1024, 1024x1536, auto)
   * @param {string} [options.quality='high'] - Image quality (low, medium, high, auto)
   * @param {string} [options.model] - Model override
   * @param {string} [options.output_format='png'] - Output format (png, jpeg, webp)
   * @returns {Promise<Object>} { b64_json, provider, model, metadata }
   */
  async generate(prompt, options = {}) {
    const { size = '1024x1024', quality = 'high', model, output_format = 'png' } = options;

    const response = await this.fetchFn('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || this.model,
        prompt,
        n: 1,
        size,
        quality,
        output_format,
      }),
    });

    if (!response.ok) {
      const error = new Error(`GPT Image API error: ${response.status}`);
      error.statusCode = response.status;
      try {
        const body = await response.json();
        error.message = body.error?.message || error.message;
        error.errorType = body.error?.type || 'api_error';
      } catch {
        // Could not parse response body
      }
      throw error;
    }

    const data = await response.json();
    const image = data.data[0];

    return {
      b64_json: image.b64_json,
      provider: this.name,
      model: model || this.model,
      metadata: {
        size,
        quality,
        usage: data.usage || null,
      },
    };
  }
}

/**
 * Configuration error for missing API keys
 */
class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

// Keep DallEProvider as alias for backward compatibility with existing imports
const DallEProvider = GptImageProvider;

module.exports = { GptImageProvider, DallEProvider, ConfigError };
