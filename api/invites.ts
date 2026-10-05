import { createHash, randomBytes } from "node:crypto";
import { requireActor, json, isAdmin } from "./_lib/auth.js";
import { requireDb } from "./_lib/db.js";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const inviteUrl = (token: string) => `https://client.hermessoftware.space/activate?token=${encodeURIComponent(token)}`;

export const GET = async (request: Request) => {
  try {
    const token = new URL(request.url).searchParams.get("token");
    if (!token) return json({ error: "Invite token is required" }, { status: 400 });
    const db = requireDb();
    const rows = await db`SELECT i.email,i.expires_at,c.company_name,u.name FROM client_invites i JOIN clients c ON c.id=i.client_id JOIN users u ON u.id=c.user_id WHERE i.token_hash=${hashToken(token)} AND i.consumed_at IS NULL AND i.expires_at > now() LIMIT 1`;
    if (!rows.length) return json({ error: "This invite is invalid or expired" }, { status: 404 });
    return json({ invite: rows[0] });
  } catch (error) { console.error(error); return json({ error: "Invite could not be verified" }, { status: 500 }); }
};

export const POST = async (request: Request) => {
  try {
    const actor = await requireActor(request);
    const body = await request.json();
    const db = requireDb();
    if (body.action === "consume") {
      const rows = await db`SELECT i.id,i.email FROM client_invites i WHERE i.token_hash=${hashToken(String(body.token || ""))} AND i.consumed_at IS NULL AND i.expires_at > now() LIMIT 1`;
      if (!rows.length || !actor.email || actor.email.toLowerCase() !== rows[0].email.toLowerCase()) return json({ error: "Invite does not match this account" }, { status: 403 });
      await db`UPDATE client_invites SET consumed_at=now() WHERE id=${rows[0].id}`;
      return json({ consumed: true });
    }
    if (!isAdmin(actor)) return json({ error: "Forbidden" }, { status: 403 });
    if (!body.clientId) return json({ error: "clientId is required" }, { status: 400 });
    const client = await db`SELECT c.id,u.email FROM clients c JOIN users u ON u.id=c.user_id WHERE c.id=${body.clientId} LIMIT 1`;
    if (!client.length) return json({ error: "Client not found" }, { status: 404 });
    const token = randomBytes(32).toString("hex");
    await db`UPDATE client_invites SET consumed_at=now() WHERE client_id=${body.clientId} AND consumed_at IS NULL`;
    const rows = await db`INSERT INTO client_invites (client_id,email,token_hash) VALUES (${body.clientId},${client[0].email},${hashToken(token)}) RETURNING expires_at`;
    return json({ inviteUrl: inviteUrl(token), email: client[0].email, expiresAt: rows[0].expires_at }, { status: 201 });
  } catch (error) { if (error instanceof Response) return error; console.error(error); return json({ error: "Invite could not be created" }, { status: 500 }); }
};
