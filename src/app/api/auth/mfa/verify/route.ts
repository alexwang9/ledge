import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import { checkRateLimit } from '@/lib/ratelimit';

export async function POST(request: NextRequest) {
  const ip = (await headers()).get('x-forwarded-for') ?? 'unknown';
  const { limited } = await checkRateLimit(ip);
  if (limited) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
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

    // Find valid verification code
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verificationCode) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 401 }
      );
    }

    await prisma.$transaction([
      prisma.verificationCode.update({
        where: { id: verificationCode.id },
        data: { used: true },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { mfaVerifiedAt: new Date() },
      }),
      prisma.verificationCode.deleteMany({
        where: {
          userId: user.id,
          OR: [
            { used: true, id: { not: verificationCode.id } },
            { expiresAt: { lt: new Date() } },
          ],
        },
      }),
    ]);

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
