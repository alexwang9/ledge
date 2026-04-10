'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';

type Step = 'credentials' | 'mfa';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/mfa/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid email or password');
        return;
      }

      if (data.mfaRequired) {
        // MFA required, show code entry
        setStep('mfa');
      } else {
        // MFA not required, proceed with normal sign in
        await completeSignIn();
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Verify the MFA code
      const verifyResponse = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        setError(verifyData.error || 'Invalid verification code');
        return;
      }

      // Code verified, complete sign in
      await completeSignIn();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const completeSignIn = async () => {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Failed to sign in');
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  const handleResendCode = async () => {
    setError('');
    setResending(true);

    try {
      const response = await fetch('/api/auth/mfa/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to resend code');
      }
    } catch {
      setError('Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setCode('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/[0.03] border-white/[0.06]">
        <CardHeader className="text-center">
          {step === 'mfa' && (
            <button
              onClick={handleBackToCredentials}
              className="absolute left-6 top-6 text-white/40 hover:text-white/80 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <CardTitle className="text-2xl text-white">
            {step === 'credentials' ? 'Welcome back' : 'Check your email'}
          </CardTitle>
          <CardDescription className="text-white/40">
            {step === 'credentials'
              ? 'Sign in to your Vizio account'
              : `We sent a verification code to ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-white/50">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 focus:border-white/20 focus:ring-0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/50">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 focus:border-white/20 focus:ring-0"
                />
              </div>

              {error && (
                <div className="text-rose-400 text-sm text-center">{error}</div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-white/50">Verification code</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                  className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 focus:border-white/20 focus:ring-0 text-center text-2xl tracking-[0.5em] font-mono"
                />
                <p className="text-xs text-white/30 text-center">
                  Enter the 6-digit code sent to your email
                </p>
              </div>

              {error && (
                <div className="text-rose-400 text-sm text-center">{error}</div>
              )}

              <Button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resending}
                  className="text-sm text-white/40 hover:text-white/70 transition-colors disabled:opacity-50"
                >
                  {resending ? 'Sending...' : "Didn't receive a code? Resend"}
                </button>
              </div>
            </form>
          )}

          {step === 'credentials' && (
            <div className="mt-6 text-center text-sm text-white/40">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                Sign up
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
