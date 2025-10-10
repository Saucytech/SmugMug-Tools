import { query } from './db';
import { decrypt, encrypt } from './encryption';

interface EncryptedTokenRow {
  user_id: string;
  access_token: string;
  access_token_secret: string;
  updated_at: Date;
}

export interface SmugMugTokens {
  accessToken: string;
  accessTokenSecret: string;
}

export async function getSmugMugTokens(userId: string): Promise<SmugMugTokens | null> {
  const result = await query<EncryptedTokenRow>(
    `SELECT user_id, access_token, access_token_secret, updated_at FROM smugmug_tokens WHERE user_id = $1`,
    [userId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    accessToken: decrypt(row.access_token),
    accessTokenSecret: decrypt(row.access_token_secret),
  };
}

export async function saveSmugMugTokens(userId: string, tokens: SmugMugTokens): Promise<void> {
  const encryptedToken = encrypt(tokens.accessToken);
  const encryptedSecret = encrypt(tokens.accessTokenSecret);

  await query(
    `INSERT INTO smugmug_tokens (user_id, access_token, access_token_secret, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET access_token = EXCLUDED.access_token,
                   access_token_secret = EXCLUDED.access_token_secret,
                   updated_at = NOW()`,
    [userId, encryptedToken, encryptedSecret]
  );
}

export async function deleteSmugMugTokens(userId: string): Promise<void> {
  await query(`DELETE FROM smugmug_tokens WHERE user_id = $1`, [userId]);
}
