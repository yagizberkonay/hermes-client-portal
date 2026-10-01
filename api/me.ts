import { requireActor, json, isAdmin } from "./_lib/auth.js";
import { requireDb } from "./_lib/db.js";

export const GET = async (request: Request) => {
  try {
    const actor = await requireActor(request); const db = requireDb();
    const email = actor.email || `${actor.sub}@neon.local`;
    const name = typeof actor.name === "string" ? actor.name : email.split("@")[0];
    const role = isAdmin(actor) ? "admin" : "client";
    const users = await db`INSERT INTO users (auth0_sub,email,name,role) VALUES (${actor.sub},${email},${name},${role}::user_role) ON CONFLICT (auth0_sub) DO UPDATE SET email=EXCLUDED.email,name=EXCLUDED.name,role=CASE WHEN users.role='admin' OR EXCLUDED.role='admin' THEN 'admin'::user_role ELSE users.role END,updated_at=now() RETURNING id,email,name,role`;
    const user = users[0];
    if (user.role === "client") await db`INSERT INTO clients (user_id,company_name) VALUES (${user.id},${name}) ON CONFLICT (user_id) DO NOTHING`;
    return json({ user });
  } catch (error) { if (error instanceof Response) return error; console.error(error); return json({ error: "Request failed" }, { status: 500 }); }
};
