import webpush from "web-push";
import { requireActor, json, isAdmin } from "./_lib/auth.js";
import { requireDb } from "./_lib/db.js";

const publicKey = process.env.VAPID_PUBLIC_KEY || "";
const privateKey = process.env.VAPID_PRIVATE_KEY || "";
const subject = process.env.VAPID_SUBJECT || "mailto:yagizberkonay0@gmail.com";
if (publicKey && privateKey) webpush.setVapidDetails(subject, publicKey, privateKey);

async function currentUser(request: Request) {
  const actor = await requireActor(request); const db = requireDb();
  const rows = await db`SELECT id,role FROM users WHERE auth0_sub=${actor.sub} LIMIT 1`;
  if (!rows.length) throw json({ error: "User profile not found" }, { status: 404 });
  return { actor, user: rows[0], db };
}

export const GET = async (request: Request) => {
  try { const { user, db } = await currentUser(request); const rows = await db`SELECT id,endpoint,created_at FROM push_subscriptions WHERE user_id=${user.id} ORDER BY created_at DESC LIMIT 20`; return json({ enabled: Boolean(publicKey && privateKey), publicKey, subscriptions: rows }); }
  catch (error) { if (error instanceof Response) return error; console.error(error); return json({ error: "Notification settings could not be loaded" }, { status: 500 }); }
};

export const POST = async (request: Request) => {
  try {
    const { actor, user, db } = await currentUser(request); const body = await request.json();
    if (body.action === "subscribe") { const subscription = body.subscription; if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return json({ error: "Invalid push subscription" }, { status: 400 }); await db`INSERT INTO push_subscriptions (user_id,endpoint,p256dh,auth,user_agent,updated_at) VALUES (${user.id},${subscription.endpoint},${subscription.keys.p256dh},${subscription.keys.auth},${request.headers.get("user-agent")},now()) ON CONFLICT (user_id,endpoint) DO UPDATE SET p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth,user_agent=EXCLUDED.user_agent,updated_at=now()`; return json({ ok: true }); }
    if (body.action === "unsubscribe") { if (!body.endpoint) return json({ error: "endpoint is required" }, { status: 400 }); await db`DELETE FROM push_subscriptions WHERE user_id=${user.id} AND endpoint=${body.endpoint}`; return json({ ok: true }); }
    if (body.action === "test") { if (!isAdmin(actor)) return json({ error: "Forbidden" }, { status: 403 }); if (!publicKey || !privateKey) return json({ error: "Push server keys are not configured" }, { status: 503 }); const rows = await db`SELECT id,endpoint,p256dh,auth FROM push_subscriptions ORDER BY created_at DESC LIMIT 500`; const payload = JSON.stringify({ title: "Hermes Software", body: "Push notifications are connected.", url: "/" }); let sent = 0; for (const row of rows) { try { await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, payload); sent += 1; } catch (error: any) { if (error?.statusCode === 404 || error?.statusCode === 410) await db`DELETE FROM push_subscriptions WHERE id=${row.id}`; } } return json({ ok: true, sent }); }
    return json({ error: "Unknown notification action" }, { status: 400 });
  } catch (error) { if (error instanceof Response) return error; console.error(error); return json({ error: "Notification request failed" }, { status: 500 }); }
};
