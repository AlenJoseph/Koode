export { AiGatewayError } from './errors.js';
export { estimateCostMicros, assertWithinBudget } from './budget.js';
export { createAiGateway, type AiGateway, type CreateGatewayOptions } from './gateway.js';
export {
  createGatewayFromEnv,
  type AdapterKind,
  type GatewayFromEnvOptions,
} from './factory.js';
export { createStubAdapter, type StubAdapterOptions } from './adapters/stub.js';
export {
  createOpenAiCompatibleAdapter,
  type OpenAiCompatibleAdapterOptions,
} from './adapters/openai-compatible.js';
export {
  DEFAULT_BUDGETS,
  type ChatMessage,
  type ChatRequest,
  type ChatResponse,
  type ChatRole,
  type ChatUsage,
  type GatewayBudgets,
  type ModelAdapter,
} from './types.js';
