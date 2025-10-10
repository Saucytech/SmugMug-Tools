import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.SMUGMUG_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('SMUGMUG_ENCRYPTION_KEY is not configured');
  }

  const buffer = Buffer.from(key, key.length === 64 ? 'hex' : 'utf8');
  if (buffer.length !== 32) {
    throw new Error('SMUGMUG_ENCRYPTION_KEY must be 32 bytes');
  }

  return buffer;
}

export function encrypt(value: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(value: string): string {
  const key = getKey();
  const [ivHex, encryptedHex] = value.split(':');
  if (!ivHex || !encryptedHex) {
    throw new Error('Invalid encrypted value');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
