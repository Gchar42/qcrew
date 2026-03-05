import { getCachedDdragonVersion } from "@/lib/ddragonVersion";

export async function GET() {
  const version = await getCachedDdragonVersion();
  if (!version) {
    return Response.json(
      { error: "Failed to fetch Data Dragon version" },
      { status: 502 }
    );
  }
  return Response.json({ version });
}
