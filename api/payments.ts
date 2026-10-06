import { requireActor, json, isAdmin } from "./_lib/auth.js";
import { requireDb } from "./_lib/db.js";
import { projectClientUserId, sendPushToUserIds } from "./_lib/push.js";

export const GET = async (request: Request) => {
  try {
    const actor = await requireActor(request); const db = requireDb();
    const rows = isAdmin(actor)
      ? await db`SELECT pay.id,pay.project_id,pay.amount,pay.currency,pay.paid_at,pay.method,pay.reference,pay.note,p.name AS project_name,c.company_name,p.monthly_minimum FROM payments pay JOIN projects p ON p.id=pay.project_id JOIN clients c ON c.id=p.client_id ORDER BY pay.paid_at DESC,pay.created_at DESC LIMIT 200`
      : await db`SELECT pay.id,pay.project_id,pay.amount,pay.currency,pay.paid_at,pay.method,pay.reference,pay.note,p.name AS project_name,c.company_name,p.monthly_minimum FROM payments pay JOIN projects p ON p.id=pay.project_id JOIN clients c ON c.id=p.client_id JOIN users u ON u.id=c.user_id WHERE u.auth0_sub=${actor.sub} ORDER BY pay.paid_at DESC,pay.created_at DESC LIMIT 200`;
    const totals = isAdmin(actor)
      ? await db`SELECT COALESCE((SELECT SUM(amount) FROM payments),0)::numeric(12,2) AS total_paid, COALESCE((SELECT SUM(monthly_minimum) FROM projects),0)::numeric(12,2) AS monthly_minimum, COALESCE((SELECT SUM(total_price) FROM project_financials),0)::numeric(12,2) AS total_value`
      : await db`SELECT COALESCE((SELECT SUM(pay.amount) FROM payments pay JOIN projects px ON px.id=pay.project_id JOIN clients cx ON cx.id=px.client_id JOIN users ux ON ux.id=cx.user_id WHERE ux.auth0_sub=${actor.sub}),0)::numeric(12,2) AS total_paid, COALESCE((SELECT SUM(px.monthly_minimum) FROM projects px JOIN clients cx ON cx.id=px.client_id JOIN users ux ON ux.id=cx.user_id WHERE ux.auth0_sub=${actor.sub}),0)::numeric(12,2) AS monthly_minimum, COALESCE((SELECT SUM(f.total_price) FROM project_financials f JOIN projects px ON px.id=f.project_id JOIN clients cx ON cx.id=px.client_id JOIN users ux ON ux.id=cx.user_id WHERE ux.auth0_sub=${actor.sub}),0)::numeric(12,2) AS total_value`;
    const total = totals[0];
    return json({ payments: rows, summary: { ...total, total_remaining: Math.max(Number(total.total_value) - Number(total.total_paid), 0).toFixed(2) } });
  } catch (error) { if (error instanceof Response) return error; console.error(error); return json({ error: "Request failed" }, { status: 500 }); }
};

export const POST = async (request: Request) => {
  try {
    const actor = await requireActor(request); if (!isAdmin(actor)) return json({ error: "Forbidden" }, { status: 403 });
    const body = await request.json();
    const db = requireDb();
    if (body.action === "remind") {
      if (!body.projectId) return json({ error: "projectId is required" }, { status: 400 });
      const rows = await db`SELECT p.id,p.name,f.total_price,p.monthly_minimum,COALESCE(u.name,c.company_name,'') AS client_name,c.phone,c.user_id,f.amount_paid FROM projects p JOIN project_financials f ON f.project_id=p.id JOIN clients c ON c.id=p.client_id LEFT JOIN users u ON u.id=c.user_id WHERE p.id=${body.projectId} LIMIT 1`;
      if (!rows.length) return json({ error: "Project not found" }, { status: 404 });
      const project = rows[0]; const remaining = Math.max(Number(project.total_price || 0) - Number(project.amount_paid || 0), 0);
      if (remaining <= 0) return json({ error: "This project has no outstanding balance" }, { status: 400 });
      const amount = Number(project.monthly_minimum || 0) > 0 ? Number(project.monthly_minimum) : remaining;
      const message = `Merhaba ${project.client_name || ""}, ${project.name} projeniz için ödeme hatırlatmasıdır. Güncel kalan bakiye: ₺${remaining.toLocaleString("tr-TR")}. Bu dönem önerilen ödeme: ₺${amount.toLocaleString("tr-TR")}. Detaylar için Hermes Software client portalını kontrol edebilirsiniz.`;
      if (project.user_id) await sendPushToUserIds([project.user_id], { title: "Payment reminder", body: `${project.name}: ₺${remaining.toLocaleString("tr-TR")} outstanding balance.`, url: "/" }).catch((error) => console.error("push payment reminder failed", error));
      const phone = String(project.phone || "").replace(/\D/g, "");
      return json({ reminder: { projectId: project.id, remaining, suggestedAmount: amount, phone: project.phone || null, message, waUrl: phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null } });
    }
    if (!body.projectId || !body.amount) return json({ error: "projectId and amount are required" }, { status: 400 });
    const rows = await db`INSERT INTO payments (project_id,amount,currency,paid_at,method,reference,note) VALUES (${body.projectId},${Number(body.amount)},${body.currency || "TRY"},${body.paidAt || new Date().toISOString().slice(0, 10)},${body.method || "bank_transfer"}::payment_method,${body.reference || null},${body.note || null}) RETURNING id,project_id,amount,currency,paid_at,method,reference,note`;
    const clientUserId = await projectClientUserId(body.projectId); if (clientUserId) await sendPushToUserIds([clientUserId], { title: "Payment received", body: `A payment of ${Number(body.amount).toLocaleString("tr-TR")} ${body.currency || "TRY"} was recorded for your project.`, url: "/" }).catch((error) => console.error("push payment notification failed", error)); return json({ payment: rows[0] }, { status: 201 });
  } catch (error) { if (error instanceof Response) return error; console.error(error); return json({ error: "Request failed" }, { status: 500 }); }
};

export const DELETE = async (request: Request) => {
  try {
    const actor = await requireActor(request); if (!isAdmin(actor)) return json({ error: "Forbidden" }, { status: 403 });
    const id = new URL(request.url).searchParams.get("id"); if (!id) return json({ error: "id is required" }, { status: 400 });
    await requireDb()`DELETE FROM payments WHERE id=${id}`; return json({ ok: true });
  } catch (error) { if (error instanceof Response) return error; console.error(error); return json({ error: "Request failed" }, { status: 500 }); }
};
