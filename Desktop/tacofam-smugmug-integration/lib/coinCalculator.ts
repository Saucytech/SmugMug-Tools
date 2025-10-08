/**
 * Coin Cost Calculator
 *
 * SmugMug Toolbox uses an in-app currency called "Coins" that users purchase.
 * These coins are spent when AI operations consume AI Tokens.
 *
 * Pricing Strategy:
 * - Users buy Coins (in-app currency)
 * - AI operations consume AI Tokens (input/output to Claude API)
 * - Coin costs are calculated with 70-80% margin over actual AI token costs
 * - Exchange rate: 1 Coin = $0.001 (so 1,000 Coins = $1.00)
 */

// Anthropic Claude API Pricing (per 1 million tokens)
// Source: https://www.anthropic.com/pricing
const MODEL_PRICING = {
  'claude-3-haiku-20240307': {
    inputPer1M: 0.25,      // $0.25 per 1M input tokens
    outputPer1M: 1.25,     // $1.25 per 1M output tokens
  },
  'claude-3-5-haiku-20241022': {
    inputPer1M: 1.00,      // $1.00 per 1M input tokens
    outputPer1M: 5.00,     // $5.00 per 1M output tokens
  },
  'claude-3-5-sonnet-20241022': {
    inputPer1M: 3.00,      // $3.00 per 1M input tokens
    outputPer1M: 15.00,    // $15.00 per 1M output tokens
  },
  'claude-sonnet-4-5-20250929': {
    inputPer1M: 3.00,      // $3.00 per 1M input tokens
    outputPer1M: 15.00,    // $15.00 per 1M output tokens
  },
} as const;

export type ModelId = keyof typeof MODEL_PRICING;

// Configuration
const PROFIT_MARGIN_MULTIPLIER = 4; // 75% margin (cost × 4)
const COIN_TO_DOLLAR_RATE = 0.001; // 1 Coin = $0.001

/**
 * Calculate the coin cost for an AI operation based on actual token usage
 *
 * @param modelId - The Claude model used (e.g., 'claude-sonnet-4-5-20250929')
 * @param inputTokens - Number of input tokens consumed
 * @param outputTokens - Number of output tokens consumed
 * @returns Number of coins to charge (rounded to nearest coin)
 */
export function calculateCoinCost(
  modelId: ModelId,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[modelId];

  if (!pricing) {
    console.error(`Unknown model ID: ${modelId}`);
    return 0;
  }

  // Calculate actual cost in dollars
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  const totalCost = inputCost + outputCost;

  // Apply profit margin
  const chargeAmount = totalCost * PROFIT_MARGIN_MULTIPLIER;

  // Convert to coins
  const coins = chargeAmount / COIN_TO_DOLLAR_RATE;

  // Round to nearest coin
  return Math.round(coins);
}

/**
 * Calculate estimated coin cost for a single operation
 * Useful for showing users approximate costs before they run operations
 *
 * @param modelId - The Claude model to use
 * @param estimatedInputTokens - Estimated input tokens (default: 1000)
 * @param estimatedOutputTokens - Estimated output tokens (default: 500)
 * @returns Estimated coin cost
 */
export function estimateCoinCost(
  modelId: ModelId,
  estimatedInputTokens: number = 1000,
  estimatedOutputTokens: number = 500
): number {
  return calculateCoinCost(modelId, estimatedInputTokens, estimatedOutputTokens);
}

/**
 * Get the pricing details for a specific model
 * Useful for displaying in UI
 */
export function getModelPricing(modelId: ModelId) {
  return MODEL_PRICING[modelId];
}

/**
 * Format coin amount for display
 *
 * @param coins - Number of coins
 * @returns Formatted string (e.g., "1,234")
 */
export function formatCoins(coins: number): string {
  return Math.round(coins).toLocaleString();
}

/**
 * Calculate approximate coins per operation for each model
 * Based on typical metadata generation operation:
 * - Input: ~1000 tokens (image + prompt)
 * - Output: ~500 tokens (title, caption, keywords)
 */
export function getModelCoinCosts() {
  return {
    'claude-3-haiku-20240307': estimateCoinCost('claude-3-haiku-20240307'),
    'claude-3-5-haiku-20241022': estimateCoinCost('claude-3-5-haiku-20241022'),
    'claude-3-5-sonnet-20241022': estimateCoinCost('claude-3-5-sonnet-20241022'),
    'claude-sonnet-4-5-20250929': estimateCoinCost('claude-sonnet-4-5-20250929'),
  };
}
