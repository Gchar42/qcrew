"use client";

interface PatchChange {
  patchVersion: string;
  patchDate: string;
  changeType: string;
  changes: string;
}

const SAMPLE_AHRI_PATCHES: PatchChange[] = [
  {
    patchVersion: "26.5",
    patchDate: "2026-03-04",
    changeType: "buff",
    changes: "[ABILITY]Orb of Deception (Q)\n- Mana cost: 65/70/75/80/85 \u21D2 55/60/65/70/75\n- Cooldown: 7 \u21D2 6.5 seconds\n[ABILITY]Fox-Fire (W)\n- Damage: 60/85/110/135/160 \u21D2 65/90/115/140/165",
  },
  {
    patchVersion: "26.4",
    patchDate: "2026-02-18",
    changeType: "nerf",
    changes: "[ABILITY]Charm (E)\n- Charm duration: 1.4/1.55/1.7/1.85/2 \u21D2 1.2/1.35/1.5/1.65/1.8 seconds\n- Damage: 80/110/140/170/200 \u21D2 70/100/130/160/190",
  },
  {
    patchVersion: "26.2",
    patchDate: "2026-01-21",
    changeType: "adjust",
    changes: "[ABILITY]Spirit Rush (R)\n- Cooldown: 130/105/80 \u21D2 140/110/80 seconds\n- Damage per dash: 60/90/120 \u21D2 70/100/130",
  },
];

const BANNER_STYLES: Record<string, { bg: string; border: string; text: string; icon: string; label: string }> = {
  buff: { bg: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-400", icon: "\u2191", label: "Buffed" },
  nerf: { bg: "bg-red-500/10", border: "border-red-500/25", text: "text-red-400", icon: "\u2193", label: "Nerfed" },
  adjust: { bg: "bg-amber-500/10", border: "border-amber-500/25", text: "text-amber-400", icon: "\u2192", label: "Adjusted" },
  change: { bg: "bg-blue-500/10", border: "border-blue-500/25", text: "text-blue-400", icon: "~", label: "Changed" },
};

export function getSampleAhriPatches(): PatchChange[] {
  return SAMPLE_AHRI_PATCHES;
}

export default function PatchChangeBanner({
  championName,
  patches,
  onClickBanner,
}: {
  championName: string;
  patches: PatchChange[];
  onClickBanner?: () => void;
}) {
  const isAhri = championName.toLowerCase() === "ahri";
  const list = patches.length > 0 ? patches : isAhri ? SAMPLE_AHRI_PATCHES : [];

  const recentPatch = list[0];
  if (!recentPatch) return null;

  const style = BANNER_STYLES[recentPatch.changeType] ?? BANNER_STYLES.change;

  return (
    <button
      type="button"
      onClick={onClickBanner}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${style.bg} ${style.border} transition-all hover:brightness-125 cursor-pointer`}
    >
      <span className={`text-sm font-bold ${style.text}`}>
        {style.label} in Patch {recentPatch.patchVersion} {style.icon}
      </span>
      <span className="text-xs text-zinc-500">Click for details</span>
    </button>
  );
}
