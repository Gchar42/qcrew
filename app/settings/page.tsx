"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Session = {
  connected: boolean;
  user?: {
    discord_id: string;
    username: string;
    avatar_url: string | null;
    summoner_name: string;
    region: string;
    has_guilds_scope: boolean;
  };
  preferences?: {
    notify_rank_up: boolean;
    notify_win_streak: boolean;
    weekly_digest: boolean;
    streak_threshold: number;
  } | null;
};

type TrackedPlayer = { id: number; summoner_name: string; region: string; added_at: string };
type Webhook = { id: number; guild_id: string; channel_webhook_url: string; summoner_names_to_track: string[]; created_at: string };

export default function SettingsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [tracked, setTracked] = useState<TrackedPlayer[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectSummoner, setConnectSummoner] = useState("");
  const [connectRegion, setConnectRegion] = useState("na1");
  const [addTrackSummoner, setAddTrackSummoner] = useState("");
  const [addTrackRegion, setAddTrackRegion] = useState("na1");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookGuildId, setWebhookGuildId] = useState("");
  const [webhookSummoners, setWebhookSummoners] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    const res = await fetch("/api/discord/session");
    const data = await res.json();
    setSession(data);
    return data;
  }, []);

  const fetchTracked = useCallback(async () => {
    const res = await fetch("/api/discord/tracked");
    if (res.ok) setTracked(await res.json());
  }, []);

  const fetchWebhooks = useCallback(async () => {
    const res = await fetch("/api/discord/webhooks");
    if (res.ok) setWebhooks(await res.json());
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSession();
        if (data.connected) {
          await Promise.all([fetchTracked(), fetchWebhooks()]);
        }
      } catch (e) {
        setError("Failed to load settings");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchSession, fetchTracked, fetchWebhooks]);

  const handleConnectDiscord = () => {
    const name = connectSummoner.trim();
    if (!name) {
      setError("Enter your summoner name to link.");
      return;
    }
    const params = new URLSearchParams({ summoner_name: name, region: connectRegion || "na1" });
    window.location.href = `/api/auth/discord/connect?${params.toString()}`;
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Discord? You can reconnect later.")) return;
    setSaving("disconnect");
    try {
      await fetch("/api/discord/disconnect", { method: "POST" });
      await fetchSession();
      setTracked([]);
      setWebhooks([]);
    } finally {
      setSaving(null);
    }
  };

  const updatePref = async (updates: Partial<Session["preferences"]>) => {
    if (!session?.connected) return;
    setSaving("pref");
    try {
      const res = await fetch("/api/discord/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setSession((s) => (s ? { ...s, preferences: data } : s));
      }
    } finally {
      setSaving(null);
    }
  };

  const addTracked = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = addTrackSummoner.trim();
    if (!name) return;
    setSaving("track");
    try {
      const res = await fetch("/api/discord/tracked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summoner_name: name, region: addTrackRegion || "na1" }),
      });
      if (res.ok) await fetchTracked();
      else {
        const err = await res.json();
        setError(err.error || "Failed to add");
      }
      setAddTrackSummoner("");
    } finally {
      setSaving(null);
    }
  };

  const removeTracked = async (id: number) => {
    const res = await fetch(`/api/discord/tracked?id=${id}`, { method: "DELETE" });
    if (res.ok) await fetchTracked();
  };

  const addWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = webhookUrl.trim();
    const guildId = webhookGuildId.trim();
    if (!url || !guildId) {
      setError("Webhook URL and Server ID required.");
      return;
    }
    setSaving("webhook");
    try {
      const res = await fetch("/api/discord/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guild_id: guildId,
          channel_webhook_url: url,
          summoner_names_to_track: webhookSummoners.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        await fetchWebhooks();
        setWebhookUrl("");
        setWebhookGuildId("");
        setWebhookSummoners("");
      } else {
        const err = await res.json();
        setError(err.error || "Failed to add webhook");
      }
    } finally {
      setSaving(null);
    }
  };

  const removeWebhook = async (id: number) => {
    const res = await fetch(`/api/discord/webhooks?id=${id}`, { method: "DELETE" });
    if (res.ok) await fetchWebhooks();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0E0F15] text-[#E8E9F0] px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="h-8 w-32 bg-white/10 rounded animate-pulse mb-6" />
          <div className="space-y-4 h-64 bg-white/5 rounded-xl animate-pulse" />
        </div>
      </main>
    );
  }

  const prefs = session?.preferences;
  const isConnected = session?.connected ?? false;

  return (
    <main className="min-h-screen bg-[#0E0F15] text-[#E8E9F0] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Settings</h1>
        <p className="text-white/50 text-sm mb-6">Discord notifications and profile linking.</p>

        {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("error") === "need_summoner" && (
          <p className="text-amber-400 text-sm mb-4">Link your summoner name when connecting Discord.</p>
        )}
        {error && <p className="text-amber-400 text-sm mb-4">{error}</p>}

        {!isConnected && (
          <section className="rounded-xl border border-white/10 bg-[#151620] p-6 mb-6">
            <h2 className="text-lg font-semibold mb-2">Connect Discord</h2>
            <p className="text-white/60 text-sm mb-4">Link your Discord account to get notifications and use your avatar on your StatGap profile.</p>
            <div className="flex flex-wrap gap-3 items-end">
              <label className="block">
                <span className="text-xs text-white/50">Summoner name (e.g. Name#NA1)</span>
                <input
                  type="text"
                  value={connectSummoner}
                  onChange={(e) => setConnectSummoner(e.target.value)}
                  placeholder="YourName#NA1"
                  className="mt-1 block w-48 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30"
                />
              </label>
              <label className="block">
                <span className="text-xs text-white/50">Region</span>
                <select
                  value={connectRegion}
                  onChange={(e) => setConnectRegion(e.target.value)}
                  className="mt-1 block w-24 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                >
                  <option value="na1">NA</option>
                  <option value="euw1">EUW</option>
                  <option value="kr">KR</option>
                </select>
              </label>
              <button
                type="button"
                onClick={handleConnectDiscord}
                className="inline-flex items-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-medium text-white hover:bg-[#6875F5] transition"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                Connect Discord
              </button>
            </div>
          </section>
        )}

        {isConnected && session?.user && (
          <>
            <section className="rounded-xl border border-white/10 bg-[#151620] p-6 mb-6">
              <h2 className="text-lg font-semibold mb-3">Discord account</h2>
              <div className="flex items-center gap-3 mb-4">
                {session.user.avatar_url ? (
                  <img src={session.user.avatar_url} alt="" className="w-12 h-12 rounded-full" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/10" />
                )}
                <div>
                  <p className="font-medium">{session.user.username}</p>
                  <p className="text-white/50 text-sm">Linked to {session.user.summoner_name} ({session.user.region})</p>
                </div>
              </div>
              {!session.user.has_guilds_scope && (
                <p className="text-sm text-white/60 mb-3">
                  <a href="/api/auth/discord/guilds" className="text-[#5865F2] hover:underline">Add server list</a> for &quot;Players you might know&quot; (optional).
                </p>
              )}
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={saving === "disconnect"}
                className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
              >
                {saving === "disconnect" ? "Disconnecting…" : "Disconnect Discord"}
              </button>
            </section>

            <section className="rounded-xl border border-white/10 bg-[#151620] p-6 mb-6">
              <h2 className="text-lg font-semibold mb-3">Notification preferences</h2>
              <p className="text-white/60 text-sm mb-4">Choose which DMs you receive from the StatGap bot.</p>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={prefs?.notify_rank_up ?? true}
                    onChange={(e) => updatePref({ notify_rank_up: e.target.checked })}
                    disabled={saving === "pref"}
                    className="rounded border-white/20 bg-white/5"
                  />
                  <span>Rank-up DMs when a tracked player ranks up</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={prefs?.notify_win_streak ?? true}
                    onChange={(e) => updatePref({ notify_win_streak: e.target.checked })}
                    disabled={saving === "pref"}
                    className="rounded border-white/20 bg-white/5"
                  />
                  <span>Win streak DMs</span>
                </label>
                <div className="flex items-center gap-3 pl-6">
                  <span className="text-white/60 text-sm">Streak threshold:</span>
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={prefs?.streak_threshold ?? 5}
                    onChange={(e) => updatePref({ streak_threshold: parseInt(e.target.value, 10) || 5 })}
                    disabled={saving === "pref"}
                    className="w-16 rounded bg-white/5 border border-white/10 px-2 py-1 text-sm"
                  />
                </div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={prefs?.weekly_digest ?? false}
                    onChange={(e) => updatePref({ weekly_digest: e.target.checked })}
                    disabled={saving === "pref"}
                    className="rounded border-white/20 bg-white/5"
                  />
                  <span>Weekly digest (Mondays 9am UTC)</span>
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-[#151620] p-6 mb-6">
              <h2 className="text-lg font-semibold mb-3">Tracked players</h2>
              <p className="text-white/60 text-sm mb-4">Get DMs when these summoners rank up or hit a win streak.</p>
              <form onSubmit={addTracked} className="flex flex-wrap gap-2 mb-4">
                <input
                  type="text"
                  value={addTrackSummoner}
                  onChange={(e) => setAddTrackSummoner(e.target.value)}
                  placeholder="Summoner name"
                  className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm w-40"
                />
                <select
                  value={addTrackRegion}
                  onChange={(e) => setAddTrackRegion(e.target.value)}
                  className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
                >
                  <option value="na1">NA</option>
                  <option value="euw1">EUW</option>
                  <option value="kr">KR</option>
                </select>
                <button type="submit" disabled={saving === "track"} className="rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-medium disabled:opacity-50">
                  Add
                </button>
              </form>
              <ul className="space-y-2">
                {tracked.map((t) => (
                  <li key={t.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                    <span>{t.summoner_name} ({t.region})</span>
                    <button type="button" onClick={() => removeTracked(t.id)} className="text-red-400 hover:text-red-300 text-xs">
                      Remove
                    </button>
                  </li>
                ))}
                {tracked.length === 0 && <li className="text-white/50 text-sm">No tracked players yet.</li>}
              </ul>
            </section>

            <section className="rounded-xl border border-white/10 bg-[#151620] p-6 mb-6">
              <h2 className="text-lg font-semibold mb-3">Server webhooks</h2>
              <p className="text-white/60 text-sm mb-4">Post rank-up and streak alerts to a Discord channel via webhook.</p>
              <form onSubmit={addWebhook} className="space-y-3 mb-4">
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="Webhook URL (from channel settings)"
                  className="block w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={webhookGuildId}
                  onChange={(e) => setWebhookGuildId(e.target.value)}
                  placeholder="Server ID (optional label)"
                  className="block w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
                />
                <textarea
                  value={webhookSummoners}
                  onChange={(e) => setWebhookSummoners(e.target.value)}
                  placeholder="Summoner names to track (one per line or comma-separated)"
                  rows={2}
                  className="block w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm resize-none"
                />
                <button type="submit" disabled={saving === "webhook"} className="rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-medium disabled:opacity-50">
                  Add webhook
                </button>
              </form>
              <ul className="space-y-2">
                {webhooks.map((w) => (
                  <li key={w.id} className="rounded-lg bg-white/5 px-3 py-2 text-sm">
                    <p className="text-white/70 truncate">{w.channel_webhook_url}</p>
                    <p className="text-white/50 text-xs mt-1">Tracked: {w.summoner_names_to_track.length ? w.summoner_names_to_track.join(", ") : "none"}</p>
                    <button type="button" onClick={() => removeWebhook(w.id)} className="mt-2 text-red-400 hover:text-red-300 text-xs">
                      Remove
                    </button>
                  </li>
                ))}
                {webhooks.length === 0 && <li className="text-white/50 text-sm">No webhooks added.</li>}
              </ul>
            </section>
          </>
        )}

        <p className="text-white/40 text-sm">
          <Link href="/" className="hover:text-white/60">Back to home</Link>
        </p>
      </div>
    </main>
  );
}
