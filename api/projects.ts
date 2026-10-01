import { requireActor, json, isAdmin } from "./_lib/auth.js";
import { requireDb } from "./_lib/db.js";

async function handler(request: Request): Promise<Response> {
  try {
    const actor = await requireActor(request); const db = requireDb();
    if (request.method === "GET") {
      const rows = isAdmin(actor)
        ? await db`SELECT p.id, p.name, p.status, p.progress, p.total_price, p.currency, c.company_name, f.amount_paid, f.remaining_balance FROM projects p JOIN clients c ON c.id=p.client_id JOIN project_financials f ON f.project_id=p.id ORDER BY p.updated_at DESC LIMIT 100`
        : await db`SELECT p.id, p.name, p.status, p.progress, p.total_price, p.currency, c.company_name, f.amount_paid, f.remaining_balance FROM projects p JOIN clients c ON c.id=p.client_id JOIN users u ON u.id=c.user_id JOIN project_financials f ON f.project_id=p.id WHERE u.auth0_sub=${actor.sub} LIMIT 100`;
      return json({ projects: rows });
    }
    if (!isAdmin(actor)) return json({ error: "Forbidden" }, { status: 403 });
    if (request.method === "PATCH") {
      const body = await request.json(); if (!body.id) return json({ error: "id is required" }, { status: 400 });
      const rows = await db`UPDATE projects SET name=COALESCE(${body.name || null},name),status=COALESCE(${body.status || null}::project_status,status),progress=COALESCE(${body.progress === undefined ? null : Number(body.progress)},progress),total_price=COALESCE(${body.totalPrice === undefined ? null : Number(body.totalPrice)},total_price),due_date=COALESCE(${body.dueDate || null},due_date),updated_at=now() WHERE id=${body.id} RETURNING id,name,status,progress,total_price,currency,due_date`;
      return rows.length ? json({ project: rows[0] }) : json({ error: "Not found" }, { status: 404 });
    }
    if (request.method === "DELETE") {
      const url = new URL(request.url); const id = url.searchParams.get("id"); if (!id) return json({ error: "id is required" }, { status: 400 });
      await db`DELETE FROM projects WHERE id=${id}`; return json({ ok: true });
    }
    if (request.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });
    const body = await request.json();
    if (!body.clientId || !body.name) return json({ error: "clientId and name are required" }, { status: 400 });
    const rows = await db`INSERT INTO projects (client_id,name,slug,summary,total_price,currency) VALUES (${body.clientId},${body.name},${body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g,"-")},${body.summary || null},${Number(body.totalPrice || 0)},${body.currency || "TRY"}) RETURNING id,name,status,progress,total_price,currency`;
    return json({ project: rows[0] }, { status: 201 });
  } catch (error) { if (error instanceof Response) return error; console.error(error); return json({ error: "Request failed" }, { status: 500 }); }
}
export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
