import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import { checkRateLimit } from '@/lib/ratelimit';
import { copyDefaultCategories } from '@/lib/default-categories';

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

    if (user.emailVerified) {
      return NextResponse.json({
        verified: true,
        message: 'Email already verified',
      });
    }

    // Atomically consume the code: updateMany's used:false predicate is
    // re-evaluated under the row lock, so concurrent requests with the same
    // code can't both succeed (which would also double-copy the default
    // categories below).
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
        data: { emailVerified: true },
      });
      return true;
    });

    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 401 }
      );
    }

    // Copy default budget categories to the new user
    await copyDefaultCategories(user.id);

    // Clean up old codes for this user
    await prisma.verificationCode.deleteMany({
      where: {
        userId: user.id,
        OR: [
          { used: true },
          { expiresAt: { lt: new Date() } },
        ],
      },
    });

    return NextResponse.json({
      verified: true,
      email: user.email,
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
