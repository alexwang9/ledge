'use client';

import { useEffect, useState, Suspense } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { useRouter } from 'next/navigation';

function clearStoredLinkSession() {
  localStorage.removeItem('plaid_link_token');
  localStorage.removeItem('plaid_link_mode');
}

function OAuthHandler() {
  const router = useRouter();
  // Plaid's OAuth flow requires re-initializing Link with the same link_token
  // that started the flow; PlaidLinkButton persists it before redirecting.
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [mode, setMode] = useState<'create' | 'update'>('create');
  const receivedRedirectUri = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    const storedToken = localStorage.getItem('plaid_link_token');
    if (!storedToken) {
      router.replace('/dashboard/accounts');
      return;
    }
    setMode(localStorage.getItem('plaid_link_mode') === 'update' ? 'update' : 'create');
    setLinkToken(storedToken);
  }, [router]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    receivedRedirectUri,
    onSuccess: async (publicToken, metadata) => {
      try {
        // Update-mode public tokens must not be exchanged — doing so would
        // create a duplicate PlaidItem for an already-linked institution.
        if (mode === 'create') {
          await fetch('/api/plaid/exchange-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_token: publicToken, metadata }),
          });
        }
        await fetch('/api/plaid/sync-transactions', { method: 'POST' });
      } finally {
        clearStoredLinkSession();
        router.push('/dashboard/accounts');
      }
    },
    onExit: () => {
      clearStoredLinkSession();
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
