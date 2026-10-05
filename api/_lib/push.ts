import webpush from "web-push";
import { requireDb } from "./db.js";

const publicKey = process.env.VAPID_PUBLIC_KEY || "";
const privateKey = process.env.VAPID_PRIVATE_KEY || "";
const subject = process.env.VAPID_SUBJECT || "mailto:yagizberkonay@gmail.com";
if (publicKey && privateKey) webpush.setVapidDetails(subject, publicKey, privateKey);

type PushMessage = { title: string; body: string; url?: string };
export async function sendPushToUserIds(userIds: string[], message: PushMessage) {
  if (!publicKey || !privateKey || !userIds.length) return { sent: 0 };
  const db = requireDb(); const uniqueIds = [...new Set(userIds)];
  const rows = await db`SELECT id,endpoint,p256dh,auth FROM push_subscriptions WHERE user_id = ANY(${uniqueIds}::uuid[]) LIMIT 500`;
  let sent = 0;
  for (const row of rows) { try { await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify(message)); sent += 1; } catch (error: any) { if (error?.statusCode === 404 || error?.statusCode === 410) await db`DELETE FROM push_subscriptions WHERE id=${row.id}`; } }
  return { sent };
}
export async function sendPushToAdmins(message: PushMessage) {
  const db = requireDb(); const rows = await db`SELECT id FROM users WHERE role='admin' LIMIT 50`; return sendPushToUserIds(rows.map((row: any) => row.id), message);
}
export async function projectClientUserId(projectId: string) {
  const db = requireDb(); const rows = await db`SELECT c.user_id FROM projects p JOIN clients c ON c.id=p.client_id WHERE p.id=${projectId} LIMIT 1`; return rows[0]?.user_id || null;
}
