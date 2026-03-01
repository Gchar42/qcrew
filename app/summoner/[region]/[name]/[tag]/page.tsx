import { notFound } from "next/navigation";
import Link from "next/link";
import { SummonerProfile } from "@/components/summoner/SummonerProfile";
import { getAccount, getSummoner, getMatchIds, getMatch } from "@/lib/riot-api";
import type { AccountDto, SummonerDto, MatchDto } from "@/types/riot";

export default async function SummonerPage({
  params,
}: {
  params: Promise<{ region: string; name: string; tag: string }>;
}) {
  const { region, name: nameEnc, tag: tagEnc } = await params;
  const name = decodeURIComponent(nameEnc);
  const tag = decodeURIComponent(tagEnc);

  const account = await getAccount(region, name, tag);
  if (!account) notFound();

  const [summoner, matchIds] = await Promise.all([
    getSummoner(region, account.puuid),
    getMatchIds(region, account.puuid, 20),
  ]);

  const matchDetails = await Promise.all(
    matchIds.slice(0, 20).map((id) => getMatch(region, id))
  );
  const matches = matchDetails.filter((m): m is MatchDto => m != null);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold text-white hover:text-indigo-400 transition-colors"
          >
            Qcrew
          </Link>
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            ← New search
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <SummonerProfile
          region={region}
          account={account}
          summoner={summoner ?? undefined}
          matches={matches}
        />
      </main>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string; name: string; tag: string }>;
}) {
  await params;
  return { title: "Summoner · Qcrew" };
}
