import Link from "next/link";

export const metadata = {
  title: "Terms of Service – Statgap.gg",
  description: "Terms of Service for Statgap.gg",
};

export default function TermsPage() {
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
        <h1 className="text-2xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-zinc-500 text-sm mb-8">Last updated: March 2025</p>

        <div className="space-y-6 text-zinc-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-semibold mb-2">1. Acceptance</h2>
            <p>
              By using Statgap.gg (“the Service”), you agree to these Terms of
              Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">2. Description of Service</h2>
            <p>
              Statgap provides League of Legends match history and statistics
              by using the Riot Games API. The Service is free and is not
              affiliated with, endorsed by, or in partnership with Riot Games.
              Use of Riot’s services is subject to Riot’s terms and policies.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">3. Acceptable Use</h2>
            <p>
              You may not use the Service to violate any law, abuse others, or
              attempt to gain unauthorized access to our or any third-party
              systems. You may not scrape, overload, or automate access in a way
              that harms the Service or Riot’s APIs. We may suspend or terminate
              access for abuse.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">4. No Warranty</h2>
            <p>
              The Service is provided “as is.” We do not guarantee availability,
              accuracy, or fitness for a particular purpose. We are not liable
              for decisions you make based on stats or any data shown.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">5. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Statgap and its operators
              are not liable for any indirect, incidental, or consequential
              damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">6. Changes</h2>
            <p>
              We may update these Terms from time to time. The “Last updated”
              date at the top will change when we do. Continued use of the
              Service after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">7. Contact</h2>
            <p>
              For questions about these Terms, use the contact or support option
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
