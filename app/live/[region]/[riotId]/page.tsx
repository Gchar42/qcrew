import LiveGameView from "@/components/live/LiveGameView";
import "../../live.css";

export default async function LiveGamePage({
  params,
}: {
  params: Promise<{ region: string; riotId: string }>;
}) {
  const { region, riotId } = await params;
  const decoded = decodeURIComponent(riotId);
  const playerName = decoded.includes("#") ? decoded : `${decoded}#${region.toUpperCase()}`;

  return (
    <div className="live-page-wrapper">
      <LiveGameView
        region={region}
        riotId={decoded}
        playerName={playerName}
      />
    </div>
  );
}
