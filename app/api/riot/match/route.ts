import { NextResponse } from "next/server";
import { getRoutingRegion } from "@/lib/riot-regions";
import { getCached, setCache } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RIOT_MATCH_BASE = "https://{region}.api.riotgames.com/lol/match/v5/matches";
const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };

/** Ensure each participant has numeric `skin` from payload (key kept as "skin"). */
function ensureParticipantSkin(data: Record<string, unknown>): void {
  const info = data.info as Record<string, unknown> | undefined;
  const rawParticipants = info?.participants as Record<string, unknown>[] | undefined;
  if (!rawParticipants?.length) return;
  const participants = rawParticipants.map((raw) => {
    const p = { ...raw } as Record<string, unknown>;
    const rawVal =
      raw.skin ?? raw.skinId ?? raw.championSkinId ?? (raw as Record<string, unknown>).Skin;
    const skin = rawVal != null ? Number(rawVal) : undefined;
    if (skin !== undefined && !Number.isNaN(skin)) {
      p.skin = skin;
    }
    return p;
  });
  (info as Record<string, unknown>).participants = participants;
}

export async function GET(request: Request) {
  const key = process.env.RIOT_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Riot API key not configured", status: 503 },
      { status: 503, headers: NO_CACHE }
    );
  }

  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region") ?? "na1";
  const id = searchParams.get("matchId");
  const debug = searchParams.get("debug") === "1";
  const puuidParam = searchParams.get("puuid");
  if (!id) {
    return NextResponse.json(
      { error: "Missing matchId", status: 400 },
      { status: 400, headers: NO_CACHE }
    );
  }

  const cacheKey = `match:${region}:${id}`;
  const cached = await getCached<Record<string, unknown>>(cacheKey);
  if (cached) {
    ensureParticipantSkin(cached);
    if (debug) {
      const info = cached.info as Record<string, unknown> | undefined;
      const participants = (info?.participants ?? []) as Record<string, unknown>[];
      const p = puuidParam
        ? participants.find((x) => x.puuid === puuidParam)
        : participants[0];
      const payload = {
        ...cached,
        debugParticipant: p
          ? {
              championName: p.championName,
              skin: p.skin,
              hasSkinKey: "skin" in p,
            }
          : null,
      };
      return NextResponse.json(payload, { headers: NO_CACHE });
    }
    return NextResponse.json(cached, { headers: NO_CACHE });
  }

  const routing = getRoutingRegion(region);
  const base = RIOT_MATCH_BASE.replace("{region}", routing);
  const url = `${base}/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "X-Riot-Token": key },
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[riot/match] Riot response:", res.status, res.statusText, text);
    const message = text || "Match fetch failed";
    return NextResponse.json(
      { error: message, status: res.status },
      { status: res.status, headers: NO_CACHE }
    );
  }

  const data = JSON.parse(text) as Record<string, unknown>;
  const rawInfo = data.info as Record<string, unknown> | undefined;
  const rawParticipants = rawInfo?.participants as Record<string, unknown>[] | undefined;

  if (rawParticipants?.length) {
    const first = rawParticipants[0] as Record<string, unknown>;
    console.log("participant keys", Object.keys(first));
    const sampleP = puuidParam
      ? (rawParticipants.find((x) => x.puuid === puuidParam) as Record<string, unknown>)
      : first;
    if (sampleP) {
      console.log("participant sample", {
        championName: sampleP.championName,
        skin: sampleP.skin,
        championId: sampleP.championId,
      });
    }
  }

  ensureParticipantSkin(data);

  const info = data.info as Record<string, unknown> | undefined;
  const participants = info?.participants as Record<string, unknown>[] | undefined;
  if (participants?.[0]) {
    console.log("Skin value:", (participants[0] as Record<string, unknown>).skin);
  }

  await setCache(cacheKey, data);

  if (debug) {
    const p = puuidParam
      ? participants?.find((x) => x.puuid === puuidParam)
      : participants?.[0];
    const payload = {
      ...data,
      debugParticipant: p
        ? {
            championName: p.championName,
            skin: p.skin,
            hasSkinKey: "skin" in (p as Record<string, unknown>),
          }
        : null,
    };
    return NextResponse.json(payload, { headers: NO_CACHE });
  }
  return NextResponse.json(data, { headers: NO_CACHE });
}
