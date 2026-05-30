import Link from 'next/link';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-white/[0.06]">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link
            href="/"
            className="text-xl font-semibold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent"
          >
            Ledge
          </Link>
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
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        {children}
      </main>
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
