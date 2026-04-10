import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
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

    if (user.emailVerified) {
      return NextResponse.json({
        verified: true,
        message: 'Email already verified',
      });
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

    // Mark code as used and verify email
    await prisma.$transaction([
      prisma.verificationCode.update({
        where: { id: verificationCode.id },
        data: { used: true },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      }),
    ]);

    // Copy default budget categories to the new user
    const defaultUser = await prisma.user.findUnique({
      where: { email: 'system@default.local' },
    });

    if (defaultUser) {
      const defaultCategories = await prisma.budgetCategory.findMany({
        where: { userId: defaultUser.id },
      });

      await prisma.budgetCategory.createMany({
        data: defaultCategories.map((cat) => ({
          userId: user.id,
          name: cat.name,
          type: cat.type,
          monthlyLimit: cat.monthlyLimit,
        })),
      });
    }

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
