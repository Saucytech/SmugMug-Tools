type RetryOptions = {
  retries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  onRetry?: (attempt: number, error: unknown) => void;
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  {
    retries = 3,
    initialDelayMs = 300,
    backoffFactor = 2,
    onRetry,
  }: RetryOptions = {}
): Promise<T> {
  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;

      if (attempt > retries) {
        throw error;
      }

      onRetry?.(attempt, error);

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= backoffFactor;
    }
  }
}

