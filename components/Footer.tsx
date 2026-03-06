import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 py-4 px-6 mt-auto">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-zinc-500">
        <Link href="/terms" className="hover:text-zinc-300 transition-colors">
          Terms of Service
        </Link>
        <span aria-hidden>·</span>
        <Link href="/privacy" className="hover:text-zinc-300 transition-colors">
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}
