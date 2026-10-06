import { requireActor, json, isAdmin } from "./_lib/auth.js";
import { requireDb } from "./_lib/db.js";
import { projectClientUserId, sendPushToUserIds } from "./_lib/push.js";

export const GET = async (request: Request) => {
  try {
    const actor = await requireActor(request);
    const db = requireDb();
    const projectId = new URL(request.url).searchParams.get("projectId");
    const rows = isAdmin(actor)
      ? projectId
        ? await db`SELECT li.id,li.project_id,li.title,li.description,li.amount,li.currency,li.created_at,p.name AS project_name,c.company_name FROM project_line_items li JOIN projects p ON p.id=li.project_id JOIN clients c ON c.id=p.client_id WHERE li.project_id=${projectId} ORDER BY li.created_at DESC LIMIT 200`
        : await db`SELECT li.id,li.project_id,li.title,li.description,li.amount,li.currency,li.created_at,p.name AS project_name,c.company_name FROM project_line_items li JOIN projects p ON p.id=li.project_id JOIN clients c ON c.id=p.client_id ORDER BY li.created_at DESC LIMIT 200`
      : projectId
        ? await db`SELECT li.id,li.project_id,li.title,li.description,li.amount,li.currency,li.created_at,p.name AS project_name,c.company_name FROM project_line_items li JOIN projects p ON p.id=li.project_id JOIN clients c ON c.id=p.client_id JOIN users u ON u.id=c.user_id WHERE li.project_id=${projectId} AND u.auth0_sub=${actor.sub} ORDER BY li.created_at DESC LIMIT 200`
        : await db`SELECT li.id,li.project_id,li.title,li.description,li.amount,li.currency,li.created_at,p.name AS project_name,c.company_name FROM project_line_items li JOIN projects p ON p.id=li.project_id JOIN clients c ON c.id=p.client_id JOIN users u ON u.id=c.user_id WHERE u.auth0_sub=${actor.sub} ORDER BY li.created_at DESC LIMIT 200`;
    return json({ lineItems: rows });
  } catch (error) { if (error instanceof Response) return error; console.error(error); return json({ error: "Line items could not be loaded" }, { status: 500 }); }
};

export const POST = async (request: Request) => {
  try {
    const actor = await requireActor(request); if (!isAdmin(actor)) return json({ error: "Forbidden" }, { status: 403 });
    const body = await request.json();
    if (!body.projectId || !body.title || !Number(body.amount)) return json({ error: "projectId, title and amount are required" }, { status: 400 });
    const db = requireDb();
    const project = await db`SELECT id,name FROM projects WHERE id=${body.projectId} LIMIT 1`;
    if (!project.length) return json({ error: "Project not found" }, { status: 404 });
    const rows = await db`INSERT INTO project_line_items (project_id,title,description,amount,currency) VALUES (${body.projectId},${body.title},${body.description || null},${Number(body.amount)},${body.currency || "TRY"}) RETURNING id,project_id,title,description,amount,currency,created_at`;
    const clientUserId = await projectClientUserId(body.projectId);
    if (clientUserId) await sendPushToUserIds([clientUserId], { title: "Additional project item", body: `${rows[0].title} was added to ${project[0].name}.`, url: "/" }).catch((error) => console.error("push line item notification failed", error));
    return json({ lineItem: rows[0] }, { status: 201 });
  } catch (error) { if (error instanceof Response) return error; console.error(error); return json({ error: "Line item could not be created" }, { status: 500 }); }
};

export const DELETE = async (request: Request) => {
  try {
    const actor = await requireActor(request); if (!isAdmin(actor)) return json({ error: "Forbidden" }, { status: 403 });
    const id = new URL(request.url).searchParams.get("id"); if (!id) return json({ error: "id is required" }, { status: 400 });
    await requireDb()`DELETE FROM project_line_items WHERE id=${id}`;
    return json({ ok: true });
  } catch (error) { if (error instanceof Response) return error; console.error(error); return json({ error: "Line item could not be deleted" }, { status: 500 }); }
};
