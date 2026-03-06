import Link from "next/link";
import type { TeamVerdictType } from "@/lib/teamVerdict";

export const metadata = {
  title: "What is Team Verdict? – Statgap",
  description: "Team Verdict is an AI-analyzed stat that compares your performance to your teammates in League of Legends.",
};

const VERDICTS: Array<{
  type: TeamVerdictType;
  icon: "star" | "diamond" | "dot" | "triangle" | "x";
  borderClass: string;
  textClass: string;
  description: string;
}> = [
  {
    type: "Carried",
    icon: "star",
    borderClass: "border-amber-400/60",
    textClass: "text-amber-400",
    description: "Teammates showed outstanding performance across the board",
  },
  {
    type: "Solid",
    icon: "diamond",
    borderClass: "border-emerald-500/60",
    textClass: "text-emerald-500",
    description: "Teammates played above average and kept the game stable",
  },
  {
    type: "Neutral",
    icon: "dot",
    borderClass: "border-zinc-500/60",
    textClass: "text-zinc-400",
    description: "Teammates performed neither particularly well nor poorly",
  },
  {
    type: "Deadweight",
    icon: "triangle",
    borderClass: "border-orange-500/60",
    textClass: "text-orange-500",
    description: "Teammates underperformed and left something to be desired",
  },
  {
    type: "Anchored",
    icon: "x",
    borderClass: "border-red-500/60",
    textClass: "text-red-500",
    description: "Teammates struggled overall, making the match frustrating",
  },
];

function VerdictIcon({ type }: { type: (typeof VERDICTS)[number]["icon"] }) {
  const cls = "w-5 h-5 shrink-0";
  if (type === "star")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2l2.5 6h4l-3.5 3 1 6-4-4-4 4 1-6-3.5-3h4L12 2z" />
      </svg>
    );
  if (type === "diamond")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2L3 12l9 10 9-10L12 2zm0 3.5L18 12 12 19.5 6 12l6-6.5z" />
      </svg>
    );
  if (type === "dot")
    return (
      <span className={`${cls} rounded-full bg-current inline-block`} style={{ width: 10, height: 10 }} aria-hidden />
    );
  if (type === "triangle")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 4L4 20h16L12 4zm0 4l5 10H7l5-10z" />
      </svg>
    );
  return (
    <svg className={cls} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} fill="none" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export default function TeamVerdictPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
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

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-14">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Team Verdict
            </h2>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-amber-400">
                <VerdictIcon type="star" />
              </span>
              <span className="text-xl font-semibold text-amber-400">Carried</span>
              <span className="ml-auto rounded px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                Win
              </span>
            </div>
            <p className="text-zinc-400 text-sm mb-4">
              Teammates showed outstanding performance across the board.
            </p>
            <dl className="text-sm text-zinc-500 space-y-1">
              <div><dt className="inline font-medium text-zinc-400">Player:</dt> Summoner</div>
              <div><dt className="inline font-medium text-zinc-400">KDA:</dt> 8 / 3 / 12</div>
              <div><dt className="inline font-medium text-zinc-400">Duration:</dt> 31:42</div>
            </dl>
          </section>

          <section>
            <h1 className="text-2xl font-bold text-white mb-3">
              What is Team Verdict?
            </h1>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              Team Verdict is an AI-analyzed stat that compares your individual performance to that of your teammates. It helps reduce ranked game stress and gives you a clearer, more objective view of your gameplay.
            </p>
            <div className="space-y-4">
              {VERDICTS.map((v) => (
                <div
                  key={v.type}
                  className={`rounded-xl border bg-white/5 p-4 ${v.borderClass}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={v.textClass}>
                      <VerdictIcon type={v.icon} />
                    </span>
                    <span className={`font-semibold ${v.textClass}`}>{v.type}</span>
                  </div>
                  <p className="text-zinc-400 text-sm pl-7">{v.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="pt-8 border-t border-white/10">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4 text-center">
            Inline badges (for match history)
          </h2>
          <div className="flex flex-wrap justify-center gap-3 mb-4">
            {VERDICTS.map((v) => (
              <span
                key={v.type}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${v.borderClass} ${v.textClass} bg-black/20`}
                title={v.description}
              >
                <VerdictIcon type={v.icon} />
                {v.type}
              </span>
            ))}
          </div>
          <p className="text-center text-zinc-500 text-sm">
            Hover over a badge to see the tooltip.
          </p>
        </section>
      </main>
    </div>
  );
}
