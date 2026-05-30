import Link from 'next/link';
import { auth } from '@/../../auth';
import { redirect } from 'next/navigation';
import { Building2, BarChart3, PiggyBank } from 'lucide-react';

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-white/[0.06]">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-xl font-semibold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            Ledge
          </div>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-white/50 hover:text-white/90 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/30 rounded-lg transition-all"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4">
        <div className="py-24 md:py-32 text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
            Take control of your finances
          </h1>
          <p className="text-lg md:text-xl text-white/40 mb-8 max-w-2xl mx-auto">
            Connect your bank accounts, track spending, and build better money
            habits. Ledge gives you a clear picture of where your money goes.
          </p>
          <div className="flex gap-4 justify-center flex-col sm:flex-row">
            <Link
              href="/register"
              className="px-8 py-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/30 rounded-lg font-medium transition-all"
            >
              Start for free
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 bg-white/[0.03] border border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:text-white/90 rounded-lg font-medium transition-all"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="py-16 border-t border-white/[0.06]">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.03] transition-colors">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white/90 mb-2">Connect Your Banks</h3>
              <p className="text-white/40 text-sm">
                Securely link your bank accounts using Plaid. All your
                transactions in one place.
              </p>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.03] transition-colors">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white/90 mb-2">Track Spending</h3>
              <p className="text-white/40 text-sm">
                See exactly where your money goes with automatic categorization
                and visual breakdowns.
              </p>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.03] transition-colors">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
                <PiggyBank className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white/90 mb-2">Build Savings</h3>
              <p className="text-white/40 text-sm">
                Monitor your net savings each month and watch your balance grow
                over time.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="container mx-auto px-4 text-center text-white/30 text-sm">
          <div className="flex justify-center gap-6 mb-4">
            <Link href="/privacy" className="hover:text-white/60 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">
              Terms of Service
            </Link>
          </div>
          Ledge &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
