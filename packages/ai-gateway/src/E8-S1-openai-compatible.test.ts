/**
 * E8-S1: openai-compatible adapter live path is opt-in; stub remains default.
 */
import { describe, expect, it, vi } from 'vitest';
import { createOpenAiCompatibleAdapter } from './adapters/openai-compatible.js';
import { createGatewayFromEnv } from './factory.js';

describe('E8-S1 openai-compatible live path', () => {
  it('defaults to stub when AI_PROVIDER is unset (CI-safe)', () => {
    const gateway = createGatewayFromEnv({ env: {} });
    expect(gateway.adapterId).toBe('stub');
  });

  it('defaults to stub when AI_PROVIDER=stub explicitly', () => {
    const gateway = createGatewayFromEnv({ env: { AI_PROVIDER: 'stub' } });
    expect(gateway.adapterId).toBe('stub');
  });

  it('selects openai-compatible when configured', () => {
    const gateway = createGatewayFromEnv({
      env: {
        AI_PROVIDER: 'openai-compatible',
        AI_BASE_URL: 'https://example.test/v1',
        AI_MODEL: 'demo',
        AI_API_KEY: 'test-key',
      },
    });
    expect(gateway.adapterId).toBe('openai-compatible');
  });

  it('happy: openai-compatible adapter maps chat completions', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          model: 'demo',
          choices: [{ finish_reason: 'stop', message: { content: '{"phase":"explain"}' } }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        }),
        { status: 200 },
      ),
    );
    const adapter = createOpenAiCompatibleAdapter({
      baseUrl: 'https://example.test/v1',
      defaultModel: 'demo',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await adapter.complete({
      messages: [{ role: 'user', content: 'hi' }],
      responseFormat: 'json_object',
    });
    expect(result.content).toContain('explain');
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('negative: missing AI_BASE_URL / AI_MODEL refused', () => {
    expect(() =>
      createGatewayFromEnv({
        env: { AI_PROVIDER: 'openai-compatible', AI_MODEL: 'demo' },
      }),
    ).toThrow(/AI_BASE_URL/);
    expect(() =>
      createGatewayFromEnv({
        env: { AI_PROVIDER: 'openai-compatible', AI_BASE_URL: 'https://example.test/v1' },
      }),
    ).toThrow(/AI_MODEL/);
  });
});
