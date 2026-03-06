import Link from "next/link";

export const metadata = {
  title: "Privacy Policy – Statgap.gg",
  description: "Privacy Policy for Statgap.gg",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold text-white hover:text-indigo-400 transition-colors"
          >
            Statgap
          </Link>
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            ← Home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-zinc-500 text-sm mb-8">Last updated: March 2025</p>

        <div className="space-y-6 text-zinc-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-semibold mb-2">1. Overview</h2>
            <p>
              Statgap.gg (“we”) respects your privacy. This policy describes what
              data we collect, how we use it, and your choices when using our
              League of Legends stats service.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">2. Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong className="text-zinc-200">Riot IDs you search.</strong> When
                you search for a summoner, we may store the Riot ID and region to
                power search suggestions and history. This is not linked to you
                personally unless you sign in.
              </li>
              <li>
                <strong className="text-zinc-200">Account data (if you sign in).</strong> If
                you create an account, we store your email and account info via our
                auth provider (Supabase). We use this to manage your account only.
              </li>
              <li>
                <strong className="text-zinc-200">Usage data.</strong> Our hosting
                (e.g. Vercel) may log requests (IP, URL, timing) for security and
                operations. We do not use this to track you across the web.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">3. How We Use Data</h2>
            <p>
              We use the data above to provide and improve the Service (e.g.
              showing match history, powering search, and keeping the site
              secure). We do not sell your personal data. We do not use your data
              for advertising profiling.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">4. Third Parties</h2>
            <p>
              The Service uses:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <strong className="text-zinc-200">Riot Games API</strong> – to
                fetch match and summoner data. Riot’s use of data is governed by
                their privacy policy.
              </li>
              <li>
                <strong className="text-zinc-200">Supabase</strong> – for
                authentication and database (e.g. search history, cached data).
                Supabase processes data per their privacy terms.
              </li>
              <li>
                <strong className="text-zinc-200">Vercel</strong> – for hosting.
                Vercel may log request data as described in their privacy policy.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">5. Cookies and Storage</h2>
            <p>
              We use cookies or similar storage for authentication (when you sign
              in) and for session state. We use browser local storage to save your
              recent summoner searches and your favorites list so they persist
              on this device. We do not use third-party advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">6. Your Rights</h2>
            <p>
              Depending on where you live, you may have rights to access, correct,
              or delete your data. If you have an account, you can delete it or
              request data removal via the Service or by contacting us. For
              search history not tied to an account, we may retain it for a limited
              time for the Service to function.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">7. Changes</h2>
            <p>
              We may update this Privacy Policy. The “Last updated” date will
              change when we do. Continued use after changes means you accept the
              updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">8. Contact</h2>
            <p>
              For privacy-related questions, use the contact or support option
              provided on Statgap.gg.
            </p>
          </section>
        </div>

        <p className="mt-10 text-zinc-500 text-sm">
          <Link href="/" className="text-zinc-400 hover:text-white">
            ← Back to Statgap
          </Link>
        </p>
      </main>
    </div>
  );
}
