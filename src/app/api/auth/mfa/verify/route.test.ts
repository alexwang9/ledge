import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    verificationCode: { updateMany: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ default: prismaMock, prisma: prismaMock }));
vi.mock('@/lib/ratelimit', () => ({ checkRateLimit: vi.fn(async () => ({ limited: false })) }));
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'x-forwarded-for': '1.2.3.4' })),
}));

import { POST } from './route';
import { checkRateLimit } from '@/lib/ratelimit';

function makeRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(checkRateLimit).mockResolvedValue({ limited: false });
  prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
  // Run the interactive transaction against the same mock client.
  prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) =>
    fn(prismaMock)
  );
  prismaMock.user.update.mockResolvedValue({});
  prismaMock.verificationCode.deleteMany.mockResolvedValue({ count: 0 });
});

describe('POST /api/auth/mfa/verify', () => {
  it('verifies and consumes a valid code, setting mfaVerifiedAt', async () => {
    prismaMock.verificationCode.updateMany.mockResolvedValue({ count: 1 });

    const res = await POST(makeRequest({ email: 'a@b.com', code: '123456' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ verified: true });
    expect(prismaMock.verificationCode.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ userId: 'u1', code: '123456', used: false }),
      data: { used: true },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { mfaVerifiedAt: expect.any(Date) },
    });
  });

  it('rejects when the code was already consumed (atomicity: count 0)', async () => {
    prismaMock.verificationCode.updateMany.mockResolvedValue({ count: 0 });

    const res = await POST(makeRequest({ email: 'a@b.com', code: '123456' }));

    expect(res.status).toBe(401);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('rejects unknown users without leaking existence', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ email: 'ghost@b.com', code: '123456' }));

    expect(res.status).toBe(401);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rejects non-string email/code with 400', async () => {
    expect((await POST(makeRequest({ email: 'a@b.com' }))).status).toBe(400);
    expect((await POST(makeRequest({ email: 'a@b.com', code: 123456 }))).status).toBe(400);
    expect((await POST(makeRequest({ email: { gt: '' }, code: '123456' }))).status).toBe(400);
  });

  it('returns 429 when rate limited', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ limited: true });

    const res = await POST(makeRequest({ email: 'a@b.com', code: '123456' }));

    expect(res.status).toBe(429);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });
});
