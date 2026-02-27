/**
 * Image Generation Service — Plug-and-Play Multi-Provider
 *
 * Generates images via NanoBanana (primary) with DALL-E fallback.
 * Provider architecture allows easy swapping/adding of services.
 *
 * @module core/services/image-generation-service
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
//                              PROVIDER INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base provider — all providers implement this interface
 */
class ImageProvider {
  constructor(name, apiKey) {
    this.name = name;
    this.apiKey = apiKey;
  }

  async generate(_prompt, _options) {
    throw new Error(`${this.name}: generate() not implemented`);
  }

  async checkHealth() {
    return !!this.apiKey;
  }
}

/**
 * NanoBanana Provider (Primary)
 * API-compatible with DALL-E style endpoints
 */
class NanoBananaProvider extends ImageProvider {
  constructor(apiKey) {
    super('nanobanana', apiKey);
    this.baseUrl = 'https://api.nanobanana.com/v1';
  }

  async generate(prompt, options = {}) {
    if (!this.apiKey) throw new Error('NANOBANANA_API_KEY not configured');

    const { width = 1024, height = 1024, style, negativePrompt } = options;

    const body = {
      prompt,
      negative_prompt: negativePrompt || '',
      width,
      height,
      style: style || 'photographic',
      num_images: 1,
    };

    const response = await fetch(`${this.baseUrl}/images/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`NanoBanana API error (${response.status}): ${error}`);
    }

    const data = await response.json();

    // NanoBanana returns base64 or URL — normalize to buffer
    let buffer;
    if (data.images?.[0]?.b64_json) {
      buffer = Buffer.from(data.images[0].b64_json, 'base64');
    } else if (data.images?.[0]?.url) {
      const imgResponse = await fetch(data.images[0].url);
      buffer = Buffer.from(await imgResponse.arrayBuffer());
    } else {
      throw new Error('NanoBanana: unexpected response format');
    }

    return {
      buffer,
      metadata: {
        provider: 'nanobanana',
        model: data.model || 'nanobanana-v1',
        width,
        height,
        prompt,
        revisedPrompt: data.images?.[0]?.revised_prompt || prompt,
      },
    };
  }
}

/**
 * GPT Image Provider (Primary)
 * Uses OpenAI SDK with gpt-image-1.5 model
 *
 * Breaking changes from DALL-E 3:
 * - No response_format param (always returns base64)
 * - No style param (style controlled via prompt)
 * - quality: 'low'|'medium'|'high'|'auto' (was 'standard'|'hd')
 * - Sizes: 1024x1024, 1536x1024, 1024x1536, auto (no 1792x*)
 * - No revised_prompt in response
 * - New: output_format, background, output_compression
 */
class GptImageProvider extends ImageProvider {
  constructor(apiKey) {
    super('gpt-image', apiKey);
  }

  async generate(prompt, options = {}) {
    if (!this.apiKey) throw new Error('OPENAI_API_KEY not configured');

    const OpenAI = require('openai').default;
    const client = new OpenAI({ apiKey: this.apiKey });

    const { width = 1024, height = 1024 } = options;
    const size = this._mapSize(width, height);

    const response = await client.images.generate({
      model: 'gpt-image-1.5',
      prompt,
      n: 1,
      size,
      quality: 'high',
      output_format: 'png',
    });

    const buffer = Buffer.from(response.data[0].b64_json, 'base64');

    return {
      buffer,
      metadata: {
        provider: 'gpt-image',
        model: 'gpt-image-1.5',
        width,
        height,
        prompt,
        revisedPrompt: prompt,
      },
    };
  }

  _mapSize(width, height) {
    // GPT Image supported sizes: 1024x1024, 1536x1024, 1024x1536, auto
    if (width === height) return '1024x1024';
    if (width > height) return '1536x1024';
    return '1024x1536';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                        IMAGE GENERATION SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

class ImageGenerationService {
  /**
   * @param {Object} options
   * @param {string} [options.nanoBananaApiKey] - NanoBanana API key
   * @param {string} [options.openaiApiKey] - OpenAI API key (for DALL-E fallback)
   * @param {string} [options.primary='nanobanana'] - Primary provider name
   * @param {string} [options.fallback='dalle'] - Fallback provider name
   */
  constructor(options = {}) {
    this.providers = {};

    const nbKey = options.nanoBananaApiKey || process.env.NANOBANANA_API_KEY;
    const oaiKey = options.openaiApiKey || process.env.OPENAI_API_KEY;

    // GPT Image 1.5 is the primary (replaces DALL-E 3, deprecated May 2026)
    // NanoBanana as fallback
    if (oaiKey) this.providers['gpt-image'] = new GptImageProvider(oaiKey);
    if (nbKey && !nbKey.startsWith('AIza')) {
      this.providers.nanobanana = new NanoBananaProvider(nbKey);
    }

    this.primaryName = options.primary || 'gpt-image';
    this.fallbackName = options.fallback || 'nanobanana';

    // If primary not available, swap
    if (!this.providers[this.primaryName] && this.providers[this.fallbackName]) {
      this.primaryName = this.fallbackName;
      this.fallbackName = null;
    }
  }

  /**
   * Generate an image with automatic fallback
   *
   * @param {Object} params
   * @param {string} params.prompt - Image generation prompt
   * @param {string} [params.negativePrompt] - What to exclude
   * @param {number} [params.width=1024] - Image width
   * @param {number} [params.height=1024] - Image height
   * @param {string} [params.style] - Style (photographic, illustration, etc.)
   * @returns {Promise<{buffer: Buffer, metadata: Object}>}
   */
  async generate({ prompt, negativePrompt, width = 1024, height = 1024, style }) {
    const options = { width, height, style, negativePrompt };

    // Try primary
    const primary = this.providers[this.primaryName];
    if (primary) {
      try {
        return await primary.generate(prompt, options);
      } catch (error) {
        console.warn(`Primary provider (${this.primaryName}) failed: ${error.message}`);
      }
    }

    // Try fallback
    const fallback = this.fallbackName ? this.providers[this.fallbackName] : null;
    if (fallback) {
      try {
        return await fallback.generate(prompt, options);
      } catch (error) {
        throw new Error(`All providers failed. Last error (${this.fallbackName}): ${error.message}`);
      }
    }

    throw new Error('No image generation providers configured. Set NANOBANANA_API_KEY or OPENAI_API_KEY.');
  }

  /**
   * Apply text overlay to an image (headline + CTA)
   *
   * @param {Buffer} imageBuffer - Original image
   * @param {Object} overlaySpec
   * @param {string} overlaySpec.headline - Headline text
   * @param {string} [overlaySpec.subheadline] - Subheadline text
   * @param {string} [overlaySpec.cta] - CTA text
   * @param {Object} [overlaySpec.position] - { headline: 'top'|'center', cta: 'bottom' }
   * @param {Object} [overlaySpec.style] - { fontColor: '#FFF', bgColor: '#000', fontSize: 48 }
   * @returns {Promise<Buffer>} Image with overlay
   */
  async applyTextOverlay(imageBuffer, overlaySpec) {
    let sharp;
    try {
      sharp = require('sharp');
    } catch {
      // If sharp not available, return original image
      console.warn('sharp not installed. Returning image without text overlay.');
      return imageBuffer;
    }

    const image = sharp(imageBuffer);
    const meta = await image.metadata();
    const w = meta.width || 1024;
    const h = meta.height || 1024;

    const { headline, subheadline, cta } = overlaySpec;
    const fontColor = overlaySpec.style?.fontColor || '#FFFFFF';
    const bgColor = overlaySpec.style?.bgColor || 'rgba(0,0,0,0.6)';
    const fontSize = overlaySpec.style?.fontSize || Math.round(w * 0.045);

    // Build SVG overlay
    const svgParts = [];
    svgParts.push(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`);

    let yOffset = Math.round(h * 0.08);

    if (headline) {
      const boxH = fontSize * 2;
      svgParts.push(`<rect x="0" y="${yOffset - fontSize * 0.5}" width="${w}" height="${boxH}" fill="${bgColor}"/>`);
      svgParts.push(`<text x="${w / 2}" y="${yOffset + fontSize * 0.8}" font-size="${fontSize}" fill="${fontColor}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold">${this._escapeXml(headline)}</text>`);
      yOffset += boxH + 10;
    }

    if (subheadline) {
      const subSize = Math.round(fontSize * 0.7);
      svgParts.push(`<text x="${w / 2}" y="${yOffset + subSize}" font-size="${subSize}" fill="${fontColor}" text-anchor="middle" font-family="Arial, sans-serif">${this._escapeXml(subheadline)}</text>`);
    }

    if (cta) {
      const ctaY = Math.round(h * 0.88);
      const ctaFontSize = Math.round(fontSize * 0.85);
      const ctaPadding = 20;
      const ctaWidth = cta.length * ctaFontSize * 0.6 + ctaPadding * 2;
      const ctaHeight = ctaFontSize * 1.8;
      const ctaX = (w - ctaWidth) / 2;

      svgParts.push(`<rect x="${ctaX}" y="${ctaY}" width="${ctaWidth}" height="${ctaHeight}" rx="8" fill="#E53E3E"/>`);
      svgParts.push(`<text x="${w / 2}" y="${ctaY + ctaHeight * 0.65}" font-size="${ctaFontSize}" fill="#FFFFFF" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold">${this._escapeXml(cta)}</text>`);
    }

    svgParts.push('</svg>');

    const svgBuffer = Buffer.from(svgParts.join(''));

    return image
      .composite([{ input: svgBuffer, top: 0, left: 0 }])
      .png()
      .toBuffer();
  }

  /**
   * Save generated image to disk
   *
   * @param {Buffer} buffer - Image buffer
   * @param {string} outputPath - Full file path
   * @returns {Promise<string>} Saved file path
   */
  async saveImage(buffer, outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, buffer);
    return outputPath;
  }

  /**
   * Get available providers
   * @returns {string[]} Provider names
   */
  getAvailableProviders() {
    return Object.keys(this.providers);
  }

  /**
   * Escape XML special characters for SVG
   * @private
   */
  _escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

module.exports = {
  ImageGenerationService,
  ImageProvider,
  NanoBananaProvider,
  GptImageProvider,
};
