import { AiGatewayError } from '../errors.js';
import type { ChatRequest, ChatResponse, ModelAdapter } from '../types.js';

export type OpenAiCompatibleAdapterOptions = {
  /** e.g. https://api.openai.com/v1 or http://localhost:11434/v1 */
  baseUrl: string;
  apiKey?: string;
  defaultModel: string;
  id?: string;
  fetchImpl?: typeof fetch;
};

type OpenAiChatCompletion = {
  model?: string;
  choices?: Array<{
    finish_reason?: string | null;
    message?: { content?: string | null };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
};

/**
 * Model-agnostic HTTP adapter for any OpenAI-compatible chat completions API
 * (OpenAI, Azure OpenAI-compatible gateways, Groq, Ollama, etc.).
 */
export function createOpenAiCompatibleAdapter(
  options: OpenAiCompatibleAdapterOptions,
): ModelAdapter {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl.replace(/\/$/, '');

  return {
    id: options.id ?? 'openai-compatible',
    async complete(request: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
      const model = request.model ?? options.defaultModel;
      const headers: Record<string, string> = {
        'content-type': 'application/json',
      };
      if (options.apiKey) {
        headers.authorization = `Bearer ${options.apiKey}`;
      }

      let response: Response;
      try {
        response = await fetchImpl(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers,
          signal,
          body: JSON.stringify({
            model,
            messages: request.messages,
            temperature: request.temperature ?? 0.4,
            max_tokens: request.maxOutputTokens,
            ...(request.responseFormat === 'json_object'
              ? { response_format: { type: 'json_object' } }
              : {}),
          }),
        });
      } catch (error) {
        if (signal?.aborted) {
          throw new AiGatewayError('Request aborted', 'aborted', error);
        }
        throw new AiGatewayError('Provider request failed', 'provider_error', error);
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new AiGatewayError(
          `Provider HTTP ${response.status}: ${body.slice(0, 200)}`,
          'provider_error',
        );
      }

      const payload = (await response.json()) as OpenAiChatCompletion;
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.trim().length === 0) {
        throw new AiGatewayError('Provider returned empty content', 'invalid_response');
      }

      const finish = payload.choices?.[0]?.finish_reason;
      return {
        content,
        model: payload.model ?? model,
        usage: {
          inputTokens: payload.usage?.prompt_tokens ?? 0,
          outputTokens: payload.usage?.completion_tokens ?? 0,
        },
        finishReason:
          finish === 'length' ? 'length' : finish === 'stop' ? 'stop' : 'unknown',
      };
    },
  };
}
