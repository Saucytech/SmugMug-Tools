/**
 * Environment variable validation and management
 * Ensures all required environment variables are present at startup
 */

// Define required environment variables
const requiredEnvVars = [
  'SMUGMUG_API_KEY',
  'SMUGMUG_API_SECRET',
  'NEXT_PUBLIC_APP_URL',
] as const;

// Define optional environment variables
const optionalEnvVars = [
  'ANTHROPIC_API_KEY', // Required for AI features but optional for base functionality
  'NODE_ENV',
] as const;

// Validate environment variables on module load
const missingVars: string[] = [];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
});

// Throw error if any required variables are missing
if (missingVars.length > 0) {
  const errorMessage = `
Missing required environment variables:
${missingVars.map(v => `  - ${v}`).join('\n')}

Please check your .env file and ensure all required variables are set.
See .env.example for the complete list.
  `.trim();

  throw new Error(errorMessage);
}

// Export validated and typed environment variables
export const env = {
  smugmug: {
    apiKey: process.env.SMUGMUG_API_KEY as string,
    apiSecret: process.env.SMUGMUG_API_SECRET as string,
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL as string,
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV !== 'production',
  },
  ai: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || null,
    hasAiEnabled: !!process.env.ANTHROPIC_API_KEY,
  },
} as const;

/**
 * Helper function to create sanitized error responses
 * Logs full error details server-side but returns safe messages to clients
 */
export function createErrorResponse(
  userMessage: string,
  error: unknown,
  status: number = 500
): Response {
  // Log full error details server-side
  console.error('API Error:', {
    message: userMessage,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
    timestamp: new Date().toISOString(),
  });

  // Return sanitized error to client
  const responseBody = {
    error: userMessage,
    // Only include debug information in development
    ...(env.app.isDevelopment && {
      debug: error instanceof Error ? error.message : String(error),
    }),
  };

  return new Response(
    JSON.stringify(responseBody),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Type-safe environment variable getter
 * Use this when you need to access env vars conditionally
 */
export function getEnvVar<T extends keyof typeof process.env>(
  key: T
): string | undefined {
  return process.env[key];
}

/**
 * Check if all required environment variables for a feature are present
 */
export const features = {
  aiEnabled: (): boolean => {
    return !!env.ai.anthropicApiKey;
  },

  productionReady: (): boolean => {
    return env.app.isProduction &&
           env.app.url.startsWith('https://') &&
           features.aiEnabled();
  },
} as const;

// Log environment status (only in development)
if (env.app.isDevelopment) {
  console.log('Environment Configuration:');
  console.log('  - SmugMug API: ✓ Configured');
  console.log(`  - AI Features: ${features.aiEnabled() ? '✓ Enabled' : '✗ Disabled (No ANTHROPIC_API_KEY)'}`);
  console.log(`  - App URL: ${env.app.url}`);
  console.log(`  - Environment: ${env.app.nodeEnv}`);
}