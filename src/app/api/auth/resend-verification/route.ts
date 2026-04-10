import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendVerificationCode, generateVerificationCode } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return success anyway to prevent email enumeration
      return NextResponse.json({
        message: 'If an account exists, a new code has been sent',
      });
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      );
    }

    // Check for rate limiting - don't allow resend within 60 seconds
    const recentCode = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (recentCode) {
      return NextResponse.json(
        { error: 'Please wait before requesting a new code' },
        { status: 429 }
      );
    }

    // Delete any existing unused codes for this user
    await prisma.verificationCode.deleteMany({
      where: {
        userId: user.id,
        used: false,
      },
    });

    // Generate and save new verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        code,
        expiresAt,
      },
    });

    // Send verification email
    const emailSent = await sendVerificationCode(user.email, code);

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send verification code. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Verification code sent to your email',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
