'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import {
  LayoutDashboard,
  CreditCard,
  PieChart,
  Building2,
  Settings,
  LogOut,
  Menu,
  X,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transactions', icon: CreditCard },
  { href: '/dashboard/budgets', label: 'Budgets', icon: PieChart },
  { href: '/dashboard/accounts', label: 'Accounts', icon: Building2 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <img src="/icon-192.png" alt="" width={32} height={32} className="rounded-md" />
          <div>
            <h1 className="text-xl font-semibold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent leading-tight">Ledge</h1>
            <p className="text-xs text-white/40 leading-tight">Personal Finance</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-150',
                    isActive
                      ? 'bg-white/[0.08] text-white'
                      : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80'
                  )}
                >
                  <Icon className={cn('h-[18px] w-[18px]', isActive && 'text-emerald-400')} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto p-4 border-t border-white/[0.06] bg-[#0a0a0a]">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center">
            {session?.user?.name?.[0]?.toUpperCase() || (
              <User className="h-4 w-4 text-emerald-400/70" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white/80 truncate">
              {session?.user?.name || session?.user?.email || 'User'}
            </p>
            <p className="text-xs text-white/40 truncate">
              {session?.user?.email}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full mt-2 text-white/40 hover:text-white/80 hover:bg-white/[0.04] justify-start"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white/[0.05] backdrop-blur-sm border border-white/[0.08] rounded-lg text-white/70 hover:bg-white/[0.08] transition-colors"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex w-64 h-screen sticky top-0 bg-[#0a0a0a] border-r border-white/[0.06] text-white flex-col">
        {sidebarContent}
      </aside>

      {/* Sidebar - mobile */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 w-64 h-screen bg-[#0a0a0a] border-r border-white/[0.06] text-white flex flex-col z-50 transform transition-transform duration-200 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
