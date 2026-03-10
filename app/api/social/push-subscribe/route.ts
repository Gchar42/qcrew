export const dynamic = "force-dynamic";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/social/push-subscribe
 * Stores a web push subscription for rank-up notifications.
 * Body: { subscription: PushSubscriptionJSON, riotId, region }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      subscription?: {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      riotId?: string;
      region?: string;
    };

    const endpoint = body.subscription?.endpoint;
    const p256dh = body.subscription?.keys?.p256dh;
    const auth = body.subscription?.keys?.auth;
    const riotId = body.riotId?.trim();
    const region = body.region?.trim() ?? "na1";

    if (!endpoint || !p256dh || !auth || !riotId) {
      return Response.json(
        { error: "Missing subscription data or riotId" },
        { status: 400 }
      );
    }

    await supabaseAdmin.from("push_subscriptions").upsert(
      {
        endpoint,
        p256dh,
        auth_key: auth,
        riot_id: riotId,
        region,
        subscribed_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );

    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/social/push-subscribe
 * Removes a push subscription.
 */
export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { endpoint?: string };
    if (!body.endpoint) {
      return Response.json({ error: "Missing endpoint" }, { status: 400 });
    }
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", body.endpoint);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Failed to remove" }, { status: 500 });
  }
}
