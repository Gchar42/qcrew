import type { AccountDto, SummonerDto } from "@/types/riot";

const PROFILE_ICON_BASE = "https://ddragon.leagueoflegends.com/cdn/14.6.1/img/profileicon";

export function SummonerHeader({
  account,
  summoner,
  wins,
  total,
  winRate,
}: {
  account: AccountDto;
  summoner?: SummonerDto;
  wins: number;
  total: number;
  winRate: number;
}) {
  const iconId = summoner?.profileIconId ?? 0;
  const level = summoner?.summonerLevel ?? 0;

  return (
    <div className="glass rounded-2xl p-6 flex flex-wrap items-center gap-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <img
            src={`${PROFILE_ICON_BASE}/${iconId}.png`}
            alt=""
            className="w-20 h-20 rounded-xl object-cover bg-white/5"
          />
          {level > 0 && (
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-zinc-800 text-xs font-medium text-white">
              {level}
            </span>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {account.gameName}#{account.tagLine}
          </h1>
          {summoner?.name && (
            <p className="text-zinc-400 text-sm mt-1">Summoner: {summoner.name}</p>
          )}
        </div>
      </div>
      {total > 0 && (
        <div className="ml-auto text-right">
          <div className="text-xl font-bold text-white">{winRate}% win rate</div>
          <div className="text-zinc-400 text-sm mt-1">
            {wins}W {total - wins}L (last {total})
          </div>
        </div>
      )}
    </div>
  );
}
