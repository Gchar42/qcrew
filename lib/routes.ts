/**
 * Build profile URL for summoner page (query format used by app).
 */
export function buildProfileHref({
  riotId,
  region,
  queue,
}: {
  riotId: string;
  region: string;
  queue: "solo" | "flex";
}) {
  return `/summoner?riotId=${encodeURIComponent(riotId)}&region=${encodeURIComponent(region)}&queue=${encodeURIComponent(queue)}`;
}
