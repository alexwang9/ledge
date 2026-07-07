import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken, isEncrypted } from '@/lib/crypto';

describe('crypto', () => {
  it('round-trips a token', () => {
    const token = 'access-sandbox-abc123';
    const stored = encryptToken(token);
    expect(stored).not.toContain(token);
    expect(isEncrypted(stored)).toBe(true);
    expect(decryptToken(stored)).toBe(token);
  });

  it('produces a different ciphertext per call (random IV)', () => {
    expect(encryptToken('same')).not.toBe(encryptToken('same'));
  });

  it('passes legacy plaintext values through decryptToken', () => {
    expect(isEncrypted('access-production-legacy')).toBe(false);
    expect(decryptToken('access-production-legacy')).toBe('access-production-legacy');
  });

  it('throws on a tampered ciphertext', () => {
    const stored = encryptToken('secret');
    const parts = stored.split(':');
    // Flip the ciphertext segment
    const tampered = [...parts.slice(0, 3), Buffer.from('xxxx').toString('base64')].join(':');
    expect(() => decryptToken(tampered)).toThrow();
  });

  it('throws on a malformed encrypted value', () => {
    expect(() => decryptToken('v1:only-one-part')).toThrow('Malformed encrypted token');
  });
});
