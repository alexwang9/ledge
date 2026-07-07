import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import { checkRateLimit } from '@/lib/ratelimit';

export async function POST(request: NextRequest) {
  const ip = (await headers()).get('x-forwarded-for') ?? 'unknown';
  const { limited } = await checkRateLimit(ip, 'code-verify');
  if (limited) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code || typeof email !== 'string' || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 401 }
      );
    }

    // Atomically consume the code: updateMany's used:false predicate is
    // re-evaluated under the row lock, so concurrent requests with the same
    // code can't both succeed.
    const verified = await prisma.$transaction(async (tx) => {
      const consumed = await tx.verificationCode.updateMany({
        where: {
          userId: user.id,
          code,
          used: false,
          expiresAt: { gt: new Date() },
        },
        data: { used: true },
      });
      if (consumed.count === 0) return false;

      await tx.user.update({
        where: { id: user.id },
        data: { mfaVerifiedAt: new Date() },
      });
      // Consumed and expired codes serve no further purpose — drop them.
      await tx.verificationCode.deleteMany({
        where: {
          userId: user.id,
          OR: [{ used: true }, { expiresAt: { lt: new Date() } }],
        },
      });
      return true;
    });

    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      verified: true,
      email: user.email,
    });
  } catch (error) {
    console.error('MFA verify error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
