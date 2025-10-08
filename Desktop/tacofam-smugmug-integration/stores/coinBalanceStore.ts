import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calculateCoinCost, formatCoins, type ModelId } from '@/lib/coinCalculator';

interface CoinTransaction {
  id: string;
  type: 'purchase' | 'spent' | 'refund';
  amount: number;
  timestamp: Date;
  description: string;
  modelId?: ModelId;
  inputTokens?: number;
  outputTokens?: number;
}

interface CoinBalanceStore {
  balance: number;
  transactions: CoinTransaction[];

  // Get current balance
  getBalance: () => number;

  // Add coins (purchases or refunds)
  addCoins: (amount: number, description: string) => void;

  // Spend coins for an AI operation
  spendCoins: (
    amount: number,
    description: string,
    modelId: ModelId,
    inputTokens: number,
    outputTokens: number
  ) => boolean;

  // Deduct coins based on actual AI token usage
  deductForAIUsage: (
    modelId: ModelId,
    inputTokens: number,
    outputTokens: number,
    description: string
  ) => { success: boolean; coinsSpent: number; newBalance: number };

  // Check if user has enough coins for an operation
  hasEnoughCoins: (amount: number) => boolean;

  // Get transaction history
  getTransactions: (limit?: number) => CoinTransaction[];

  // Clear all transactions (for debugging)
  clearTransactions: () => void;

  // Reset to initial balance
  reset: () => void;
}

const INITIAL_BALANCE = 1000; // Start users with 1,000 free coins for testing

export const useCoinBalance = create<CoinBalanceStore>()(
  persist(
    (set, get) => ({
      balance: INITIAL_BALANCE,
      transactions: [],

      getBalance: () => get().balance,

      addCoins: (amount, description) => {
        const transaction: CoinTransaction = {
          id: `${Date.now()}-${Math.random()}`,
          type: 'purchase',
          amount,
          timestamp: new Date(),
          description,
        };

        set((state) => ({
          balance: state.balance + amount,
          transactions: [transaction, ...state.transactions],
        }));
      },

      spendCoins: (amount, description, modelId, inputTokens, outputTokens) => {
        const currentBalance = get().balance;

        if (currentBalance < amount) {
          return false; // Insufficient balance
        }

        const transaction: CoinTransaction = {
          id: `${Date.now()}-${Math.random()}`,
          type: 'spent',
          amount,
          timestamp: new Date(),
          description,
          modelId,
          inputTokens,
          outputTokens,
        };

        set((state) => ({
          balance: state.balance - amount,
          transactions: [transaction, ...state.transactions],
        }));

        return true;
      },

      deductForAIUsage: (modelId, inputTokens, outputTokens, description) => {
        const coinsToSpend = calculateCoinCost(modelId, inputTokens, outputTokens);
        const currentBalance = get().balance;

        if (currentBalance < coinsToSpend) {
          console.error(`Insufficient coins: need ${coinsToSpend}, have ${currentBalance}`);
          return {
            success: false,
            coinsSpent: 0,
            newBalance: currentBalance,
          };
        }

        const success = get().spendCoins(
          coinsToSpend,
          description,
          modelId,
          inputTokens,
          outputTokens
        );

        return {
          success,
          coinsSpent: success ? coinsToSpend : 0,
          newBalance: get().balance,
        };
      },

      hasEnoughCoins: (amount) => {
        return get().balance >= amount;
      },

      getTransactions: (limit = 50) => {
        return get().transactions.slice(0, limit);
      },

      clearTransactions: () => {
        set({ transactions: [] });
      },

      reset: () => {
        set({
          balance: INITIAL_BALANCE,
          transactions: [],
        });
      },
    }),
    {
      name: 'coin-balance-storage', // localStorage key
    }
  )
);

// Helper function to format coin balance for display
export function formatCoinBalance(balance: number): string {
  return formatCoins(balance);
}
