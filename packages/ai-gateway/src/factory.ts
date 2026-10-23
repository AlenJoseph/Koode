import { createOpenAiCompatibleAdapter } from './adapters/openai-compatible.js';
import { createStubAdapter } from './adapters/stub.js';
import { createAiGateway, type AiGateway } from './gateway.js';
import type { GatewayBudgets, ModelAdapter } from './types.js';

export type AdapterKind = 'stub' | 'openai-compatible';

export type GatewayFromEnvOptions = {
  env?: NodeJS.ProcessEnv;
  budgets?: Partial<GatewayBudgets>;
  /** Override adapter selection (tests). */
  adapter?: ModelAdapter;
};

/**
 * Resolve a gateway from env without baking a vendor into application code.
 *
 * - AI_PROVIDER=stub (default) → deterministic stub
 * - AI_PROVIDER=openai-compatible → any OpenAI-compatible base URL
 */
export function createGatewayFromEnv(options: GatewayFromEnvOptions = {}): AiGateway {
  if (options.adapter) {
    return createAiGateway({ adapter: options.adapter, budgets: options.budgets });
  }

  const env = options.env ?? process.env;
  const provider = (env.AI_PROVIDER ?? 'stub').toLowerCase() as AdapterKind;

  let adapter: ModelAdapter;
  switch (provider) {
    case 'openai-compatible': {
      const baseUrl = env.AI_BASE_URL;
      const defaultModel = env.AI_MODEL;
      if (!baseUrl || !defaultModel) {
        throw new Error(
          'AI_PROVIDER=openai-compatible requires AI_BASE_URL and AI_MODEL',
        );
      }
      adapter = createOpenAiCompatibleAdapter({
        baseUrl,
        apiKey: env.AI_API_KEY,
        defaultModel,
      });
      break;
    }
    case 'stub':
      adapter = createStubAdapter();
      break;
    default:
      throw new Error(`Unknown AI_PROVIDER: ${provider}`);
  }

  return createAiGateway({ adapter, budgets: options.budgets });
}
