'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';

type Step = 'register' | 'verify';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError('You must agree to the Privacy Policy and Terms of Service');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, consent }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create account');
        return;
      }

      if (data.requiresVerification) {
        setStep('verify');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Verify the email
      const verifyRes = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setError(verifyData.error || 'Invalid verification code');
        return;
      }

      // Email verified, sign in
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Account verified but failed to sign in. Please try logging in.');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setResending(true);

    try {
      const response = await fetch('/api/auth/resend-verification', {
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

  const handleBackToRegister = () => {
    setStep('register');
    setCode('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/[0.03] border-white/[0.06]">
        <CardHeader className="text-center relative">
          {step === 'verify' && (
            <button
              onClick={handleBackToRegister}
              className="absolute left-6 top-6 text-white/40 hover:text-white/80 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <CardTitle className="text-2xl text-white">
            {step === 'register' ? 'Create an account' : 'Verify your email'}
          </CardTitle>
          <CardDescription className="text-white/40">
            {step === 'register'
              ? 'Start managing your finances with Ledge'
              : `We sent a verification code to ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'register' ? (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-white/50">Name</label>
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 focus:border-white/20 focus:ring-0"
                />
              </div>
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
                  minLength={8}
                  className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 focus:border-white/20 focus:ring-0"
                />
                <p className="text-xs text-white/30">
                  Min 8 characters with uppercase, lowercase, and number
                </p>
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  id="consent"
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  required
                  className="mt-1 h-4 w-4 rounded border-white/[0.15] bg-white/[0.03] text-emerald-500 focus:ring-emerald-500/40 focus:ring-offset-0 cursor-pointer accent-emerald-500"
                />
                <label htmlFor="consent" className="text-xs text-white/50 leading-relaxed cursor-pointer">
                  I agree to the{' '}
                  <Link href="/privacy" target="_blank" className="text-emerald-400 hover:text-emerald-300">
                    Privacy Policy
                  </Link>{' '}
                  and{' '}
                  <Link href="/terms" target="_blank" className="text-emerald-400 hover:text-emerald-300">
                    Terms of Service
                  </Link>
                  , and consent to the collection and processing of my financial data.
                </label>
              </div>

              {error && (
                <div className="text-rose-400 text-sm text-center">{error}</div>
              )}

              <Button
                type="submit"
                disabled={loading || !consent}
                className="w-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifySubmit} className="space-y-4">
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
                  'Verify email'
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

          {step === 'register' && (
            <div className="mt-6 text-center text-sm text-white/40">
              Already have an account?{' '}
              <Link href="/login" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                Sign in
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
