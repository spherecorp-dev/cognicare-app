/**
 * Unit Tests: WhisperClient
 * Story 2.5: External API Integrations (AC5)
 */

const { WhisperClient } = require('../whisper/client');
const { ConfigError } = require('../image-generators/providers/dall-e');
const { CircuitBreakerRegistry } = require('../../orchestration/squad-engine/circuit-breaker');
const { RetryHandler } = require('../../orchestration/squad-engine/retry-handler');
const { withGracefulDegradation, isSkippedResult } = require('../graceful-degradation');

// ─── Helpers ────────────────────────────────────────────────────────────────

function mockFetchSuccess(data = {}) {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      text: 'Hello world',
      language: 'en',
      duration: 12.5,
      segments: [{ id: 0, text: 'Hello world', start: 0, end: 12.5 }],
      ...data,
    }),
  });
}

function mockFetchError(status) {
  return jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ error: { message: `Error ${status}` } }),
  });
}

/**
 * Creates a fast RetryHandler that overrides delay to 0ms for tests.
 */
function createFastRetryHandler() {
  const handler = new RetryHandler();
  const originalRetry = handler.retryWithBackoff.bind(handler);
  handler.retryWithBackoff = (fn, config) => {
    return originalRetry(fn, { ...config, base_delay_ms: 1, strategy: 'fixed' });
  };
  return handler;
}

function createClient(overrides = {}) {
  return new WhisperClient({
    apiKey: 'sk-test-key',
    breakerRegistry: new CircuitBreakerRegistry(),
    retryHandler: overrides.retryHandler || createFastRetryHandler(),
    runId: 'test-run-001',
    fetchFn: overrides.fetchFn || mockFetchSuccess(),
    readFileFn: overrides.readFileFn || (() => Buffer.from('fake-audio-data')),
    ...overrides,
  });
}

// ─── WhisperClient ──────────────────────────────────────────────────────────

describe('WhisperClient', () => {
  describe('constructor', () => {
    it('should throw ConfigError if no API key', () => {
      expect(() => new WhisperClient({})).toThrow(ConfigError);
      expect(() => new WhisperClient({ apiKey: '' })).toThrow(ConfigError);
    });

    it('should initialize with default values', () => {
      const client = createClient();
      expect(client.name).toBe('whisper');
      expect(client.model).toBe('whisper-1');
    });
  });

  describe('transcribe()', () => {
    it('should transcribe audio file successfully', async () => {
      const fetchFn = mockFetchSuccess();
      const client = createClient({ fetchFn });

      const result = await client.transcribe('/path/to/audio.mp3');

      expect(result).toEqual({
        text: 'Hello world',
        language: 'en',
        duration_seconds: 12.5,
        segments: [{ id: 0, text: 'Hello world', start: 0, end: 12.5 }],
      });

      expect(fetchFn).toHaveBeenCalledWith(
        'https://api.openai.com/v1/audio/transcriptions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-test-key',
          }),
        }),
      );
    });

    it('should pass language option when specified', async () => {
      const fetchFn = mockFetchSuccess({ language: 'fr' });
      const client = createClient({ fetchFn });

      const result = await client.transcribe('/path/to/audio.mp3', { language: 'fr' });
      expect(result.language).toBe('fr');
    });

    it('should default to auto-detect when no language in response', async () => {
      const fetchFn = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          text: 'Hola mundo',
          duration: 5,
          segments: [],
        }),
      });
      const client = createClient({ fetchFn });

      const result = await client.transcribe('/path/to/audio.mp3');
      expect(result.language).toBe('auto');
    });

    it('should throw on API error (500)', async () => {
      const fetchFn = mockFetchError(500);
      const client = createClient({ fetchFn });

      await expect(client.transcribe('/path/to/audio.mp3')).rejects.toThrow();
    });

    it('should handle rate limit (429) with retry', async () => {
      let callCount = 0;
      const fetchFn = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { ok: false, status: 429, json: async () => ({ error: { message: 'Rate limit' } }) };
        }
        return {
          ok: true,
          json: async () => ({ text: 'Success after retry', language: 'en', duration: 10, segments: [] }),
        };
      });

      const client = createClient({ fetchFn });
      const result = await client.transcribe('/path/to/audio.mp3');

      expect(result.text).toBe('Success after retry');
      expect(callCount).toBe(2);
    });

    it('should use circuit breaker', async () => {
      const breakerRegistry = new CircuitBreakerRegistry();
      const getOrCreateSpy = jest.spyOn(breakerRegistry, 'getOrCreate');

      const client = createClient({ breakerRegistry });
      await client.transcribe('/path/to/audio.mp3');

      expect(getOrCreateSpy).toHaveBeenCalledWith('whisper', expect.any(Object));
      getOrCreateSpy.mockRestore();
    });

    it('should handle timeout with AbortError', async () => {
      const fetchFn = jest.fn().mockImplementation(async (url, opts) => {
        // Simulate abort signal being triggered
        const abortError = new Error('The operation was aborted');
        abortError.name = 'AbortError';
        throw abortError;
      });

      const client = createClient({ fetchFn });

      await expect(client.transcribe('/path/to/audio.mp3', { timeout: 100 }))
        .rejects.toThrow();
    });

    it('should read file using readFileFn', async () => {
      const readFileFn = jest.fn().mockReturnValue(Buffer.from('audio-bytes'));
      const client = createClient({ readFileFn });

      await client.transcribe('/path/to/audio.mp3');

      expect(readFileFn).toHaveBeenCalledWith('/path/to/audio.mp3');
    });

    it('should handle non-JSON error response', async () => {
      const fetchFn = jest.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => { throw new Error('not json'); },
      });
      const client = createClient({ fetchFn });

      await expect(client.transcribe('/path/to/audio.mp3')).rejects.toThrow('Whisper API error: 502');
    });
  });

  describe('graceful degradation', () => {
    it('should return skip marker when all retries fail', async () => {
      const fetchFn = mockFetchError(500);
      const client = createClient({ fetchFn });

      const result = await withGracefulDegradation(
        () => client.transcribe('/path/to/audio.mp3'),
        { stepId: 'whisper-step', enabled: true }
      );

      expect(isSkippedResult(result)).toBe(true);
      expect(result.__skipped).toBe(true);
    });
  });

  describe('error logging', () => {
    it('should log errors to errorLogger', async () => {
      const errorLogger = { log: jest.fn() };
      const fetchFn = mockFetchError(500);

      const client = createClient({ fetchFn, errorLogger });

      await expect(client.transcribe('/path/to/audio.mp3')).rejects.toThrow();

      expect(errorLogger.log).toHaveBeenCalledWith('test-run-001', expect.objectContaining({
        provider: 'whisper',
        error_type: 'api_error',
        status_code: 500,
      }));
    });

    it('should not throw when errorLogger fails', async () => {
      const errorLogger = { log: jest.fn().mockImplementation(() => { throw new Error('log fail'); }) };
      const fetchFn = mockFetchError(500);

      const client = createClient({ fetchFn, errorLogger });

      // Should still throw the API error, not the logger error
      await expect(client.transcribe('/path/to/audio.mp3')).rejects.toThrow('Error 500');
    });
  });
});
