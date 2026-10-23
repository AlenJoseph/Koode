import { describe, expect, it, vi } from 'vitest';
import { createOpenAiCompatibleAdapter } from './adapters/openai-compatible.js';
import { createStubAdapter } from './adapters/stub.js';
import { AiGatewayError } from './errors.js';
import { createGatewayFromEnv } from './factory.js';
import { createAiGateway } from './gateway.js';
import type { ChatRequest, ChatResponse, ModelAdapter } from './types.js';

describe('model-agnostic gateway', () => {
  it('defaults to stub from env', () => {
    const gateway = createGatewayFromEnv({ env: {} });
    expect(gateway.adapterId).toBe('stub');
  });

  it('completes through the stub adapter', async () => {
    const gateway = createAiGateway({ adapter: createStubAdapter() });
    const result = await gateway.complete({
      messages: [{ role: 'user', content: 'rain' }],
      responseFormat: 'json_object',
    });
    expect(result.model).toBe('stub-model');
    expect(result.content).toContain('rain');
  });

  it('caps max output tokens via budgets', async () => {
    const adapter: ModelAdapter = {
      id: 'spy',
      complete: vi.fn(async (_request: ChatRequest): Promise<ChatResponse> => ({
        content: 'ok',
        model: 'spy',
        usage: { inputTokens: 1, outputTokens: 1 },
        finishReason: 'stop',
      })),
    };
    const gateway = createAiGateway({
      adapter,
      budgets: { maxOutputTokens: 50, maxRetries: 0 },
    });
    await gateway.complete({
      messages: [{ role: 'user', content: 'hi' }],
      maxOutputTokens: 9999,
    });
    expect(adapter.complete).toHaveBeenCalledWith(
      expect.objectContaining({ maxOutputTokens: 50 }),
      expect.any(AbortSignal),
    );
  });

  it('maps openai-compatible HTTP responses', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          model: 'demo-model',
          choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}' } }],
          usage: { prompt_tokens: 3, completion_tokens: 2 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const adapter = createOpenAiCompatibleAdapter({
      baseUrl: 'https://example.test/v1',
      defaultModel: 'demo-model',
      apiKey: 'test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await adapter.complete({
      messages: [{ role: 'user', content: 'hi' }],
      responseFormat: 'json_object',
    });
    expect(result.content).toBe('{"ok":true}');
    expect(result.usage.inputTokens).toBe(3);
  });

  it('throws on provider HTTP errors', async () => {
    const fetchImpl = vi.fn(
      async () => new Response('nope', { status: 500 }),
    );
    const adapter = createOpenAiCompatibleAdapter({
      baseUrl: 'https://example.test/v1',
      defaultModel: 'demo-model',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(
      adapter.complete({ messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toBeInstanceOf(AiGatewayError);
  });

  it('requires base URL and model for openai-compatible env', () => {
    expect(() =>
      createGatewayFromEnv({ env: { AI_PROVIDER: 'openai-compatible' } }),
    ).toThrow(/AI_BASE_URL/);
  });
});
