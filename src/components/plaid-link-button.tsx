'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PlaidLinkButtonProps {
  onSuccess: () => void;
  /** Pass the institution's accessToken to launch Plaid in update mode (re-link). */
  accessToken?: string;
  label?: string;
  className?: string;
}

export function PlaidLinkButton({ onSuccess, accessToken, label, className }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const isUpdateMode = Boolean(accessToken);

  useEffect(() => {
    const fetchLinkToken = async () => {
      try {
        const response = await fetch('/api/plaid/create-link-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(accessToken ? { access_token: accessToken } : {}),
        });
        const data = await response.json();
        if (data.link_token) {
          setLinkToken(data.link_token);
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to initialize Plaid Link',
          });
        }
      } catch {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to connect to Plaid',
        });
      }
    };

    fetchLinkToken();
  }, [toast, accessToken]);

  const handleOnSuccess = useCallback(
    async (publicToken: string, metadata: unknown) => {
      setLoading(true);
      try {
        if (!isUpdateMode) {
          // Normal mode: exchange token then sync
          const exchangeResponse = await fetch('/api/plaid/exchange-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_token: publicToken, metadata }),
          });
          if (!exchangeResponse.ok) throw new Error('Failed to exchange token');
        }

        // Both modes: sync transactions
        const syncResponse = await fetch('/api/plaid/sync-transactions', { method: 'POST' });
        if (!syncResponse.ok) throw new Error('Failed to sync transactions');

        onSuccess();
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to link account',
        });
      } finally {
        setLoading(false);
      }
    },
    [isUpdateMode, onSuccess, toast]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleOnSuccess,
  });

  const defaultLabel = isUpdateMode ? 'Reconnect' : 'Link Bank Account';
  const defaultClass =
    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all';

  return (
    <Button
      onClick={() => open()}
      disabled={!ready || loading}
      className={className ?? defaultClass}
    >
      {loading ? (isUpdateMode ? 'Reconnecting...' : 'Linking...') : (label ?? defaultLabel)}
    </Button>
  );
}
