/**
 * LLM Service — Core AI Communication Layer
 *
 * Reusable service that calls Claude API with persona + task instructions + input
 * and returns structured JSON output.
 *
 * Used by: AgentInvoker, Jarvis workflows, squad task executors
 *
 * @module core/services/llm-service
 * @version 1.0.0
 */

const Anthropic = require('@anthropic-ai/sdk').default;

/**
 * Default configuration
 */
const DEFAULTS = {
  model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
  maxTokens: 8192,
  temperature: 0.7,
  maxContinuations: 5,
  batchChunkSize: 10,
  batchConcurrency: 3,
};

/**
 * LLM Service — calls Claude with structured prompts, returns parsed output
 */
class LLMService {
  /**
   * @param {Object} options
   * @param {string} [options.apiKey] - Anthropic API key (falls back to env)
   * @param {string} [options.model] - Model ID
   * @param {number} [options.maxTokens] - Max tokens for response
   * @param {number} [options.temperature] - Temperature for generation
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required. Set via env or constructor options.');
    }

    this.model = options.model || DEFAULTS.model;
    this.maxTokens = options.maxTokens || DEFAULTS.maxTokens;
    this.temperature = options.temperature ?? DEFAULTS.temperature;

    this.client = new Anthropic({ apiKey: this.apiKey });
  }

  /**
   * Execute an LLM call with persona + task + input → structured output.
   * Auto-continues when response is truncated (stop_reason === 'max_tokens').
   *
   * @param {Object} params
   * @param {string} params.systemPrompt - Agent persona / system instructions
   * @param {string} params.taskInstructions - Task-specific instructions (.md content)
   * @param {Object|string} params.input - Input data for the task
   * @param {string} [params.outputFormat='json'] - Expected output format: 'json', 'yaml', 'text'
   * @param {number} [params.maxTokens] - Override max tokens for this call
   * @param {number} [params.temperature] - Override temperature for this call
   * @param {boolean} [params.autoContinue=true] - Auto-continue on truncation
   * @param {number} [params.maxContinuations] - Max continuation rounds (default: 5)
   * @returns {Promise<{output: any, rawText: string, usage: Object, model: string, continuations: number}>}
   */
  async execute({ systemPrompt, taskInstructions, input, outputFormat = 'json', maxTokens, temperature, autoContinue = true, maxContinuations }) {
    const system = this._buildSystemPrompt(systemPrompt, outputFormat);
    const userMessage = this._buildUserMessage(taskInstructions, input, outputFormat);
    const effectiveMaxTokens = maxTokens || this.maxTokens;
    const maxRounds = maxContinuations || DEFAULTS.maxContinuations;

    const messages = [{ role: 'user', content: userMessage }];
    let fullText = '';
    let totalUsage = { input_tokens: 0, output_tokens: 0 };
    let lastResponse = null;
    let continuations = 0;

    // Initial call + auto-continuation loop
    for (let round = 0; round <= maxRounds; round++) {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: effectiveMaxTokens,
        temperature: temperature ?? this.temperature,
        system,
        messages,
      });

      const chunkText = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('');

      fullText += chunkText;
      totalUsage.input_tokens += response.usage?.input_tokens || 0;
      totalUsage.output_tokens += response.usage?.output_tokens || 0;
      lastResponse = response;

      // If response completed naturally or auto-continue is disabled, stop
      if (response.stop_reason !== 'max_tokens' || !autoContinue || round === maxRounds) {
        break;
      }

      // Truncated — request continuation
      continuations++;
      console.warn(`[LLMService] Response truncated (round ${round + 1}/${maxRounds}), requesting continuation...`);

      // Add assistant's partial response + continuation request to messages
      messages.push({ role: 'assistant', content: chunkText });
      messages.push({ role: 'user', content: 'CONTINUE OUTPUT: Your previous response was cut off mid-output. Continue the raw JSON/text EXACTLY from the character where it stopped. Rules: (1) NO preamble, NO explanation, NO "here is the continuation" text. (2) Do NOT repeat any content already produced. (3) Start your response with the very next character of the output.' });
    }

    if (continuations > 0) {
      console.warn(`[LLMService] Completed after ${continuations} continuation(s). Total tokens: ${totalUsage.output_tokens}`);

      // Clean continuation artifacts before parsing
      if (outputFormat === 'json') {
        fullText = this._cleanContinuationArtifacts(fullText);
      }
    }

    const output = this.parseStructuredOutput(fullText, outputFormat);

    return {
      output,
      rawText: fullText,
      usage: totalUsage,
      model: lastResponse?.model,
      stopReason: lastResponse?.stop_reason,
      continuations,
    };
  }

  /**
   * Execute in batch mode — splits large input arrays into chunks,
   * processes in parallel, and merges results.
   *
   * Use for: generating 50+ creatives, bulk analysis, mass production tasks.
   *
   * @param {Object} params
   * @param {string} params.systemPrompt - Agent persona / system instructions
   * @param {string} params.taskInstructions - Task-specific instructions (.md content)
   * @param {Array} params.items - Array of items to process
   * @param {number} [params.chunkSize] - Items per chunk (default: 10)
   * @param {number} [params.concurrency] - Parallel chunks (default: 3)
   * @param {string} [params.outputFormat='json'] - Expected output format
   * @param {string} [params.itemKey='items'] - Key name for items in input
   * @param {string} [params.resultKey] - Key to extract from each chunk result (auto-detected if not set)
   * @param {Object} [params.sharedContext] - Context shared across all chunks (offer data, etc.)
   * @param {number} [params.maxTokens] - Override max tokens per chunk
   * @param {number} [params.temperature] - Override temperature
   * @returns {Promise<{output: any, chunks: number, totalItems: number, usage: Object, errors: Array}>}
   */
  async executeBatch({ systemPrompt, taskInstructions, items, chunkSize, concurrency, outputFormat = 'json', itemKey = 'items', resultKey, sharedContext = {}, maxTokens, temperature }) {
    if (!Array.isArray(items) || items.length === 0) {
      return { output: [], chunks: 0, totalItems: 0, usage: { input_tokens: 0, output_tokens: 0 }, errors: [] };
    }

    const effectiveChunkSize = chunkSize || DEFAULTS.batchChunkSize;
    const effectiveConcurrency = concurrency || DEFAULTS.batchConcurrency;

    // Split into chunks
    const chunks = [];
    for (let i = 0; i < items.length; i += effectiveChunkSize) {
      chunks.push(items.slice(i, i + effectiveChunkSize));
    }

    console.warn(`[LLMService] Batch: ${items.length} items → ${chunks.length} chunks (size=${effectiveChunkSize}, concurrency=${effectiveConcurrency})`);

    // Enhance task instructions for chunked execution
    const chunkInstructions = taskInstructions + `\n\nIMPORTANT: You are processing a batch chunk. Process ALL items provided and return results for EACH item. The output MUST be a JSON array with one result per input item, in the same order.`;

    // Process chunks with controlled concurrency
    const results = [];
    const errors = [];
    let totalUsage = { input_tokens: 0, output_tokens: 0 };

    for (let i = 0; i < chunks.length; i += effectiveConcurrency) {
      const batch = chunks.slice(i, i + effectiveConcurrency);

      const batchPromises = batch.map(async (chunk, batchIdx) => {
        const chunkIndex = i + batchIdx;
        const input = {
          ...sharedContext,
          [itemKey]: chunk,
          _chunk: { index: chunkIndex + 1, total: chunks.length, itemCount: chunk.length },
        };

        try {
          const result = await this.execute({
            systemPrompt,
            taskInstructions: chunkInstructions,
            input,
            outputFormat,
            maxTokens,
            temperature,
          });

          totalUsage.input_tokens += result.usage?.input_tokens || 0;
          totalUsage.output_tokens += result.usage?.output_tokens || 0;

          // Extract results — detect array key automatically
          let chunkResults = result.output;
          if (resultKey && chunkResults && chunkResults[resultKey]) {
            chunkResults = chunkResults[resultKey];
          } else if (!Array.isArray(chunkResults) && typeof chunkResults === 'object' && !chunkResults._parseError) {
            // Auto-detect: find the first array value in the response
            const arrayKey = Object.keys(chunkResults).find((k) => Array.isArray(chunkResults[k]));
            if (arrayKey) {
              chunkResults = chunkResults[arrayKey];
            }
          }

          return { index: chunkIndex, results: Array.isArray(chunkResults) ? chunkResults : [chunkResults] };
        } catch (error) {
          console.error(`[LLMService] Batch chunk ${chunkIndex + 1}/${chunks.length} failed:`, error.message);
          errors.push({ chunk: chunkIndex, error: error.message, items: chunk });
          return { index: chunkIndex, results: [] };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    // Sort by chunk index and flatten
    results.sort((a, b) => a.index - b.index);
    const mergedOutput = results.flatMap((r) => r.results);

    return {
      output: mergedOutput,
      chunks: chunks.length,
      totalItems: items.length,
      processedItems: mergedOutput.length,
      usage: totalUsage,
      errors,
    };
  }

  /**
   * Execute with streaming (for UI/real-time)
   *
   * @param {Object} params - Same as execute()
   * @returns {Promise<ReadableStream>} Server-sent event stream
   */
  async executeStream({ systemPrompt, taskInstructions, input, maxTokens, temperature }) {
    const system = this._buildSystemPrompt(systemPrompt, 'text');
    const userMessage = this._buildUserMessage(taskInstructions, input, 'text');

    return this.client.messages.stream({
      model: this.model,
      max_tokens: maxTokens || this.maxTokens,
      temperature: temperature ?? this.temperature,
      system,
      messages: [{ role: 'user', content: userMessage }],
    });
  }

  /**
   * Execute with tool use (for Jarvis command detection)
   *
   * @param {Object} params
   * @param {string} params.systemPrompt - System prompt
   * @param {Array} params.messages - Conversation messages
   * @param {Array} params.tools - Tool definitions
   * @param {number} [params.maxTokens] - Override max tokens
   * @returns {Promise<Object>} Full API response with tool_use blocks
   */
  async executeWithTools({ systemPrompt, messages, tools, maxTokens, temperature }) {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens || this.maxTokens,
      temperature: temperature ?? this.temperature,
      system: systemPrompt,
      messages,
      tools,
    });

    return response;
  }

  /**
   * Build system prompt combining persona and output format instructions
   * @private
   */
  _buildSystemPrompt(persona, outputFormat) {
    let system = persona || '';

    if (outputFormat === 'json') {
      system += '\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown fences, no explanation outside the JSON. The response must be parseable by JSON.parse().';
    } else if (outputFormat === 'yaml') {
      system += '\n\nIMPORTANT: You MUST respond with valid YAML only. No markdown fences, no explanation outside the YAML.';
    }

    return system;
  }

  /**
   * Build user message from task instructions + input
   * @private
   */
  _buildUserMessage(taskInstructions, input, outputFormat) {
    let message = '';

    if (taskInstructions) {
      message += `## Task Instructions\n\n${taskInstructions}\n\n`;
    }

    if (input) {
      const inputStr = typeof input === 'string' ? input : JSON.stringify(input, null, 2);
      message += `## Input Data\n\n\`\`\`json\n${inputStr}\n\`\`\`\n\n`;
    }

    if (outputFormat === 'json') {
      message += '## Output Format\n\nRespond with a single valid JSON object. No markdown fences.';
    } else if (outputFormat === 'yaml') {
      message += '## Output Format\n\nRespond with valid YAML. No markdown fences.';
    }

    return message;
  }

  /**
   * Parse structured output from LLM response text
   *
   * Handles:
   * - Raw JSON: { ... }
   * - Fenced JSON: ```json\n{ ... }\n```
   * - Raw YAML
   * - Plain text (returned as-is)
   *
   * @param {string} text - Raw LLM response
   * @param {string} format - Expected format: 'json', 'yaml', 'text'
   * @returns {any} Parsed output
   */
  parseStructuredOutput(text, format = 'json') {
    if (format === 'text') {
      return text.trim();
    }

    const cleaned = text.trim();

    if (format === 'json') {
      return this._parseJSON(cleaned);
    }

    if (format === 'yaml') {
      return this._parseYAML(cleaned);
    }

    return cleaned;
  }

  /**
   * Parse JSON from LLM response, handling fences, truncation, and common issues.
   * NEVER throws — returns best-effort result or raw text wrapper on total failure.
   * @private
   */
  _parseJSON(text) {
    // 1. Try raw parse first (ideal case)
    try {
      return JSON.parse(text);
    } catch {
      // Continue to cleanup
    }

    // 2. Strip markdown fences (greedy — handles long content)
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*)\n?\s*```\s*$/);
    if (fenceMatch) {
      try {
        return JSON.parse(fenceMatch[1].trim());
      } catch {
        // Fence found but content not valid JSON — try brace extraction on fenced content
        text = fenceMatch[1].trim();
      }
    }

    // 3. Also handle fence without closing ``` (truncated response)
    const openFence = text.match(/^```(?:json)?\s*\n?([\s\S]*)$/);
    if (openFence && !fenceMatch) {
      text = openFence[1].trim();
    }

    // 4. Extract JSON by finding first { or [ and matching last } or ]
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    const start = firstBrace === -1 ? firstBracket : firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket);

    if (start !== -1) {
      const isArray = text[start] === '[';
      const closer = isArray ? ']' : '}';
      const lastClose = text.lastIndexOf(closer);

      if (lastClose > start) {
        const candidate = text.slice(start, lastClose + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          // 5. Truncated JSON repair — try closing open structures
          const repaired = this._repairTruncatedJSON(candidate);
          if (repaired) return repaired;
        }
      }
    }

    // 6. Graceful fallback — return raw text wrapped so pipeline can continue
    console.warn('[LLMService] JSON parse failed, returning raw text as _raw field');
    return { _raw: text, _parseError: true };
  }

  /**
   * Attempt to repair truncated JSON by closing open structures.
   * Handles cases where maxTokens cut the response mid-JSON.
   * @private
   */
  _repairTruncatedJSON(text) {
    // Remove trailing comma and whitespace
    let cleaned = text.replace(/,\s*$/, '');

    // Remove incomplete string at end (unmatched quote)
    const quoteCount = (cleaned.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      // Truncated in middle of a string — find last complete key-value
      const lastCompleteComma = cleaned.lastIndexOf(',\n');
      const lastCompleteBrace = cleaned.lastIndexOf('}\n');
      const cutPoint = Math.max(lastCompleteComma, lastCompleteBrace);
      if (cutPoint > 0) {
        cleaned = cleaned.slice(0, cutPoint + 1);
      } else {
        return null; // Can't repair
      }
    }

    // Count open/close braces and brackets
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let prevChar = '';

    for (const ch of cleaned) {
      if (ch === '"' && prevChar !== '\\') inString = !inString;
      if (!inString) {
        if (ch === '{') openBraces++;
        if (ch === '}') openBraces--;
        if (ch === '[') openBrackets++;
        if (ch === ']') openBrackets--;
      }
      prevChar = ch;
    }

    // Close open structures
    let suffix = '';
    for (let i = 0; i < openBrackets; i++) suffix += ']';
    for (let i = 0; i < openBraces; i++) suffix += '}';

    if (suffix) {
      try {
        return JSON.parse(cleaned + suffix);
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Clean artifacts from continuation-joined text.
   * When auto-continuation concatenates multiple LLM responses, the join
   * point may contain preamble text that breaks JSON parsing.
   * @private
   */
  _cleanContinuationArtifacts(text) {
    // Remove common continuation preamble patterns that appear between JSON fragments
    const preamblePatterns = [
      /(?<=[\]\}",\d])\s*(?:Here(?:'s| is) the continuation:?\s*)/gi,
      /(?<=[\]\}",\d])\s*(?:Continuing (?:from )?where (?:I|we) left off:?\s*)/gi,
      /(?<=[\]\}",\d])\s*(?:Let me continue:?\s*)/gi,
    ];

    let cleaned = text;
    for (const pattern of preamblePatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    // Remove markdown fences that appear in the middle of text (from continuation)
    // Keep the content inside them
    cleaned = cleaned.replace(/```json\s*\n?/g, '').replace(/```\s*$/gm, '');

    return cleaned;
  }

  /**
   * Parse YAML from LLM response
   * @private
   */
  _parseYAML(text) {
    const yaml = require('js-yaml');

    // Remove markdown fences if present
    const fenceMatch = text.match(/```(?:ya?ml)?\s*\n?([\s\S]*?)\n?\s*```/);
    const content = fenceMatch ? fenceMatch[1].trim() : text;

    try {
      return yaml.load(content);
    } catch (error) {
      throw new Error(`Failed to parse YAML from LLM response: ${error.message}`);
    }
  }
}

module.exports = { LLMService, DEFAULTS };
