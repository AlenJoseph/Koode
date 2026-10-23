/**
 * Model-agnostic chat types.
 * Adapters map provider APIs onto this shape; application code never
 * imports OpenAI/Anthropic/etc. SDKs directly.
 */

export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatRequest = {
  messages: ChatMessage[];
  /** Provider-specific model id when the adapter needs one. */
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** Soft hint for structured JSON object responses. */
  responseFormat?: 'text' | 'json_object';
};

export type ChatUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type ChatResponse = {
  content: string;
  model: string;
  usage: ChatUsage;
  finishReason: 'stop' | 'length' | 'error' | 'unknown';
};

export interface ModelAdapter {
  readonly id: string;
  complete(request: ChatRequest, signal?: AbortSignal): Promise<ChatResponse>;
}

export type GatewayBudgets = {
  timeoutMs: number;
  maxOutputTokens: number;
  maxRetries: number;
  /** Soft cost ceiling in USD micros (1e-6 USD). 0 disables. */
  maxCostMicros: number;
  /** Rough price estimate used for soft cost checks. */
  inputCostPerMillionMicros: number;
  outputCostPerMillionMicros: number;
};

export const DEFAULT_BUDGETS: GatewayBudgets = {
  timeoutMs: 30_000,
  maxOutputTokens: 1024,
  maxRetries: 1,
  maxCostMicros: 50_000, // $0.05
  inputCostPerMillionMicros: 500_000, // $0.50 / 1M
  outputCostPerMillionMicros: 1_500_000, // $1.50 / 1M
};
