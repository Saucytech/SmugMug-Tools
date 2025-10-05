// Credit Management System
// In production, this would be stored in a database with user authentication

const STORAGE_KEY = 'metadata_monster_credits';
const INITIAL_FREE_CREDITS = 100;
const CREDIT_COST_PER_PHOTO = 1;

export interface CreditBalance {
  total: number;
  used: number;
  remaining: number;
  lastUpdated: string;
}

export const creditsStorage = {
  // Initialize credits for a new user
  initialize(): CreditBalance {
    const existing = this.getBalance();
    if (existing) return existing;

    const balance: CreditBalance = {
      total: INITIAL_FREE_CREDITS,
      used: 0,
      remaining: INITIAL_FREE_CREDITS,
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(balance));
    return balance;
  },

  // Get current credit balance
  getBalance(): CreditBalance | null {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  },

  // Check if user has enough credits
  hasCredits(amount: number = 1): boolean {
    const balance = this.getBalance();
    if (!balance) {
      this.initialize();
      return INITIAL_FREE_CREDITS >= amount;
    }
    return balance.remaining >= amount;
  },

  // Deduct credits (when processing a photo)
  deductCredits(amount: number = CREDIT_COST_PER_PHOTO): boolean {
    const balance = this.getBalance();
    if (!balance) {
      this.initialize();
      return this.deductCredits(amount);
    }

    if (balance.remaining < amount) {
      return false;
    }

    balance.used += amount;
    balance.remaining -= amount;
    balance.lastUpdated = new Date().toISOString();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(balance));
    return true;
  },

  // Add credits (when purchasing)
  addCredits(amount: number): CreditBalance {
    let balance = this.getBalance();
    if (!balance) {
      balance = this.initialize();
    }

    balance.total += amount;
    balance.remaining += amount;
    balance.lastUpdated = new Date().toISOString();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(balance));
    return balance;
  },

  // Reset credits (for testing)
  reset(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.initialize();
  },

  // Get pricing info
  getPricing(): {
    perPhoto: number;
    packages: Array<{ credits: number; price: number; bonus?: number }>;
  } {
    return {
      perPhoto: CREDIT_COST_PER_PHOTO,
      packages: [
        { credits: 50, price: 9.99 },
        { credits: 100, price: 17.99, bonus: 10 },
        { credits: 250, price: 39.99, bonus: 50 },
        { credits: 500, price: 69.99, bonus: 100 },
      ],
    };
  },
};
