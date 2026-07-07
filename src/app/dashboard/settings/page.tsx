'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Lock,
  Download,
  Trash2,
  Pencil,
  X,
  Check,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function LoadingSkeleton() {
  return (
    <div className="p-4 md:p-8 pt-16 lg:pt-8 space-y-6">
      <div className="h-8 bg-white/5 rounded w-32 animate-pulse" />
      <div className="max-w-2xl space-y-6">
        <div className="h-48 bg-white/[0.03] border border-white/[0.06] rounded-xl animate-pulse" />
        <div className="h-32 bg-white/[0.03] border border-white/[0.06] rounded-xl animate-pulse" />
        <div className="h-24 bg-white/[0.03] border border-white/[0.06] rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch('/api/user');
      if (!response.ok) throw new Error('Failed to fetch user');
      const userData = await response.json();
      setUser(userData);
      setNameValue(userData.name || '');
    } catch (error) {
      console.error('Failed to fetch user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load profile',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleSaveName = async () => {
    setSavingName(true);
    try {
      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameValue }),
      });
      if (!response.ok) throw new Error('Failed to update name');
      const updatedUser = await response.json();
      setUser(updatedUser);
      setEditingName(false);
      toast({
        title: 'Profile updated',
        description: 'Your name has been updated.',
      });
    } catch (error) {
      console.error('Failed to update name:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update name',
      });
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'New passwords do not match',
      });
      return;
    }

    setSavingPassword(true);
    try {
      const response = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to change password');
      }

      setChangingPassword(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({
        title: 'Password changed',
        description: 'Your password has been updated.',
      });
    } catch (error) {
      console.error('Failed to change password:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to change password',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/user/export');
      if (!response.ok) throw new Error('Failed to export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Export complete',
        description: 'Your transactions have been downloaded.',
      });
    } catch (error) {
      console.error('Failed to export:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to export transactions',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please type DELETE to confirm',
      });
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch('/api/user', {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete account');

      toast({
        title: 'Account deleted',
        description: 'Your account has been permanently deleted.',
      });

      // Sign out and redirect
      await signOut({ redirect: false });
      router.push('/');
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete account',
      });
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="p-4 md:p-8 pt-16 lg:pt-8 space-y-6 text-white min-h-screen">
      {/* Header */}
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Settings</h1>

      <div className="max-w-2xl space-y-6">
        {/* Profile Section */}
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-white/90 text-base font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-white/50" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div className="flex items-center justify-between py-2">
              <div className="flex-1">
                <Label className="text-sm text-white/50">Name</Label>
                {editingName ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      className="h-9 bg-white/[0.06] border-white/[0.1] text-white max-w-xs"
                      placeholder="Enter your name"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSaveName}
                      disabled={savingName}
                      className="h-9 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                    >
                      {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingName(false);
                        setNameValue(user?.name || '');
                      }}
                      disabled={savingName}
                      className="h-9 px-2 text-white/40 hover:text-white/80 hover:bg-white/[0.06]"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-white/90 mt-1">{user?.name || 'Not set'}</p>
                )}
              </div>
              {!editingName && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingName(true)}
                  className="text-white/40 hover:text-white/80 hover:bg-white/[0.06]"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Email */}
            <div className="py-2 border-t border-white/[0.06]">
              <Label className="text-sm text-white/50">Email</Label>
              <p className="text-white/90 mt-1">{user?.email}</p>
            </div>

            {/* Member Since */}
            <div className="py-2 border-t border-white/[0.06]">
              <Label className="text-sm text-white/50">Member since</Label>
              <p className="text-white/90 mt-1">{user?.createdAt ? formatDate(user.createdAt) : '-'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-white/90 text-base font-medium flex items-center gap-2">
              <Lock className="h-4 w-4 text-white/50" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            {changingPassword ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-white/50">Current Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="mt-1 bg-white/[0.06] border-white/[0.1] text-white"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <Label className="text-sm text-white/50">New Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="mt-1 bg-white/[0.06] border-white/[0.1] text-white"
                    placeholder="Enter new password"
                  />
                  <p className="text-xs text-white/30 mt-1">
                    Min 8 characters with uppercase, lowercase, and number
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-white/50">Confirm New Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="mt-1 bg-white/[0.06] border-white/[0.1] text-white"
                    placeholder="Confirm new password"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleChangePassword}
                    disabled={savingPassword}
                    className="bg-white/[0.1] hover:bg-white/[0.15] text-white"
                  >
                    {savingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Password
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setChangingPassword(false);
                      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    disabled={savingPassword}
                    className="text-white/60 hover:text-white/80 hover:bg-white/[0.06]"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm text-white/50">Password</Label>
                  <p className="text-white/90 mt-1">••••••••••</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setChangingPassword(true)}
                  className="text-white/60 hover:text-white/80 hover:bg-white/[0.06]"
                >
                  Change Password
                </Button>
              </div>
            )}

            {/* MFA is required on every sign-in and cannot be disabled */}
            <div className="flex items-center justify-between py-4 border-t border-white/[0.06]">
              <div>
                <Label className="text-sm text-white/50">Two-Factor Authentication</Label>
                <p className="text-white/90 mt-1">Enabled</p>
                <p className="text-xs text-white/40 mt-0.5">
                  A verification code is sent to your email when you sign in
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Section */}
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-white/90 text-base font-medium flex items-center gap-2">
              <Download className="h-4 w-4 text-white/50" />
              Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-white/90">Export Transactions</p>
                <p className="text-sm text-white/40 mt-0.5">Download all your transactions as a CSV file</p>
              </div>
              <Button
                variant="ghost"
                onClick={handleExport}
                disabled={exporting}
                className="text-white/60 hover:text-white/80 hover:bg-white/[0.06]"
              >
                {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-rose-500/[0.03] border-rose-500/20 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-rose-400 text-base font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-white/90">Delete Account</p>
                <p className="text-sm text-white/40 mt-0.5">
                  Permanently delete your account and all associated data including linked accounts and transactions.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="bg-white/[0.06] border-white/[0.1] text-white sm:max-w-xs"
                  placeholder='Type "DELETE" to confirm'
                />
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirm !== 'DELETE'}
                  className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Delete Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
