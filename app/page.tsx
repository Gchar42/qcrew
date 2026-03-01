import Link from "next/link";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ code?: string; error?: string; error_code?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;

  if (params.code) {
    redirect(`/auth/callback?code=${encodeURIComponent(params.code)}`);
  }

  const hasError = params.error ?? params.error_code;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
        <header className="relative flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
          <span className="text-xl font-bold tracking-tight text-white">
            Qcrew
          </span>
          <nav className="flex items-center gap-4">
            <Link
              href="/auth"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/auth?tab=signup"
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 transition-colors glow"
            >
              Get started
            </Link>
          </nav>
        </header>
        <main className="relative max-w-6xl mx-auto px-6 pt-24 pb-32 text-center">
          {hasError && (
            <div className="mb-8 glass rounded-xl p-4 max-w-xl mx-auto text-left">
              <p className="text-amber-300 text-sm mb-2">
                Something went wrong with the sign-in link.
              </p>
              <p className="text-zinc-400 text-sm mb-3">
                {params.error_code && <span>Code: {params.error_code}. </span>}
                {params.error && <span>{params.error}</span>}
              </p>
              <Link
                href="/auth"
                className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
              >
                Try again on the sign-in page →
              </Link>
            </div>
          )}
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white mb-6">
            Your crew.
            <br />
            <span className="text-indigo-400 glow-text">Your matches.</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto mb-10">
            Create a crew, drop match links, and react with your squad. No Riot
            API yet — just you and your crew.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth?tab=signup"
              className="w-full sm:w-auto rounded-xl bg-indigo-500 px-8 py-4 text-base font-medium text-white hover:bg-indigo-600 transition-all hover-lift glow"
            >
              Create free account
            </Link>
            <Link
              href="/auth"
              className="w-full sm:w-auto rounded-xl glass px-8 py-4 text-base font-medium text-white border border-white/10 hover:border-indigo-500/30 transition-all hover-lift"
            >
              Sign in
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
