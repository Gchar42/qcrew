import { notFound } from "next/navigation";
import SummonerProfileBeige from "@/components/SummonerProfileBeige";
import { getAccount } from "@/lib/riot-api";

export default async function SummonerByRegionNameTagPage({
  params,
}: {
  params: Promise<{ region: string; name: string; tag: string }>;
}) {
  const { region, name: nameEnc, tag: tagEnc } = await params;
  const name = decodeURIComponent(nameEnc);
  const tag = decodeURIComponent(tagEnc);

  const account = await getAccount(region, name, tag);
  if (!account) notFound();

  const riotId = `${name}#${tag}`;
  return <SummonerProfileBeige riotId={riotId} region={region} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string; name: string; tag: string }>;
}) {
  await params;
  return { title: "Summoner · Qcrew" };
}
