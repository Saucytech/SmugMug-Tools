import { Pool, QueryResult } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured');
    }

    // Neon requires SSL in all environments
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
    });

    // Set default schema to public
    pool.on('connect', (client) => {
      client.query('SET search_path TO public');
    });
  }

  return pool;
}

export async function query<T = unknown>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
  const dbPool = getPool();
  return dbPool.query<T>(text, params);
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// User management functions
export const db = {
  async getUserByEmail(email: string) {
    const result = await query('SELECT * FROM public.users WHERE email = $1', [email]);
    return result.rows[0] || null;
  },

  async getUserById(id: number) {
    const result = await query('SELECT * FROM public.users WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async createUser(email: string, passwordHash: string, name?: string) {
    const result = await query(
      'INSERT INTO public.users (email, password_hash, name, coin_balance) VALUES ($1, $2, $3, 0) RETURNING *',
      [email, passwordHash, name]
    );
    return result.rows[0];
  },

  async updateUserCoinBalance(userId: number, newBalance: number) {
    const result = await query(
      'UPDATE public.users SET coin_balance = $1 WHERE id = $2 RETURNING *',
      [newBalance, userId]
    );
    return result.rows[0];
  },

  async addCoinTransaction(userId: number, amount: number, type: string, description?: string) {
    const result = await query(
      'INSERT INTO public.coin_transactions (user_id, amount, type, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, amount, type, description]
    );
    return result.rows[0];
  },

  async updateLastLogin(userId: number) {
    await query('UPDATE public.users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
  },
};

export default db;
