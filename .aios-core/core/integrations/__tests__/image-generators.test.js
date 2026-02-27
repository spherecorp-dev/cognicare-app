/**
 * Unit Tests: ImageGeneratorClient, GptImageProvider, Provider Stubs
 * Story 2.5: External API Integrations (AC1-AC4, AC7, AC9)
 */

const { GptImageProvider, DallEProvider, ConfigError } = require('../image-generators/providers/dall-e');
const { MidJourneyProvider } = require('../image-generators/providers/midjourney');
const { NanoBananaProvider } = require('../image-generators/providers/nanobanana');
const { FluxProvider } = require('../image-generators/providers/flux');
const { ImageGeneratorClient, FORBIDDEN_TERMS, PROVIDER_MAP } = require('../image-generators/client');
const { CircuitBreakerRegistry } = require('../../orchestration/squad-engine/circuit-breaker');
const { RetryHandler } = require('../../orchestration/squad-engine/retry-handler');
const { withGracefulDegradation, isSkippedResult } = require('../graceful-degradation');

// ─── Helpers ────────────────────────────────────────────────────────────────

function mockFetchSuccess(data = {}) {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      data: [{
        b64_json: 'dGVzdC1pbWFnZS1kYXRh', // base64 of "test-image-data"
      }],
      usage: { total_tokens: 5000, input_tokens: 200, output_tokens: 4800 },
      ...data,
    }),
  });
}

function mockFetchError(status, body = {}) {
  return jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ error: { message: `Error ${status}`, type: body.type || 'api_error' } }),
  });
}

function createClient(overrides = {}) {
  const breakerRegistry = new CircuitBreakerRegistry();
  const retryHandler = new RetryHandler();
  const fetchFn = overrides.fetchFn || mockFetchSuccess();

  return new ImageGeneratorClient({
    apiKeys: { 'dall-e': 'sk-test-key', ...overrides.apiKeys },
    breakerRegistry,
    retryHandler,
    runId: 'test-run-001',
    retryConfig: { max_attempts: 2, base_delay_ms: 10, strategy: 'fixed' },
    providerOptions: { fetchFn },
    ...overrides,
  });
}

// ─── ConfigError ────────────────────────────────────────────────────────────

describe('ConfigError', () => {
  it('should be an instance of Error with name ConfigError', () => {
    const error = new ConfigError('missing key');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ConfigError');
    expect(error.message).toBe('missing key');
  });
});

// ─── GptImageProvider ──────────────────────────────────────────────────────

describe('GptImageProvider', () => {
  it('should throw ConfigError if no API key', () => {
    expect(() => new GptImageProvider(null)).toThrow(ConfigError);
    expect(() => new GptImageProvider('')).toThrow(ConfigError);
  });

  it('should be aliased as DallEProvider for backward compat', () => {
    expect(DallEProvider).toBe(GptImageProvider);
  });

  it('should generate image successfully', async () => {
    const fetchFn = mockFetchSuccess();
    const provider = new GptImageProvider('sk-test', { fetchFn });

    const result = await provider.generate('A cute cat');

    expect(result).toEqual({
      b64_json: 'dGVzdC1pbWFnZS1kYXRh',
      provider: 'gpt-image',
      model: 'gpt-image-1.5',
      metadata: {
        size: '1024x1024',
        quality: 'high',
        usage: { total_tokens: 5000, input_tokens: 200, output_tokens: 4800 },
      },
    });

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.openai.com/v1/images/generations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer sk-test',
        }),
      }),
    );
  });

  it('should pass custom options (size, quality, model)', async () => {
    const fetchFn = mockFetchSuccess();
    const provider = new GptImageProvider('sk-test', { fetchFn });

    await provider.generate('prompt', { size: '1536x1024', quality: 'medium', model: 'gpt-image-1' });

    const body = JSON.parse(fetchFn.mock.calls[0][1].body);
    expect(body.size).toBe('1536x1024');
    expect(body.quality).toBe('medium');
    expect(body.model).toBe('gpt-image-1');
    expect(body.output_format).toBe('png');
  });

  it('should send output_format parameter', async () => {
    const fetchFn = mockFetchSuccess();
    const provider = new GptImageProvider('sk-test', { fetchFn });

    await provider.generate('prompt', { output_format: 'jpeg' });

    const body = JSON.parse(fetchFn.mock.calls[0][1].body);
    expect(body.output_format).toBe('jpeg');
  });

  it('should throw on rate limit (429)', async () => {
    const fetchFn = mockFetchError(429);
    const provider = new GptImageProvider('sk-test', { fetchFn });

    await expect(provider.generate('prompt')).rejects.toThrow('Error 429');
  });

  it('should throw on content policy (400) with errorType', async () => {
    const fetchFn = mockFetchError(400, { type: 'content_policy_violation' });
    const provider = new GptImageProvider('sk-test', { fetchFn });

    try {
      await provider.generate('bad prompt');
      throw new Error('Should have thrown');
    } catch (error) {
      expect(error.statusCode).toBe(400);
      expect(error.errorType).toBe('content_policy_violation');
    }
  });

  it('should handle non-JSON error response', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error('not json'); },
    });
    const provider = new GptImageProvider('sk-test', { fetchFn });

    await expect(provider.generate('prompt')).rejects.toThrow('GPT Image API error: 500');
  });
});

// ─── Stub Providers ─────────────────────────────────────────────────────────

describe('Stub Providers', () => {
  describe('MidJourneyProvider', () => {
    it('should throw ConfigError if no API key', () => {
      expect(() => new MidJourneyProvider()).toThrow(ConfigError);
    });

    it('should throw "not yet implemented" on generate', async () => {
      const provider = new MidJourneyProvider('mj-test');
      await expect(provider.generate('prompt')).rejects.toThrow('not yet implemented');
    });

    it('should have correct name and model', () => {
      const provider = new MidJourneyProvider('mj-test');
      expect(provider.name).toBe('midjourney');
      expect(provider.model).toBe('midjourney-v6');
    });
  });

  describe('NanoBananaProvider', () => {
    it('should throw ConfigError if no API key', () => {
      expect(() => new NanoBananaProvider()).toThrow(ConfigError);
    });

    it('should throw "not yet implemented" on generate', async () => {
      const provider = new NanoBananaProvider('nb-test');
      await expect(provider.generate('prompt')).rejects.toThrow('not yet implemented');
    });
  });

  describe('FluxProvider', () => {
    it('should throw ConfigError if no API key', () => {
      expect(() => new FluxProvider()).toThrow(ConfigError);
    });

    it('should throw "not yet implemented" on generate', async () => {
      const provider = new FluxProvider('flux-test');
      await expect(provider.generate('prompt')).rejects.toThrow('not yet implemented');
    });
  });
});

// ─── PROVIDER_MAP & FORBIDDEN_TERMS ─────────────────────────────────────────

describe('PROVIDER_MAP', () => {
  it('should map gpt-image and dall-e alias to GptImageProvider', () => {
    expect(PROVIDER_MAP['gpt-image']).toBe(GptImageProvider);
    expect(PROVIDER_MAP['dall-e']).toBe(GptImageProvider);
  });

  it('should map all other providers', () => {
    expect(PROVIDER_MAP['midjourney']).toBe(MidJourneyProvider);
    expect(PROVIDER_MAP['nanobanana']).toBe(NanoBananaProvider);
    expect(PROVIDER_MAP['flux']).toBe(FluxProvider);
  });
});

describe('FORBIDDEN_TERMS', () => {
  it('should contain expected content policy terms', () => {
    expect(FORBIDDEN_TERMS).toContain('violence');
    expect(FORBIDDEN_TERMS).toContain('nsfw');
    expect(FORBIDDEN_TERMS).toContain('hate');
    expect(FORBIDDEN_TERMS.length).toBeGreaterThanOrEqual(5);
  });
});

// ─── ImageGeneratorClient ───────────────────────────────────────────────────

describe('ImageGeneratorClient', () => {
  describe('constructor', () => {
    it('should initialize with default dependencies', () => {
      const client = new ImageGeneratorClient({
        apiKeys: { 'dall-e': 'sk-test' },
        providerOptions: { fetchFn: jest.fn() },
      });
      expect(client.getAvailableProviders()).toEqual(['dall-e']);
    });

    it('should only initialize providers with available keys', () => {
      const client = new ImageGeneratorClient({
        apiKeys: { 'dall-e': 'sk-test', 'midjourney': '', 'flux': 'flux-key' },
        providerOptions: { fetchFn: jest.fn() },
      });
      expect(client.getAvailableProviders()).toEqual(['dall-e', 'flux']);
    });

    it('should skip unknown providers', () => {
      const client = new ImageGeneratorClient({
        apiKeys: { 'dall-e': 'sk-test', 'unknown': 'key' },
        providerOptions: { fetchFn: jest.fn() },
      });
      expect(client.getAvailableProviders()).toEqual(['dall-e']);
    });
  });

  describe('generate()', () => {
    it('should generate image via specified provider', async () => {
      const client = createClient();
      const result = await client.generate('dall-e', 'A cute cat');

      expect(result.b64_json).toBe('dGVzdC1pbWFnZS1kYXRh');
      expect(result.provider).toBe('gpt-image');
    });

    it('should throw ConfigError for unavailable provider', async () => {
      const client = createClient();

      await expect(client.generate('midjourney', 'prompt'))
        .rejects.toThrow(ConfigError);
    });

    it('should use circuit breaker per provider', async () => {
      const breakerRegistry = new CircuitBreakerRegistry();
      const getOrCreateSpy = jest.spyOn(breakerRegistry, 'getOrCreate');

      const client = createClient({ breakerRegistry });
      await client.generate('dall-e', 'prompt');

      expect(getOrCreateSpy).toHaveBeenCalledWith('img-dall-e', expect.any(Object));
      getOrCreateSpy.mockRestore();
    });

    it('should retry on transient errors', async () => {
      let callCount = 0;
      const fetchFn = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { ok: false, status: 429, json: async () => ({ error: { message: 'Rate limit', type: 'rate_limit' } }) };
        }
        return {
          ok: true,
          json: async () => ({
            data: [{ b64_json: 'dGVzdA==' }],
            usage: { total_tokens: 100 },
          }),
        };
      });

      const client = createClient({ fetchFn });
      const result = await client.generate('dall-e', 'prompt');

      expect(result.b64_json).toBe('dGVzdA==');
      expect(callCount).toBe(2);
    });
  });

  describe('sanitizePrompt()', () => {
    it('should remove forbidden terms', () => {
      const client = createClient();
      const result = client.sanitizePrompt('A scene with violence and gore in the background');

      expect(result).not.toContain('violence');
      expect(result).not.toContain('gore');
      expect(result).toContain('scene');
      expect(result).toContain('background');
    });

    it('should collapse extra whitespace', () => {
      const client = createClient();
      const result = client.sanitizePrompt('word1  violence  word2');
      expect(result).toBe('word1 word2');
    });

    it('should return unchanged if no forbidden terms', () => {
      const client = createClient();
      const result = client.sanitizePrompt('A beautiful sunset over the ocean');
      expect(result).toBe('A beautiful sunset over the ocean');
    });
  });

  describe('generateWithFallback()', () => {
    it('should return result from first successful provider', async () => {
      const client = createClient({
        apiKeys: { 'dall-e': 'sk-test', 'flux': 'flux-key' },
      });
      const result = await client.generateWithFallback(['dall-e', 'flux'], 'prompt');

      expect(result.provider).toBe('gpt-image');
    });

    it('should fall back to secondary provider on primary failure', async () => {
      const fetchFn = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Server Error' } }),
      });

      const client = createClient({
        fetchFn,
        apiKeys: { 'dall-e': 'sk-test' },
      });

      // Manually inject a mock secondary provider that succeeds
      client.providers['mock-secondary'] = {
        generate: jest.fn().mockResolvedValue({
          b64_json: 'c2Vjb25kYXJ5',
          provider: 'mock-secondary',
          model: 'mock-v1',
          metadata: {},
        }),
      };

      const result = await client.generateWithFallback(['dall-e', 'mock-secondary'], 'prompt');
      expect(result.b64_json).toBe('c2Vjb25kYXJ5');
      expect(result.provider).toBe('mock-secondary');
    });

    it('should throw all_providers_failed if all fail', async () => {
      const fetchFn = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Server Error' } }),
      });

      const client = createClient({
        fetchFn,
        apiKeys: { 'dall-e': 'sk-test', 'flux': 'flux-key' },
      });

      try {
        await client.generateWithFallback(['dall-e', 'flux'], 'prompt');
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error.errorType).toBe('all_providers_failed');
        expect(error.providers).toHaveLength(2);
        expect(error.providers[0].provider).toBe('dall-e');
        expect(error.providers[1].provider).toBe('flux');
      }
    });
  });

  describe('graceful degradation integration', () => {
    it('should return skip marker when all providers fail', async () => {
      const fetchFn = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Server Error' } }),
      });

      const client = createClient({
        fetchFn,
        apiKeys: { 'dall-e': 'sk-test' },
      });

      const result = await withGracefulDegradation(
        () => client.generateWithFallback(['dall-e'], 'prompt'),
        { stepId: 'test-step', enabled: true }
      );

      expect(isSkippedResult(result)).toBe(true);
      expect(result.__skipped).toBe(true);
      expect(result.reason).toBe('all_retries_exhausted');
    });

    it('should throw when graceful degradation is disabled', async () => {
      const fetchFn = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Server Error' } }),
      });

      const client = createClient({
        fetchFn,
        apiKeys: { 'dall-e': 'sk-test' },
      });

      await expect(
        withGracefulDegradation(
          () => client.generateWithFallback(['dall-e'], 'prompt'),
          { stepId: 'test-step', enabled: false }
        )
      ).rejects.toThrow();
    });
  });

  describe('error logging', () => {
    it('should not throw when errorLogger fails', async () => {
      const errorLogger = { log: jest.fn().mockImplementation(() => { throw new Error('log fail'); }) };
      const fetchFn = mockFetchError(500);

      const client = createClient({ fetchFn, errorLogger });

      // Should still throw the API error, not the logger error
      await expect(client.generate('dall-e', 'prompt')).rejects.toThrow();
    });
  });
});
