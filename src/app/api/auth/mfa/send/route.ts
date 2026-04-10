import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { sendVerificationCode, generateVerificationCode } from '@/lib/email';
import { validateEmail } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      // Return generic error to prevent email enumeration
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email address first. Check your inbox for a verification code.' },
        { status: 403 }
      );
    }

    // Check if MFA is enabled for this user
    if (!user.mfaEnabled) {
      // MFA not enabled, allow direct login
      return NextResponse.json({
        mfaRequired: false,
        email: user.email,
      });
    }

    // Delete any existing unused codes for this user
    await prisma.verificationCode.deleteMany({
      where: {
        userId: user.id,
        used: false,
      },
    });

    // Generate and save verification code
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
      mfaRequired: true,
      email: user.email,
      message: 'Verification code sent to your email',
    });
  } catch (error) {
    console.error('MFA send error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
