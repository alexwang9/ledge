'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlaidLinkButton } from '@/components/plaid-link-button';
import { useToast } from '@/hooks/use-toast';
import {
  Building2,
  CreditCard,
  Landmark,
  PiggyBank,
  TrendingUp,
  Wallet,
  AlertCircle,
  Trash2,
  RefreshCw,
} from 'lucide-react';

interface Account {
  id: string;
  name: string;
  officialName: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  currentBalance: number | null;
  availableBalance: number | null;
  limit: number | null;
  isoCurrencyCode: string | null;
}

interface Institution {
  id: string;
  institutionId: string;
  institutionName: string;
  connectedAt: string;
  accounts: Account[];
  error: string | null;
}

interface AccountsData {
  institutions: Institution[];
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getAccountIcon(type: string, subtype: string | null) {
  const iconClass = 'h-4 w-4';

  if (type === 'credit') {
    return <CreditCard className={iconClass} />;
  }
  if (type === 'depository') {
    if (subtype === 'savings' || subtype === 'cd' || subtype === 'money market') {
      return <PiggyBank className={iconClass} />;
    }
    return <Landmark className={iconClass} />;
  }
  if (type === 'investment' || type === 'brokerage') {
    return <TrendingUp className={iconClass} />;
  }
  if (type === 'loan' || type === 'mortgage') {
    return <Building2 className={iconClass} />;
  }
  return <Wallet className={iconClass} />;
}

function getAccountTypeLabel(type: string, subtype: string | null): string {
  if (subtype) {
    return subtype.charAt(0).toUpperCase() + subtype.slice(1).replace(/_/g, ' ');
  }
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function getBalanceLabel(type: string): string {
  if (type === 'credit' || type === 'loan' || type === 'mortgage') {
    return 'Balance';
  }
  return 'Available';
}

function getDisplayBalance(account: Account): number | null {
  if (account.type === 'credit' || account.type === 'loan' || account.type === 'mortgage') {
    return account.currentBalance;
  }
  return account.availableBalance ?? account.currentBalance;
}

function LoadingSkeleton() {
  return (
    <div className="p-4 md:p-8 pt-16 lg:pt-8 space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-8 bg-white/5 rounded w-32 animate-pulse" />
        <div className="h-10 bg-white/5 rounded w-36 animate-pulse" />
      </div>
      <div className="space-y-4">
        <div className="h-48 bg-white/[0.03] border border-white/[0.06] rounded-xl animate-pulse" />
        <div className="h-48 bg-white/[0.03] border border-white/[0.06] rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const [data, setData] = useState<AccountsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/accounts');
      if (!response.ok) throw new Error('Failed to fetch accounts');
      const accountsData = await response.json();
      setData(accountsData);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load accounts',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handlePlaidSuccess = useCallback(() => {
    toast({
      title: 'Account linked!',
      description: 'Your account has been connected.',
    });
    setLoading(true);
    fetchAccounts();
  }, [fetchAccounts, toast]);

  const handleUnlink = async (institutionId: string, institutionName: string) => {
    if (!confirm(`Are you sure you want to unlink ${institutionName}? This will also remove all associated transactions.`)) {
      return;
    }

    setUnlinking(institutionId);
    try {
      const response = await fetch(`/api/accounts/${institutionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to unlink account');

      toast({
        title: 'Account unlinked',
        description: `${institutionName} has been disconnected.`,
      });
      await fetchAccounts();
    } catch (error) {
      console.error('Failed to unlink account:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to unlink account',
      });
    } finally {
      setUnlinking(null);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchAccounts();
    toast({
      title: 'Accounts refreshed',
      description: 'Account balances have been updated.',
    });
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  const institutions = data?.institutions || [];
  const totalAccounts = institutions.reduce((sum, inst) => sum + inst.accounts.length, 0);

  // Calculate totals by type
  const totals = institutions.reduce(
    (acc, inst) => {
      for (const account of inst.accounts) {
        const balance = account.currentBalance || 0;
        if (account.type === 'depository') {
          acc.cash += balance;
        } else if (account.type === 'credit') {
          acc.credit += balance;
        } else if (account.type === 'investment' || account.type === 'brokerage') {
          acc.investments += balance;
        } else if (account.type === 'loan' || account.type === 'mortgage') {
          acc.loans += balance;
        }
      }
      return acc;
    },
    { cash: 0, credit: 0, investments: 0, loans: 0 }
  );

  const netWorth = totals.cash + totals.investments - totals.credit - totals.loans;

  return (
    <div className="p-4 md:p-8 pt-16 lg:pt-8 space-y-6 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Accounts</h1>
        <div className="flex items-center gap-2">
          {institutions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-white/60 hover:text-white hover:bg-white/[0.06]"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
          <PlaidLinkButton onSuccess={handlePlaidSuccess} />
        </div>
      </div>

      {institutions.length === 0 ? (
        /* Empty State */
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <CardContent className="py-16 text-center">
            <Building2 className="h-12 w-12 mx-auto text-white/20 mb-4" />
            <h2 className="text-lg font-medium text-white/80 mb-2">No accounts linked</h2>
            <p className="text-sm text-white/40 mb-6 max-w-md mx-auto">
              Connect your bank accounts, credit cards, and investment accounts to get a complete picture of your finances.
            </p>
            <PlaidLinkButton onSuccess={handlePlaidSuccess} />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="flex items-center gap-6 md:gap-8 py-3 px-4 rounded-lg bg-white/[0.02] border border-white/[0.06] overflow-x-auto">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-white/40 uppercase tracking-wide">Institutions</span>
              <span className="text-sm font-medium text-white/90">{institutions.length}</span>
            </div>
            <div className="w-px h-4 bg-white/[0.08]" />
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-white/40 uppercase tracking-wide">Accounts</span>
              <span className="text-sm font-medium text-white/90">{totalAccounts}</span>
            </div>
            <div className="w-px h-4 bg-white/[0.08]" />
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-white/40 uppercase tracking-wide">Cash</span>
              <span className="text-sm font-medium text-emerald-400">{formatCurrency(totals.cash)}</span>
            </div>
            {totals.credit > 0 && (
              <>
                <div className="w-px h-4 bg-white/[0.08]" />
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-white/40 uppercase tracking-wide">Credit</span>
                  <span className="text-sm font-medium text-rose-400">{formatCurrency(totals.credit)}</span>
                </div>
              </>
            )}
            {totals.investments > 0 && (
              <>
                <div className="w-px h-4 bg-white/[0.08]" />
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-white/40 uppercase tracking-wide">Investments</span>
                  <span className="text-sm font-medium text-blue-400">{formatCurrency(totals.investments)}</span>
                </div>
              </>
            )}
            <div className="w-px h-4 bg-white/[0.08]" />
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-white/40 uppercase tracking-wide">Net Worth</span>
              <span className={`text-sm font-medium ${netWorth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(netWorth)}
              </span>
            </div>
          </div>

          {/* Institutions List */}
          <div className="space-y-4">
            {institutions.map((institution) => (
              <Card key={institution.id} className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white/90 text-lg font-medium">
                        {institution.institutionName}
                      </CardTitle>
                      <p className="text-xs text-white/40 mt-1">
                        Connected {formatDate(institution.connectedAt)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlink(institution.id, institution.institutionName)}
                      disabled={unlinking === institution.id}
                      className="text-white/40 hover:text-rose-400 hover:bg-rose-500/10"
                    >
                      {unlinking === institution.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {institution.error ? (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20">
                      <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
                      <div>
                        <p className="text-sm text-rose-400 font-medium">Connection Error</p>
                        <p className="text-xs text-white/50 mt-0.5">
                          Unable to fetch accounts. Please try reconnecting.
                        </p>
                      </div>
                    </div>
                  ) : institution.accounts.length === 0 ? (
                    <p className="text-sm text-white/40 py-4 text-center">No accounts found</p>
                  ) : (
                    <div className="space-y-2">
                      {institution.accounts.map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center justify-between py-3 px-4 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/60">
                              {getAccountIcon(account.type, account.subtype)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white/80">
                                {account.name}
                                {account.mask && (
                                  <span className="text-white/40 ml-1">...{account.mask}</span>
                                )}
                              </p>
                              <p className="text-xs text-white/40">
                                {getAccountTypeLabel(account.type, account.subtype)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-medium ${
                              account.type === 'credit' || account.type === 'loan'
                                ? 'text-rose-400'
                                : 'text-white/90'
                            }`}>
                              {formatCurrency(getDisplayBalance(account))}
                            </p>
                            <p className="text-xs text-white/40">
                              {getBalanceLabel(account.type)}
                              {account.type === 'credit' && account.limit && (
                                <span> of {formatCurrency(account.limit)}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
