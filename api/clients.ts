import { requireActor, json, isAdmin } from "./_lib/auth.js";
import { requireDb } from "./_lib/db.js";

export const GET = async (request: Request) => {
  try {
    const actor = await requireActor(request); if (!isAdmin(actor)) return json({ error: "Forbidden" }, { status: 403 });
    const db = requireDb(); const rows = await db`SELECT c.id,c.company_name,c.phone,c.notes,u.id AS user_id,u.email,u.name, (SELECT count(*) FROM projects p WHERE p.client_id=c.id)::int AS project_count FROM clients c JOIN users u ON u.id=c.user_id ORDER BY c.created_at DESC LIMIT 200`;
    return json({ clients: rows });
  } catch (error) { if (error instanceof Response) return error; console.error(error); return json({ error: "Request failed" }, { status: 500 }); }
};

export const POST = async (request: Request) => {
  try {
    const actor = await requireActor(request); if (!isAdmin(actor)) return json({ error: "Forbidden" }, { status: 403 });
    const body = await request.json(); if (!body.email || !body.companyName || !body.name) return json({ error: "email, companyName and name are required" }, { status: 400 });
    const db = requireDb();
    const rows = await db`WITH new_user AS (INSERT INTO users (auth0_sub,email,name,role) VALUES (${"pending:" + String(body.email).toLowerCase()},${String(body.email).toLowerCase()},${body.name},'client') ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id,email,name), new_client AS (INSERT INTO clients (user_id,company_name,phone,notes) SELECT id,${body.companyName},${body.phone || null},${body.notes || null} FROM new_user ON CONFLICT (user_id) DO UPDATE SET company_name=EXCLUDED.company_name,phone=EXCLUDED.phone,notes=EXCLUDED.notes RETURNING id,user_id,company_name,phone,notes) SELECT c.id,c.company_name,c.phone,c.notes,u.email,u.name FROM new_client c JOIN users u ON u.id=c.user_id`;
    return json({ client: rows[0] }, { status: 201 });
  } catch (error) { if (error instanceof Response) return error; console.error(error); return json({ error: "Request failed" }, { status: 500 }); }
};

export const PATCH = async (request: Request) => {
  try {
    const actor = await requireActor(request); if (!isAdmin(actor)) return json({ error: "Forbidden" }, { status: 403 });
    const body = await request.json(); if (!body.id) return json({ error: "id is required" }, { status: 400 });
    const db = requireDb();
    const rows = await db`UPDATE clients SET company_name=COALESCE(${body.companyName || null},company_name),phone=COALESCE(${body.phone || null},phone),notes=COALESCE(${body.notes || null},notes) WHERE id=${body.id} RETURNING id,company_name,phone,notes`;
    if (body.name || body.email) await db`UPDATE users u SET name=COALESCE(${body.name || null},u.name),email=COALESCE(${body.email || null},u.email),updated_at=now() FROM clients c WHERE c.id=${body.id} AND u.id=c.user_id`;
    return rows.length ? json({ client: rows[0] }) : json({ error: "Not found" }, { status: 404 });
  } catch (error) { if (error instanceof Response) return error; console.error(error); return json({ error: "Request failed" }, { status: 500 }); }
};
