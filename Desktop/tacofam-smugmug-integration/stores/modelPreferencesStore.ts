import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { estimateCoinCost } from '@/lib/coinCalculator';

export const AVAILABLE_MODELS = {
  'claude-3-haiku-20240307': {
    name: 'Haiku 3.0',
    description: 'Fastest & cheapest',
    tier: 'economy',
    speed: 'Very Fast',
    quality: 'Good',
    // Approximate coins per typical operation (1000 input, 500 output tokens)
    coinsPerOperation: estimateCoinCost('claude-3-haiku-20240307', 1000, 500),
  },
  'claude-3-5-haiku-20241022': {
    name: 'Haiku 3.5',
    description: 'Fast & improved',
    tier: 'economy',
    speed: 'Very Fast',
    quality: 'Very Good',
    coinsPerOperation: estimateCoinCost('claude-3-5-haiku-20241022', 1000, 500),
  },
  'claude-3-5-sonnet-20241022': {
    name: 'Sonnet 3.5',
    description: 'Balanced quality',
    tier: 'standard',
    speed: 'Fast',
    quality: 'Excellent',
    coinsPerOperation: estimateCoinCost('claude-3-5-sonnet-20241022', 1000, 500),
  },
  'claude-sonnet-4-5-20250929': {
    name: 'Sonnet 4.5',
    description: 'Premium quality',
    tier: 'premium',
    speed: 'Moderate',
    quality: 'Outstanding',
    coinsPerOperation: estimateCoinCost('claude-sonnet-4-5-20250929', 1000, 500),
  },
} as const;

export type ModelId = keyof typeof AVAILABLE_MODELS;

export interface ModelPreferences {
  // Per-tool model selections
  'ai-gallery-creator': ModelId;
  'metadata-monster': ModelId;
  'photo-organizer-index': ModelId;
  'photo-organizer-upload': ModelId;
  'photo-organizer-culling': ModelId;
  'sanity-checker': ModelId;
}

interface ModelPreferencesStore {
  preferences: ModelPreferences;
  setModel: (tool: keyof ModelPreferences, model: ModelId) => void;
  getModel: (tool: keyof ModelPreferences) => ModelId;
  resetToDefaults: () => void;
  setAllToModel: (model: ModelId) => void;
}

const DEFAULT_PREFERENCES: ModelPreferences = {
  'ai-gallery-creator': 'claude-3-haiku-20240307',
  'metadata-monster': 'claude-sonnet-4-5-20250929',
  'photo-organizer-index': 'claude-3-5-haiku-20241022',
  'photo-organizer-upload': 'claude-sonnet-4-5-20250929',
  'photo-organizer-culling': 'claude-sonnet-4-5-20250929',
  'sanity-checker': 'claude-sonnet-4-5-20250929',
};

export const useModelPreferences = create<ModelPreferencesStore>()(
  persist(
    (set, get) => ({
      preferences: DEFAULT_PREFERENCES,

      setModel: (tool, model) =>
        set((state) => ({
          preferences: { ...state.preferences, [tool]: model },
        })),

      getModel: (tool) => get().preferences[tool],

      resetToDefaults: () => set({ preferences: DEFAULT_PREFERENCES }),

      setAllToModel: (model) =>
        set((state) => ({
          preferences: Object.keys(state.preferences).reduce(
            (acc, key) => ({ ...acc, [key]: model }),
            {} as ModelPreferences
          ),
        })),
    }),
    {
      name: 'ai-model-preferences', // localStorage key
    }
  )
);
