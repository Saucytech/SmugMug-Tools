import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCoinBalance } from './coinBalanceStore';
import { type ModelId } from '@/lib/coinCalculator';

export interface AIJob {
  id: string;
  tool: string; // "MetaData Monster", "AI Gallery Creator", etc.
  toolPath: string; // "/metadata-monster", "/ai-gallery-creator"
  status: 'processing' | 'completed' | 'error';
  startTime: Date;
  endTime?: Date;
  tokensUsed?: number; // Total AI tokens (input + output)
  inputTokens?: number; // AI input tokens
  outputTokens?: number; // AI output tokens
  coinsSpent?: number; // Coins deducted for this operation
  progress?: number; // 0-100 for progress bars
  message?: string; // Current task message
  model?: string; // e.g., "claude-sonnet-4-5-20250929"
  modelName?: string; // e.g., "Sonnet 4.5"
  error?: string; // Error message if status is 'error'

  // NEW: Detailed request/response tracking
  requestData?: any; // The data sent to AI (e.g., image URL, prompt, etc.)
  responseData?: any; // The full response from AI
  taskSummary?: string; // Brief description of what was done
}

interface AIActivityStore {
  jobs: AIJob[];
  activeCount: number;
  addJob: (job: AIJob) => void;
  updateJob: (id: string, updates: Partial<AIJob>) => void;
  completeJob: (id: string, tokensUsed?: number, inputTokens?: number, outputTokens?: number) => void;
  failJob: (id: string, error: string) => void;
  removeJob: (id: string) => void;
  getActiveJobs: () => AIJob[];
  getRecentJobs: (limit?: number) => AIJob[];
  getAllJobs: () => AIJob[];
  clearCompleted: () => void;
  clearAll: () => void;
}

const MAX_JOBS_HISTORY = 500; // Keep last 500 operations

export const useAIActivityStore = create<AIActivityStore>()(
  persist(
    (set, get) => ({
  jobs: [],
  activeCount: 0,

  addJob: (job) => {
    set((state) => {
      const newJobs = [...state.jobs, { ...job, startTime: new Date() }];
      // Keep only last MAX_JOBS_HISTORY jobs
      const trimmedJobs = newJobs.length > MAX_JOBS_HISTORY
        ? newJobs.slice(-MAX_JOBS_HISTORY)
        : newJobs;

      return {
        jobs: trimmedJobs,
        activeCount: state.activeCount + 1,
      };
    });
  },

  updateJob: (id, updates) => {
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...updates } : j)),
    }));
  },

  completeJob: (id, tokensUsed, inputTokens, outputTokens) => {
    const job = get().jobs.find((j) => j.id === id);

    console.log('🎯 completeJob called:', {
      id,
      tokensUsed,
      inputTokens,
      outputTokens,
      jobFound: !!job,
      jobModel: job?.model,
    });

    // Deduct coins if we have token usage data and a model
    let coinsSpent = 0;
    if (job && job.model && inputTokens && outputTokens) {
      const coinStore = useCoinBalance.getState();
      const result = coinStore.deductForAIUsage(
        job.model as ModelId,
        inputTokens,
        outputTokens,
        `${job.tool} operation`
      );

      if (result.success) {
        coinsSpent = result.coinsSpent;
        console.log(`✅ Deducted ${coinsSpent} coins for ${job.tool}. New balance: ${result.newBalance}`);
      } else {
        console.error(`❌ Failed to deduct coins for ${job.tool}`);
      }
    }

    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === id
          ? {
              ...j,
              status: 'completed' as const,
              endTime: new Date(),
              tokensUsed,
              inputTokens,
              outputTokens,
              coinsSpent,
            }
          : j
      ),
      activeCount: Math.max(0, state.activeCount - 1),
    }));

    console.log('✅ Job completed and saved:', get().jobs.find((j) => j.id === id));
  },

  failJob: (id, error) => {
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === id
          ? {
              ...j,
              status: 'error' as const,
              endTime: new Date(),
              error,
            }
          : j
      ),
      activeCount: Math.max(0, state.activeCount - 1),
    }));
  },

  removeJob: (id) => {
    set((state) => ({
      jobs: state.jobs.filter((j) => j.id !== id),
    }));
  },

  getActiveJobs: () => {
    return get().jobs.filter((j) => j.status === 'processing');
  },

  getRecentJobs: (limit = 10) => {
    return get()
      .jobs.slice()
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  },

  getAllJobs: () => {
    return get()
      .jobs.slice()
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  },

  clearCompleted: () => {
    set((state) => ({
      jobs: state.jobs.filter((j) => j.status === 'processing'),
    }));
  },

  clearAll: () => {
    set({
      jobs: [],
      activeCount: 0,
    });
  },
    }),
    {
      name: 'ai-activity-storage',
      // Custom serialization to handle Date objects
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const { state } = JSON.parse(str);
          return {
            state: {
              ...state,
              jobs: state.jobs.map((job: any) => ({
                ...job,
                startTime: new Date(job.startTime),
                endTime: job.endTime ? new Date(job.endTime) : undefined,
              })),
            },
          };
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);
