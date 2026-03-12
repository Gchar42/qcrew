"use client";

interface PostGameBreakdownProps {
  kills: number;
  deaths: number;
  assists: number;
  csPerMin: number;
  visionScore: number;
  gameDuration: number;
  goldEarned: number;
  damageDealt: number;
  teamTotalDamage: number;
  teamTotalKills: number;
  win: boolean;
}

interface Bullet {
  text: string;
  sentiment: "positive" | "negative" | "neutral";
  priority: number;
}

function generateBullets(props: PostGameBreakdownProps): Bullet[] {
  const {
    kills, deaths, assists, csPerMin, visionScore,
    gameDuration, goldEarned, damageDealt, teamTotalDamage, teamTotalKills,
    win,
  } = props;

  const bullets: Bullet[] = [];
  const kda = deaths === 0 ? kills + assists : (kills + assists) / deaths;
  const gameMinutes = gameDuration / 60;
  const visionPerMin = visionScore / gameMinutes;
  const damageShare = teamTotalDamage > 0 ? damageDealt / teamTotalDamage : 0;
  const killParticipation =
    teamTotalKills > 0 ? (kills + assists) / teamTotalKills : 0;

  if (deaths > kills + assists) {
    bullets.push({
      text: `You had ${deaths} deaths with only ${kills + assists} kill contributions — focus on dying less and trading smarter`,
      sentiment: "negative",
      priority: 10,
    });
  } else if (deaths === 0) {
    bullets.push({
      text: `Perfect deathless game with a ${kills}/${deaths}/${assists} KDA — outstanding survival`,
      sentiment: "positive",
      priority: 8,
    });
  } else if (kda >= 4) {
    bullets.push({
      text: `Strong ${kda.toFixed(1)} KDA (${kills}/${deaths}/${assists}) — you were a major threat this game`,
      sentiment: "positive",
      priority: 7,
    });
  } else if (kda < 1.5 && deaths >= 5) {
    bullets.push({
      text: `Your ${kda.toFixed(1)} KDA with ${deaths} deaths suggests overextending — try tracking enemy cooldowns before engaging`,
      sentiment: "negative",
      priority: 9,
    });
  }

  if (csPerMin < 5) {
    bullets.push({
      text: `${csPerMin.toFixed(1)} CS/min is very low — practice last-hitting in the practice tool to aim for 7+`,
      sentiment: "negative",
      priority: 8,
    });
  } else if (csPerMin < 6) {
    bullets.push({
      text: `${csPerMin.toFixed(1)} CS/min is below average — focus on catching side waves and not missing cannon minions`,
      sentiment: "negative",
      priority: 6,
    });
  } else if (csPerMin >= 8) {
    bullets.push({
      text: `Your ${csPerMin.toFixed(1)} CS/min was excellent — great farming kept you ahead in gold`,
      sentiment: "positive",
      priority: 7,
    });
  } else if (csPerMin >= 7) {
    bullets.push({
      text: `Solid ${csPerMin.toFixed(1)} CS/min — above average farming this game`,
      sentiment: "positive",
      priority: 4,
    });
  }

  if (visionPerMin < 0.5) {
    bullets.push({
      text: `Vision score of ${visionScore} in ${gameMinutes.toFixed(0)} min is critically low — buy Control Wards on every back`,
      sentiment: "negative",
      priority: 9,
    });
  } else if (visionPerMin < 1) {
    bullets.push({
      text: `Low vision score (${visionScore}) — aim for at least 1 per minute by using trinket on cooldown`,
      sentiment: "negative",
      priority: 6,
    });
  } else if (visionPerMin >= 1.5) {
    bullets.push({
      text: `Great vision score of ${visionScore} — your warding gave your team valuable map control`,
      sentiment: "positive",
      priority: 5,
    });
  }

  if (damageShare >= 0.35) {
    bullets.push({
      text: `You dealt ${(damageShare * 100).toFixed(0)}% of your team's damage — you were the primary carry`,
      sentiment: "positive",
      priority: 7,
    });
  } else if (damageShare < 0.12 && damageShare > 0) {
    bullets.push({
      text: `Only ${(damageShare * 100).toFixed(0)}% damage share — look for more opportunities to deal damage in fights`,
      sentiment: "negative",
      priority: 6,
    });
  }

  if (killParticipation >= 0.7) {
    bullets.push({
      text: `${(killParticipation * 100).toFixed(0)}% kill participation — you were involved in most of your team's kills`,
      sentiment: "positive",
      priority: 6,
    });
  } else if (killParticipation < 0.3 && teamTotalKills >= 10) {
    bullets.push({
      text: `Only ${(killParticipation * 100).toFixed(0)}% kill participation — try roaming or joining team fights more often`,
      sentiment: "negative",
      priority: 7,
    });
  }

  const avgGoldPerMin = goldEarned / gameMinutes;
  if (avgGoldPerMin > 450) {
    bullets.push({
      text: `${Math.round(avgGoldPerMin)} gold/min is exceptional income — you converted leads into items efficiently`,
      sentiment: "positive",
      priority: 5,
    });
  } else if (avgGoldPerMin < 300 && gameMinutes > 15) {
    bullets.push({
      text: `${Math.round(avgGoldPerMin)} gold/min is low — prioritize farming and objective bounties to stay relevant`,
      sentiment: "negative",
      priority: 5,
    });
  }

  if (win) {
    bullets.push({
      text: "Victory — nice job closing out the win",
      sentiment: "positive",
      priority: 1,
    });
  } else {
    bullets.push({
      text: "Defeat — review your death timings and see where the game turned",
      sentiment: "neutral",
      priority: 1,
    });
  }

  bullets.sort((a, b) => b.priority - a.priority);
  return bullets.slice(0, 3);
}

const ICONS: Record<Bullet["sentiment"], string> = {
  positive: "▲",
  negative: "▼",
  neutral: "●",
};

const COLORS: Record<Bullet["sentiment"], string> = {
  positive: "text-emerald-400",
  negative: "text-red-400",
  neutral: "text-zinc-400",
};

export default function PostGameBreakdown(props: PostGameBreakdownProps) {
  const bullets = generateBullets(props);

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
        <span className="text-indigo-400">⚡</span>
        What Went Wrong
      </h3>
      <ul className="space-y-3">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className={`mt-0.5 text-sm font-bold ${COLORS[b.sentiment]}`}>
              {ICONS[b.sentiment]}
            </span>
            <span className="text-sm text-zinc-300 leading-relaxed">
              {b.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
