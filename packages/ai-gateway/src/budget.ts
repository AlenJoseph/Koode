import type { ChatUsage, GatewayBudgets } from './types.js';

export function estimateCostMicros(usage: ChatUsage, budgets: GatewayBudgets): number {
  const input =
    (usage.inputTokens / 1_000_000) * budgets.inputCostPerMillionMicros;
  const output =
    (usage.outputTokens / 1_000_000) * budgets.outputCostPerMillionMicros;
  return Math.ceil(input + output);
}

export function assertWithinBudget(
  usage: ChatUsage,
  budgets: GatewayBudgets,
): void {
  if (budgets.maxCostMicros <= 0) {
    return;
  }
  const cost = estimateCostMicros(usage, budgets);
  if (cost > budgets.maxCostMicros) {
    throw new Error(
      `Estimated cost ${cost} micros exceeds budget ${budgets.maxCostMicros}`,
    );
  }
}
