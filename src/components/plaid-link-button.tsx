'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PlaidLinkButtonProps {
  onSuccess: () => void;
}

export function PlaidLinkButton({ onSuccess }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchLinkToken = async () => {
      try {
        const response = await fetch('/api/plaid/create-link-token', {
          method: 'POST',
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
  }, [toast]);

  const handleOnSuccess = useCallback(
    async (publicToken: string, metadata: unknown) => {
      setLoading(true);

      try {
        const exchangeResponse = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_token: publicToken, metadata }),
        });

        if (!exchangeResponse.ok) {
          throw new Error('Failed to exchange token');
        }

        const syncResponse = await fetch('/api/plaid/sync-transactions', {
          method: 'POST',
        });

        if (!syncResponse.ok) {
          throw new Error('Failed to sync transactions');
        }

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
    [onSuccess, toast]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleOnSuccess,
  });

  return (
    <Button
      onClick={() => open()}
      disabled={!ready || loading}
      className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all"
    >
      {loading ? 'Linking...' : 'Link Bank Account'}
    </Button>
  );
}
