import { assertWithinBudget } from './budget.js';
import { AiGatewayError } from './errors.js';
import {
  DEFAULT_BUDGETS,
  type ChatRequest,
  type ChatResponse,
  type GatewayBudgets,
  type ModelAdapter,
} from './types.js';

export type AiGateway = {
  readonly adapterId: string;
  complete(request: ChatRequest): Promise<ChatResponse>;
};

export type CreateGatewayOptions = {
  adapter: ModelAdapter;
  budgets?: Partial<GatewayBudgets>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Provider-neutral gateway: timeouts, output caps, retries, soft cost checks.
 * Swap adapters without changing callers.
 */
export function createAiGateway(options: CreateGatewayOptions): AiGateway {
  const budgets: GatewayBudgets = { ...DEFAULT_BUDGETS, ...options.budgets };
  const { adapter } = options;

  return {
    adapterId: adapter.id,
    async complete(request: ChatRequest): Promise<ChatResponse> {
      const capped: ChatRequest = {
        ...request,
        maxOutputTokens: Math.min(
          request.maxOutputTokens ?? budgets.maxOutputTokens,
          budgets.maxOutputTokens,
        ),
      };

      let lastError: unknown;
      for (let attempt = 0; attempt <= budgets.maxRetries; attempt += 1) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), budgets.timeoutMs);
        try {
          const response = await adapter.complete(capped, controller.signal);
          try {
            assertWithinBudget(response.usage, budgets);
          } catch (error) {
            throw new AiGatewayError(
              error instanceof Error ? error.message : 'Budget exceeded',
              'budget_exceeded',
              error,
            );
          }
          return response;
        } catch (error) {
          lastError = error;
          if (error instanceof AiGatewayError) {
            throw error;
          }
          if (controller.signal.aborted) {
            lastError = new AiGatewayError('Model call timed out', 'timeout', error);
          }
          if (attempt < budgets.maxRetries) {
            await sleep(100 * (attempt + 1));
            continue;
          }
        } finally {
          clearTimeout(timer);
        }
      }

      if (lastError instanceof AiGatewayError) {
        throw lastError;
      }
      throw new AiGatewayError(
        lastError instanceof Error ? lastError.message : 'Provider failed',
        'provider_error',
        lastError,
      );
    },
  };
}
