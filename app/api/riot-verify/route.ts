/** Riot Developer Portal verification – exact string, no extra characters */
const RIOT_VERIFICATION_CODE = "68551e54-8f32-4ca9-86c3-2861d94704e8";

export async function GET() {
  return new Response(RIOT_VERIFICATION_CODE, {
    headers: { "Content-Type": "text/plain" },
  });
}
