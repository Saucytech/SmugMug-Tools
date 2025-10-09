// Database utility for Neon PostgreSQL
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export const sql = neon(process.env.DATABASE_URL);

// Database helper functions
export const db = {
  // User operations
  async getUserByEmail(email: string) {
    const result = await sql`
      SELECT * FROM users WHERE email = ${email} LIMIT 1
    `;
    return result[0] || null;
  },

  async getUserById(id: number) {
    const result = await sql`
      SELECT * FROM users WHERE id = ${id} LIMIT 1
    `;
    return result[0] || null;
  },

  async createUser(email: string, passwordHash: string, name?: string) {
    const result = await sql`
      INSERT INTO users (email, password_hash, name, coin_balance)
      VALUES (${email}, ${passwordHash}, ${name || null}, 10000)
      RETURNING *
    `;
    return result[0];
  },

  async updateUserCoinBalance(userId: number, newBalance: number) {
    await sql`
      UPDATE users
      SET coin_balance = ${newBalance}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `;
  },

  async updateLastLogin(userId: number) {
    await sql`
      UPDATE users
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `;
  },

  // SmugMug token operations
  async getSmugMugTokens(userId: number) {
    const result = await sql`
      SELECT * FROM smugmug_tokens WHERE user_id = ${userId} LIMIT 1
    `;
    return result[0] || null;
  },

  async saveSmugMugTokens(
    userId: number,
    accessTokenEncrypted: string,
    tokenSecretEncrypted: string,
    smugmugNickname?: string,
    smugmugDomain?: string
  ) {
    await sql`
      INSERT INTO smugmug_tokens (
        user_id, access_token_encrypted, token_secret_encrypted,
        smugmug_nickname, smugmug_domain
      )
      VALUES (
        ${userId}, ${accessTokenEncrypted}, ${tokenSecretEncrypted},
        ${smugmugNickname || null}, ${smugmugDomain || null}
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        access_token_encrypted = ${accessTokenEncrypted},
        token_secret_encrypted = ${tokenSecretEncrypted},
        smugmug_nickname = ${smugmugNickname || null},
        smugmug_domain = ${smugmugDomain || null},
        updated_at = CURRENT_TIMESTAMP
    `;
  },

  async deleteSmugMugTokens(userId: number) {
    await sql`
      DELETE FROM smugmug_tokens WHERE user_id = ${userId}
    `;
  },

  // Coin transaction operations
  async addCoinTransaction(
    userId: number,
    amount: number,
    type: 'purchase' | 'ai_operation' | 'bonus' | 'refund',
    description: string,
    stripePaymentId?: string,
    relatedAiOperationId?: number
  ) {
    const result = await sql`
      INSERT INTO coin_transactions (
        user_id, amount, type, description, stripe_payment_id, related_ai_operation_id
      )
      VALUES (
        ${userId}, ${amount}, ${type}, ${description},
        ${stripePaymentId || null}, ${relatedAiOperationId || null}
      )
      RETURNING *
    `;
    return result[0];
  },

  async getCoinTransactions(userId: number, limit = 50) {
    return await sql`
      SELECT * FROM coin_transactions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  },

  async getAllUserTransactions(limit = 100) {
    return await sql`
      SELECT ct.*, u.email, u.name
      FROM coin_transactions ct
      JOIN users u ON ct.user_id = u.id
      ORDER BY ct.created_at DESC
      LIMIT ${limit}
    `;
  },

  // AI operation operations
  async createAIOperation(
    userId: number,
    toolName: string,
    taskSummary?: string
  ) {
    const result = await sql`
      INSERT INTO ai_operations (
        user_id, tool_name, task_summary, status
      )
      VALUES (${userId}, ${toolName}, ${taskSummary || null}, 'processing')
      RETURNING *
    `;
    return result[0];
  },

  async updateAIOperation(
    operationId: number,
    data: {
      status?: 'processing' | 'completed' | 'error';
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
      coinsSpent?: number;
      modelName?: string;
      requestData?: any;
      responseData?: any;
      errorMessage?: string;
      completedAt?: Date;
      durationSeconds?: number;
    }
  ) {
    const {
      status,
      inputTokens,
      outputTokens,
      totalTokens,
      coinsSpent,
      modelName,
      requestData,
      responseData,
      errorMessage,
      completedAt,
      durationSeconds,
    } = data;

    await sql`
      UPDATE ai_operations SET
        status = COALESCE(${status || null}, status),
        input_tokens = COALESCE(${inputTokens || null}, input_tokens),
        output_tokens = COALESCE(${outputTokens || null}, output_tokens),
        total_tokens = COALESCE(${totalTokens || null}, total_tokens),
        coins_spent = COALESCE(${coinsSpent || null}, coins_spent),
        model_name = COALESCE(${modelName || null}, model_name),
        request_data = COALESCE(${requestData ? JSON.stringify(requestData) : null}, request_data),
        response_data = COALESCE(${responseData ? JSON.stringify(responseData) : null}, response_data),
        error_message = COALESCE(${errorMessage || null}, error_message),
        completed_at = COALESCE(${completedAt || null}, completed_at),
        duration_seconds = COALESCE(${durationSeconds || null}, duration_seconds)
      WHERE id = ${operationId}
    `;
  },

  async getAIOperations(userId: number, limit = 50) {
    return await sql`
      SELECT * FROM ai_operations
      WHERE user_id = ${userId}
      ORDER BY started_at DESC
      LIMIT ${limit}
    `;
  },

  async getAllAIOperations(limit = 100) {
    return await sql`
      SELECT ao.*, u.email, u.name
      FROM ai_operations ao
      JOIN users u ON ao.user_id = u.id
      ORDER BY ao.started_at DESC
      LIMIT ${limit}
    `;
  },

  // Admin analytics
  async getPlatformStats() {
    const result = await sql`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'user') as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins,
        (SELECT SUM(coin_balance) FROM users) as total_coins_in_platform,
        (SELECT SUM(amount) FROM coin_transactions WHERE type = 'purchase') as total_coins_purchased,
        (SELECT SUM(amount) FROM coin_transactions WHERE type = 'ai_operation') as total_coins_spent,
        (SELECT COUNT(*) FROM ai_operations) as total_ai_operations,
        (SELECT COUNT(*) FROM ai_operations WHERE status = 'completed') as completed_operations,
        (SELECT COUNT(*) FROM ai_operations WHERE status = 'error') as failed_operations,
        (SELECT SUM(total_tokens) FROM ai_operations WHERE status = 'completed') as total_tokens_used
    `;
    return result[0];
  },

  async getUsersWithStats(limit = 50) {
    return await sql`
      SELECT
        u.id,
        u.email,
        u.name,
        u.role,
        u.coin_balance,
        u.created_at,
        u.last_login,
        COUNT(DISTINCT ao.id) as total_operations,
        SUM(ao.coins_spent) as total_coins_spent,
        SUM(ao.total_tokens) as total_tokens_used
      FROM users u
      LEFT JOIN ai_operations ao ON u.id = ao.user_id
      WHERE u.role = 'user'
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ${limit}
    `;
  },
};
