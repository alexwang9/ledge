import { randomInt } from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'Vizio <onboarding@resend.dev>';

export async function sendVerificationCode(email: string, code: string): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Your Vizio verification code',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #111; font-size: 24px; font-weight: 600; margin-bottom: 24px;">
            Your verification code
          </h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
            Enter this code to complete your sign in to Vizio:
          </p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 4px; color: #111;">
              ${code}
            </span>
          </div>
          <p style="color: #999; font-size: 14px; line-height: 1.5;">
            This code expires in 10 minutes. If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send verification email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}

export function generateVerificationCode(): string {
  return randomInt(100000, 999999).toString();
}
