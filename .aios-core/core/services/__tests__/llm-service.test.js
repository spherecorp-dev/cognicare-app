/**
 * LLM Service Tests
 *
 * Tests for: auto-continuation, batch execution, JSON parsing, truncation repair
 */

const { LLMService, DEFAULTS } = require('../llm-service');

// Helper: create service with mocked client
function createMockService(mockCreate) {
  const service = new LLMService({ apiKey: 'test-key' });
  service.client = { messages: { create: mockCreate, stream: vi.fn() } };
  return service;
}

describe('LLMService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Constructor ─────────────────────────────────────────
  describe('constructor', () => {
    it('throws without API key', () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      try {
        expect(() => new LLMService()).toThrow('ANTHROPIC_API_KEY is required');
      } finally {
        process.env.ANTHROPIC_API_KEY = originalKey;
      }
    });

    it('uses defaults', () => {
      const service = new LLMService({ apiKey: 'test-key' });
      expect(service.model).toBe(DEFAULTS.model);
      expect(service.maxTokens).toBe(DEFAULTS.maxTokens);
      expect(service.temperature).toBe(DEFAULTS.temperature);
    });

    it('accepts overrides', () => {
      const svc = new LLMService({ apiKey: 'k', model: 'custom', maxTokens: 1000, temperature: 0.2 });
      expect(svc.model).toBe('custom');
      expect(svc.maxTokens).toBe(1000);
      expect(svc.temperature).toBe(0.2);
    });
  });

  // ─── execute() — basic ───────────────────────────────────
  describe('execute()', () => {
    it('returns parsed JSON on end_turn', async () => {
      const mockCreate = vi.fn().mockResolvedValueOnce({
        content: [{ type: 'text', text: '{"result": "ok"}' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        model: 'test-model',
        stop_reason: 'end_turn',
      });
      const service = createMockService(mockCreate);

      const res = await service.execute({
        systemPrompt: 'You are a test agent',
        taskInstructions: 'Do something',
        input: { foo: 1 },
      });

      expect(res.output).toEqual({ result: 'ok' });
      expect(res.continuations).toBe(0);
      expect(res.stopReason).toBe('end_turn');
    });

    it('returns text format as-is', async () => {
      const mockCreate = vi.fn().mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Hello world' }],
        usage: { input_tokens: 5, output_tokens: 3 },
        model: 'test-model',
        stop_reason: 'end_turn',
      });
      const service = createMockService(mockCreate);

      const res = await service.execute({
        systemPrompt: 'Agent',
        taskInstructions: 'Say hi',
        input: null,
        outputFormat: 'text',
      });

      expect(res.output).toBe('Hello world');
    });
  });

  // ─── execute() — auto-continuation ────────────────────────
  describe('auto-continuation', () => {
    it('continues when stop_reason is max_tokens', async () => {
      const mockCreate = vi.fn()
        // First call: truncated
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: '{"creatives": [{"id": 1, "name": "Ad 1"}, {"id": 2, "name": "Ad 2"}' }],
          usage: { input_tokens: 100, output_tokens: 4096 },
          model: 'test-model',
          stop_reason: 'max_tokens',
        })
        // Second call: continuation completes
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: ', {"id": 3, "name": "Ad 3"}]}' }],
          usage: { input_tokens: 200, output_tokens: 50 },
          model: 'test-model',
          stop_reason: 'end_turn',
        });
      const service = createMockService(mockCreate);

      const res = await service.execute({
        systemPrompt: 'Agent',
        taskInstructions: 'Generate creatives',
        input: {},
      });

      expect(res.continuations).toBe(1);
      expect(res.output.creatives).toHaveLength(3);
      expect(res.usage.input_tokens).toBe(300);
      expect(res.usage.output_tokens).toBe(4146);
      expect(mockCreate).toHaveBeenCalledTimes(2);

      // Verify continuation message
      const secondCall = mockCreate.mock.calls[1][0];
      expect(secondCall.messages).toHaveLength(3);
      expect(secondCall.messages[2].role).toBe('user');
      expect(secondCall.messages[2].content).toContain('CONTINUE OUTPUT');
    });

    it('respects maxContinuations limit', async () => {
      const mockCreate = vi.fn();
      // Always return truncated
      for (let i = 0; i < 4; i++) {
        mockCreate.mockResolvedValueOnce({
          content: [{ type: 'text', text: `"chunk${i}",` }],
          usage: { input_tokens: 10, output_tokens: 10 },
          model: 'test-model',
          stop_reason: 'max_tokens',
        });
      }
      const service = createMockService(mockCreate);

      const res = await service.execute({
        systemPrompt: 'Agent',
        taskInstructions: 'Do',
        input: {},
        maxContinuations: 3,
        outputFormat: 'text',
      });

      // 1 initial + 3 continuations = 4 calls
      expect(mockCreate).toHaveBeenCalledTimes(4);
      expect(res.continuations).toBe(3);
    });

    it('skips continuation when autoContinue is false', async () => {
      const mockCreate = vi.fn().mockResolvedValueOnce({
        content: [{ type: 'text', text: '{"partial": true' }],
        usage: { input_tokens: 10, output_tokens: 4096 },
        model: 'test-model',
        stop_reason: 'max_tokens',
      });
      const service = createMockService(mockCreate);

      const res = await service.execute({
        systemPrompt: 'Agent',
        taskInstructions: 'Do',
        input: {},
        autoContinue: false,
      });

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(res.continuations).toBe(0);
    });

    it('accumulates text across multiple continuations', async () => {
      const mockCreate = vi.fn()
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: '{"items": [1, 2, 3,' }],
          usage: { input_tokens: 10, output_tokens: 100 },
          model: 'test-model',
          stop_reason: 'max_tokens',
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: ' 4, 5, 6,' }],
          usage: { input_tokens: 20, output_tokens: 100 },
          model: 'test-model',
          stop_reason: 'max_tokens',
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: ' 7, 8, 9]}' }],
          usage: { input_tokens: 30, output_tokens: 50 },
          model: 'test-model',
          stop_reason: 'end_turn',
        });
      const service = createMockService(mockCreate);

      const res = await service.execute({
        systemPrompt: 'Agent',
        taskInstructions: 'Generate items',
        input: {},
      });

      expect(res.continuations).toBe(2);
      expect(res.output.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(res.usage.input_tokens).toBe(60);
      expect(res.usage.output_tokens).toBe(250);
    });
  });

  // ─── executeBatch() ──────────────────────────────────────
  describe('executeBatch()', () => {
    it('splits items into chunks and merges results', async () => {
      // 25 items, chunk size 10 = 3 chunks (10, 10, 5)
      const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));

      const mockCreate = vi.fn();
      for (let chunk = 0; chunk < 3; chunk++) {
        const count = chunk < 2 ? 10 : 5;
        const results = Array.from({ length: count }, (_, i) => ({
          id: chunk * 10 + i + 1,
          creative: `Ad ${chunk * 10 + i + 1}`,
        }));

        mockCreate.mockResolvedValueOnce({
          content: [{ type: 'text', text: JSON.stringify({ results }) }],
          usage: { input_tokens: 100, output_tokens: 200 },
          model: 'test-model',
          stop_reason: 'end_turn',
        });
      }
      const service = createMockService(mockCreate);

      const res = await service.executeBatch({
        systemPrompt: 'Creative agent',
        taskInstructions: 'Generate ads for each item',
        items,
        chunkSize: 10,
        concurrency: 3,
      });

      expect(res.chunks).toBe(3);
      expect(res.totalItems).toBe(25);
      expect(res.processedItems).toBe(25);
      expect(res.output).toHaveLength(25);
      expect(res.output[0].id).toBe(1);
      expect(res.output[24].id).toBe(25);
      expect(res.errors).toHaveLength(0);
    });

    it('handles empty items array', async () => {
      const service = new LLMService({ apiKey: 'test-key' });

      const res = await service.executeBatch({
        systemPrompt: 'Agent',
        taskInstructions: 'Do',
        items: [],
      });

      expect(res.output).toEqual([]);
      expect(res.chunks).toBe(0);
    });

    it('handles chunk failures gracefully', async () => {
      const items = Array.from({ length: 20 }, (_, i) => ({ id: i + 1 }));

      const mockCreate = vi.fn()
        // Chunk 1: success
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: JSON.stringify([{ id: 1 }, { id: 2 }]) }],
          usage: { input_tokens: 10, output_tokens: 20 },
          model: 'test-model',
          stop_reason: 'end_turn',
        })
        // Chunk 2: API error
        .mockRejectedValueOnce(new Error('Rate limited'));
      const service = createMockService(mockCreate);

      const res = await service.executeBatch({
        systemPrompt: 'Agent',
        taskInstructions: 'Do',
        items,
        chunkSize: 10,
        concurrency: 2,
      });

      expect(res.chunks).toBe(2);
      expect(res.errors).toHaveLength(1);
      expect(res.errors[0].error).toBe('Rate limited');
      expect(res.output).toHaveLength(2); // Only chunk 1 results
    });

    it('uses resultKey to extract from response', async () => {
      const items = [{ name: 'Ad1' }, { name: 'Ad2' }];

      const mockCreate = vi.fn().mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify({ creatives: [{ headline: 'H1' }, { headline: 'H2' }], metadata: {} }) }],
        usage: { input_tokens: 10, output_tokens: 20 },
        model: 'test-model',
        stop_reason: 'end_turn',
      });
      const service = createMockService(mockCreate);

      const res = await service.executeBatch({
        systemPrompt: 'Agent',
        taskInstructions: 'Generate creatives',
        items,
        resultKey: 'creatives',
        chunkSize: 10,
      });

      expect(res.output).toHaveLength(2);
      expect(res.output[0].headline).toBe('H1');
    });

    it('includes sharedContext in each chunk input', async () => {
      const items = [{ id: 1 }];

      const mockCreate = vi.fn().mockResolvedValueOnce({
        content: [{ type: 'text', text: '[]' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        model: 'test-model',
        stop_reason: 'end_turn',
      });
      const service = createMockService(mockCreate);

      await service.executeBatch({
        systemPrompt: 'Agent',
        taskInstructions: 'Do',
        items,
        sharedContext: { offerId: 'MEMFR02', platform: 'meta' },
      });

      const callInput = mockCreate.mock.calls[0][0].messages[0].content;
      expect(callInput).toContain('MEMFR02');
      expect(callInput).toContain('meta');
    });

    it('auto-detects array key when resultKey not set', async () => {
      const items = [{ id: 1 }];

      const mockCreate = vi.fn().mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify({ summary: 'ok', ads: [{ h: 'A' }, { h: 'B' }] }) }],
        usage: { input_tokens: 10, output_tokens: 20 },
        model: 'test-model',
        stop_reason: 'end_turn',
      });
      const service = createMockService(mockCreate);

      const res = await service.executeBatch({
        systemPrompt: 'Agent',
        taskInstructions: 'Do',
        items,
      });

      expect(res.output).toHaveLength(2);
      expect(res.output[0].h).toBe('A');
    });
  });

  // ─── _parseJSON ──────────────────────────────────────────
  describe('_parseJSON()', () => {
    let service;
    beforeEach(() => {
      service = new LLMService({ apiKey: 'test-key' });
    });

    it('parses raw JSON', () => {
      expect(service._parseJSON('{"a":1}')).toEqual({ a: 1 });
    });

    it('strips markdown fences', () => {
      expect(service._parseJSON('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    });

    it('handles fence without closing (truncated)', () => {
      const result = service._parseJSON('```json\n{"a":1}');
      expect(result).toEqual({ a: 1 });
    });

    it('extracts JSON from surrounding text', () => {
      expect(service._parseJSON('Here is the result: {"a":1} done')).toEqual({ a: 1 });
    });

    it('handles arrays', () => {
      expect(service._parseJSON('[1, 2, 3]')).toEqual([1, 2, 3]);
    });

    it('returns _parseError on total failure', () => {
      const result = service._parseJSON('this is not json at all');
      expect(result._parseError).toBe(true);
      expect(result._raw).toBeDefined();
    });

    it('handles large fenced JSON with nested structures', () => {
      const big = JSON.stringify({
        creatives: Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          headline: `Headline ${i}`,
          body: `Body text for creative ${i}`,
        })),
      });
      expect(service._parseJSON('```json\n' + big + '\n```').creatives).toHaveLength(50);
    });
  });

  // ─── _repairTruncatedJSON ─────────────────────────────────
  describe('_repairTruncatedJSON()', () => {
    let service;
    beforeEach(() => {
      service = new LLMService({ apiKey: 'test-key' });
    });

    it('closes unclosed braces', () => {
      const result = service._repairTruncatedJSON('{"a": 1, "b": {"c": 2}');
      expect(result).toEqual({ a: 1, b: { c: 2 } });
    });

    it('closes unclosed brackets', () => {
      const result = service._repairTruncatedJSON('[1, 2, 3');
      expect(result).toEqual([1, 2, 3]);
    });

    it('handles trailing comma', () => {
      const result = service._repairTruncatedJSON('{"items": [1, 2,');
      expect(result).toEqual({ items: [1, 2] });
    });

    it('returns null on unrepairable text', () => {
      expect(service._repairTruncatedJSON('"just a string')).toBeNull();
    });
  });

  // ─── _buildSystemPrompt ──────────────────────────────────
  describe('_buildSystemPrompt()', () => {
    let service;
    beforeEach(() => {
      service = new LLMService({ apiKey: 'test-key' });
    });

    it('appends JSON instruction for json format', () => {
      const result = service._buildSystemPrompt('You are an agent', 'json');
      expect(result).toContain('valid JSON only');
    });

    it('appends YAML instruction for yaml format', () => {
      const result = service._buildSystemPrompt('Agent', 'yaml');
      expect(result).toContain('valid YAML only');
    });

    it('returns persona as-is for text format', () => {
      const result = service._buildSystemPrompt('Agent', 'text');
      expect(result).toBe('Agent');
    });
  });
});
