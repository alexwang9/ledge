import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * AES-256-GCM encryption for secrets at rest (Plaid access tokens).
 *
 * Stored format: `v1:<iv base64>:<auth tag base64>:<ciphertext base64>`.
 * The `v1:` prefix distinguishes encrypted values from legacy plaintext rows
 * (see prisma/encrypt-tokens.ts for the one-time migration).
 */

const VERSION_PREFIX = 'v1:';

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32'
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes, base64-encoded');
  }
  cachedKey = key;
  return key;
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(VERSION_PREFIX);
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
}

export function decryptToken(stored: string): string {
  // Legacy plaintext row — pass through until prisma/encrypt-tokens.ts has run.
  if (!isEncrypted(stored)) return stored;

  const [ivB64, tagB64, ciphertextB64] = stored.slice(VERSION_PREFIX.length).split(':');
  if (!ivB64 || !tagB64 || !ciphertextB64) {
    throw new Error('Malformed encrypted token');
  }
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
