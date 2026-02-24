'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/[0.03] border-white/[0.06]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-white">Welcome back</CardTitle>
          <CardDescription className="text-white/40">
            Sign in to your Vizio account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-white/40">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-emerald-400 hover:text-emerald-300 transition-colors">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
