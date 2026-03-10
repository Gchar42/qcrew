/**
 * Discord notification helpers: rank-up and win-streak DMs + webhook posts.
 * Uses DISCORD_BOT_TOKEN and RIOT_API_KEY (via internal fetch to league API).
 */

import { sendDiscordDm, postDiscordWebhook } from "@/lib/discord";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const SITE_URL = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : process.env.NEXT_PUBLIC_SITE_URL ?? "https://statgap.gg";

function parseRiotId(summonerName: string): { gameName: string; tagLine: string } | null {
  const hash = summonerName.indexOf("#");
  if (hash === -1) return null;
  const gameName = summonerName.slice(0, hash).trim();
  const tagLine = summonerName.slice(hash + 1).trim();
  return gameName && tagLine ? { gameName, tagLine } : null;
}

async function getAccountPuuid(region: string, summonerName: string): Promise<string | null> {
  const parsed = parseRiotId(summonerName);
  if (!parsed) return null;
  const base = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "http://localhost:3000";
  const res = await fetch(
    `${base}/api/riot/account?region=${encodeURIComponent(region)}&gameName=${encodeURIComponent(parsed.gameName)}&tagLine=${encodeURIComponent(parsed.tagLine)}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.puuid ?? null;
}

type LeagueEntry = { tier: string; rank: string; leaguePoints: number; queueType: string };

async function getSoloRank(region: string, puuid: string): Promise<LeagueEntry | null> {
  const base = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "http://localhost:3000";
  const res = await fetch(`${base}/api/riot/league?platform=${encodeURIComponent(region)}&puuid=${encodeURIComponent(puuid)}`);
  if (!res.ok) return null;
  const entries = await res.json();
  const solo = Array.isArray(entries) ? entries.find((e: LeagueEntry) => e.queueType === "RANKED_SOLO_5x5") : null;
  return solo ?? null;
}

export async function checkRankUpsAndNotify(): Promise<{ rankUps: number; errors: number }> {
  const { data: trackedRows } = await supabaseAdmin.from("tracked_players").select("summoner_name, region");
  if (!trackedRows?.length) return { rankUps: 0, errors: 0 };

  const unique = Array.from(new Map(trackedRows.map((t) => [`${t.summoner_name}:${t.region}`, t])).values());
  let rankUps = 0;
  let errors = 0;

  for (const { summoner_name, region } of unique) {
    try {
      const puuid = await getAccountPuuid(region, summoner_name);
      if (!puuid) continue;
      const current = await getSoloRank(region, puuid);
      const prev = await supabaseAdmin.from("rank_check_snapshots").select("tier, rank, league_points").eq("summoner_name", summoner_name).eq("region", region).single();

      await supabaseAdmin.from("rank_check_snapshots").upsert(
        {
          summoner_name,
          region,
          tier: current?.tier ?? null,
          rank: current?.rank ?? null,
          league_points: current?.leaguePoints ?? null,
          checked_at: new Date().toISOString(),
        },
        { onConflict: "summoner_name,region" }
      );

      const prevTier = prev.data?.tier;
      const prevRank = prev.data?.rank;
      const newTier = current?.tier;
      const newRank = current?.rank;
      const rankChanged = prev.data && (prevTier !== newTier || prevRank !== newRank) && newTier;
      if (!rankChanged) continue;

      const rankLabel = [newTier, newRank].filter(Boolean).join(" ");
      const watchers = await supabaseAdmin
        .from("tracked_players")
        .select("discord_id")
        .eq("summoner_name", summoner_name)
        .eq("region", region);
      const prefs = await supabaseAdmin.from("notification_preferences").select("discord_id, notify_rank_up").in("discord_id", (watchers.data ?? []).map((w) => w.discord_id));
      const toDm = (prefs.data ?? []).filter((p) => p.notify_rank_up).map((p) => p.discord_id);

      for (const discordId of toDm) {
        try {
          await sendDiscordDm(discordId, { content: `🏆 **${summoner_name}** just ranked up to **${rankLabel}**!` });
          rankUps++;
        } catch {
          errors++;
        }
      }

      const webhooks = await supabaseAdmin.from("server_webhooks").select("channel_webhook_url, summoner_names_to_track").contains("summoner_names_to_track", [summoner_name]);
      const profileUrl = `${SITE_URL}/summoner?riotId=${encodeURIComponent(summoner_name)}&region=${encodeURIComponent(region)}`;
      for (const w of webhooks.data ?? []) {
        if (!w.summoner_names_to_track?.includes(summoner_name)) continue;
        try {
          await postDiscordWebhook(w.channel_webhook_url, {
            embeds: [
              {
                title: "Rank up",
                description: `${summoner_name} is now **${rankLabel}**`,
                url: profileUrl,
                color: 0x5865f2,
              },
            ],
          });
        } catch {
          errors++;
        }
      }
    } catch {
      errors++;
    }
  }
  return { rankUps, errors };
}

export async function sendWeeklyDigests(): Promise<{ sent: number; errors: number }> {
  const { data: prefs } = await supabaseAdmin.from("notification_preferences").select("discord_id").eq("weekly_digest", true);
  if (!prefs?.length) return { sent: 0, errors: 0 };
  let sent = 0;
  let errors = 0;
  for (const { discord_id } of prefs) {
    try {
      const { data: trackList } = await supabaseAdmin.from("tracked_players").select("summoner_name, region").eq("discord_id", discord_id);
      const lines = (trackList ?? []).map((t) => `• ${t.summoner_name} (${t.region})`).join("\n");
      const content = lines ? `**Weekly digest – tracked players**\n\n${lines}\n\n*(LP and win rate summary requires Riot data integration; coming soon.)*` : "**Weekly digest**\n\nYou have no tracked players. Add some in Settings!";
      await sendDiscordDm(discord_id, { content });
      sent++;
    } catch {
      errors++;
    }
  }
  return { sent, errors };
}
