import { requireActor, json, isAdmin } from "./_lib/auth.js";
import { requireDb } from "./_lib/db.js";

export const GET = async (request: Request) => {
  try {
    const actor = await requireActor(request);
    const db = requireDb();
    const email = actor.email || `${actor.sub}@neon.local`;
    const name = typeof actor.name === "string" ? actor.name : email.split("@")[0];
    const role = isAdmin(actor) ? "admin" : "client";
    const existing = await db`SELECT id,auth0_sub,email,name,role FROM users WHERE auth0_sub=${actor.sub} OR lower(email)=lower(${email}) ORDER BY CASE WHEN auth0_sub=${actor.sub} THEN 0 ELSE 1 END LIMIT 1`;
    const users = existing.length
      ? await db`UPDATE users SET auth0_sub=${actor.sub},email=${email},name=${name},role=CASE WHEN role='admin' OR ${role}='admin' THEN 'admin'::user_role ELSE role END,updated_at=now() WHERE id=${existing[0].id} RETURNING id,email,name,role`
      : await db`INSERT INTO users (auth0_sub,email,name,role) VALUES (${actor.sub},${email},${name},${role}::user_role) RETURNING id,email,name,role`;
    const user = users[0];
    if (user.role === "client") await db`INSERT INTO clients (user_id,company_name) VALUES (${user.id},${name}) ON CONFLICT (user_id) DO NOTHING`;
    return json({ user });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error(error);
    return json({ error: "Request failed" }, { status: 500 });
  }
};
