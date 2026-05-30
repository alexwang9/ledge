'use client';

import { useEffect, Suspense } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { useRouter } from 'next/navigation';

function OAuthHandler() {
  const router = useRouter();
  const receivedRedirectUri = typeof window !== 'undefined' ? window.location.href : '';

  const { open, ready } = usePlaidLink({
    token: null,
    receivedRedirectUri,
    onSuccess: async (publicToken, metadata) => {
      await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: publicToken, metadata }),
      });
      await fetch('/api/plaid/sync-transactions', { method: 'POST' });
      router.push('/dashboard/accounts');
    },
    onExit: () => {
      router.push('/dashboard/accounts');
    },
  });

  useEffect(() => {
    if (ready) open();
  }, [ready, open]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/50 text-sm">Completing bank connection...</p>
      </div>
    </div>
  );
}

export default function OAuthPage() {
  return (
    <Suspense>
      <OAuthHandler />
    </Suspense>
  );
}
