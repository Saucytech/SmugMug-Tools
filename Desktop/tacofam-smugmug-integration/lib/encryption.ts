// Encryption utility for SmugMug OAuth tokens
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';
const ALGORITHM = 'aes-256-cbc';

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  console.warn(
    'ENCRYPTION_KEY not set or invalid. Tokens will not be properly encrypted. ' +
    'Generate a key with: openssl rand -hex 32'
  );
}

export const encryption = {
  /**
   * Encrypt a string value
   */
  encrypt(text: string): string {
    if (!ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY is not set');
    }

    const iv = crypto.randomBytes(16);
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV + encrypted text (both in hex)
    return iv.toString('hex') + ':' + encrypted;
  },

  /**
   * Decrypt an encrypted string
   */
  decrypt(encrypted: string): string {
    if (!ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY is not set');
    }

    const parts = encrypted.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  },

  /**
   * Check if encryption is properly configured
   */
  isConfigured(): boolean {
    return !!ENCRYPTION_KEY && ENCRYPTION_KEY.length === 64;
  },
};
