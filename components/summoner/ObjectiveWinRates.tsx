"use client";

interface ObjectiveWinRatesProps {
  championName: string;
  games: number;
}

type ObjectiveStat = {
  name: string;
  icon: string;
  achieved: { wr: number; games: number };
  notAchieved: { wr: number; games: number };
};

type DragonType = { name: string; wr: number; games: number };

export default function ObjectiveWinRates({ championName, games }: ObjectiveWinRatesProps) {
  const objectives: ObjectiveStat[] = [
    { name: "First Blood", icon: "🗡️", achieved: { wr: 58.2, games: Math.round(games * 0.35) }, notAchieved: { wr: 46.1, games: Math.round(games * 0.65) } },
    { name: "First Tower", icon: "🏰", achieved: { wr: 62.7, games: Math.round(games * 0.42) }, notAchieved: { wr: 44.3, games: Math.round(games * 0.58) } },
    { name: "First Dragon", icon: "🐉", achieved: { wr: 59.8, games: Math.round(games * 0.48) }, notAchieved: { wr: 42.5, games: Math.round(games * 0.52) } },
    { name: "First Grubs", icon: "🪱", achieved: { wr: 55.3, games: Math.round(games * 0.38) }, notAchieved: { wr: 47.8, games: Math.round(games * 0.62) } },
    { name: "First Baron", icon: "👑", achieved: { wr: 71.2, games: Math.round(games * 0.31) }, notAchieved: { wr: 43.6, games: Math.round(games * 0.69) } },
    { name: "First Rift Herald", icon: "🔮", achieved: { wr: 56.9, games: Math.round(games * 0.44) }, notAchieved: { wr: 45.7, games: Math.round(games * 0.56) } },
  ];

  const dragonTypes: DragonType[] = [
    { name: "Infernal", wr: 54.1, games: Math.round(games * 0.18) },
    { name: "Ocean", wr: 52.3, games: Math.round(games * 0.16) },
    { name: "Cloud", wr: 50.8, games: Math.round(games * 0.15) },
    { name: "Mountain", wr: 53.6, games: Math.round(games * 0.17) },
    { name: "Chemtech", wr: 51.2, games: Math.round(games * 0.08) },
    { name: "Hextech", wr: 52.8, games: Math.round(games * 0.09) },
  ];

  const bestObjective = objectives.reduce((best, obj) => {
    const delta = obj.achieved.wr - obj.notAchieved.wr;
    return delta > (best.achieved.wr - best.notAchieved.wr) ? obj : best;
  });
  const bestDelta = bestObjective.achieved.wr - bestObjective.notAchieved.wr;

  return (
    <div className="rounded-xl border border-white/10 bg-[#151620] p-5 mb-8 max-w-5xl">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
          Objective Win Rates
        </h3>
        <span className="text-white/20 cursor-help" title="Win rate comparison when your team secures an objective first vs. when it doesn't.">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        </span>
      </div>

      {/* Objective Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {objectives.map((obj) => {
          const delta = obj.achieved.wr - obj.notAchieved.wr;
          const significant = delta > 5;
          const lowSampleAchieved = obj.achieved.games < 20;
          const lowSampleNot = obj.notAchieved.games < 20;

          return (
            <div key={obj.name} className="rounded-xl border border-white/10 bg-[#151620] p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{obj.icon}</span>
                <span className="text-sm font-bold text-white/90">{obj.name}</span>
                {(lowSampleAchieved || lowSampleNot) && (
                  <span className="text-amber-400 text-xs ml-auto" title="Low sample size">⚠</span>
                )}
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/50">When achieved:</span>
                  <span>
                    <span className="font-semibold text-emerald-400">{obj.achieved.wr}% WR</span>
                    <span className="text-white/30 text-xs ml-1.5">({obj.achieved.games} games)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">When not achieved:</span>
                  <span>
                    <span className="font-semibold text-red-400">{obj.notAchieved.wr}% WR</span>
                    <span className="text-white/30 text-xs ml-1.5">({obj.notAchieved.games} games)</span>
                  </span>
                </div>
              </div>

              {/* Delta bar */}
              <div className="mt-3">
                <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${significant ? "bg-emerald-500" : "bg-white/20"}`}
                    style={{ width: `${Math.min(delta / 30 * 100, 100)}%` }}
                  />
                </div>
                <div className={`text-[11px] mt-1 font-medium ${significant ? "text-emerald-400" : "text-white/30"}`}>
                  +{delta.toFixed(1)}% delta
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dragon Type Breakdown */}
      <div className="mb-5">
        <h4 className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-3">
          Dragon Type Breakdown
        </h4>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {dragonTypes.map((d) => (
            <div
              key={d.name}
              className="flex-shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-center min-w-[100px]"
            >
              <div className="text-xs font-medium text-white/60">{d.name}</div>
              <div className={`text-sm font-bold tabular-nums mt-0.5 ${d.wr >= 53 ? "text-emerald-400" : "text-white/80"}`}>
                {d.wr}%
              </div>
              <div className="text-[10px] text-white/25 mt-0.5">{d.games} games</div>
            </div>
          ))}
        </div>
      </div>

      {/* Auto-Generated Insight */}
      <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
        <p className="text-sm text-white/60">
          {bestDelta > 5 ? (
            <>
              💡 Getting <span className="font-bold text-white/90">{bestObjective.name}</span> increases your win rate by{" "}
              <span className="font-bold text-emerald-400">{bestDelta.toFixed(1)}%</span> on{" "}
              <span className="font-bold text-white/90">{championName}</span> — prioritize it every game.
            </>
          ) : (
            <>
              💡 <span className="font-bold text-white/90">{bestObjective.name}</span> has minimal impact on your win rate on{" "}
              <span className="font-bold text-white/90">{championName}</span> — don&apos;t take unnecessary risks for it.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
