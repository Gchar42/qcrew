import Link from "next/link";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
];

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-white/10 flex flex-col bg-[var(--background)]">
      <Link
        href="/dashboard"
        className="p-4 text-lg font-bold text-white border-b border-white/10 hover:text-indigo-400 transition-colors"
      >
        Qcrew
      </Link>
      <nav className="p-2 flex flex-col gap-1">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
