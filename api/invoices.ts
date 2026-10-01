import { requireActor, json, isAdmin } from "./_lib/auth.js";
import { requireDb } from "./_lib/db.js";

const issuer = {
  legalName: "Hermes Software Bilişim Teknolojileri Anonim Şirketi",
  shortName: "Hermes Software Inc.",
  tradeRegistry: "0-204471-5 (İstanbul Ticaret Sicili)",
  mersis: "0687342100100017",
  taxId: "6870342198",
  taxOffice: "Boğaziçi VD — Beşiktaş",
  nace: "62.01 — Bilgisayar Programlama Faaliyetleri",
};

export const GET = async (request: Request) => {
  try {
    const actor = await requireActor(request); const db = requireDb();
    const rows = isAdmin(actor)
      ? await db`SELECT i.id,i.project_id,i.payment_id,i.number,i.amount,i.status,i.due_date,i.issued_at,i.paid_at,p.name AS project_name,p.currency,c.company_name,u.name AS customer_name,u.email AS customer_email,c.phone AS customer_phone FROM invoices i JOIN projects p ON p.id=i.project_id JOIN clients c ON c.id=p.client_id JOIN users u ON u.id=c.user_id ORDER BY i.created_at DESC LIMIT 200`
      : await db`SELECT i.id,i.project_id,i.payment_id,i.number,i.amount,i.status,i.due_date,i.issued_at,i.paid_at,p.name AS project_name,p.currency,c.company_name,u.name AS customer_name,u.email AS customer_email,c.phone AS customer_phone FROM invoices i JOIN projects p ON p.id=i.project_id JOIN clients c ON c.id=p.client_id JOIN users u ON u.id=c.user_id WHERE u.auth0_sub=${actor.sub} ORDER BY i.created_at DESC LIMIT 200`;
    return json({ invoices: rows, issuer });
  } catch (error) { if (error instanceof Response) return error; console.error(error); return json({ error: "Request failed" }, { status: 500 }); }
};

export const POST = async (request: Request) => {
  try {
    const actor = await requireActor(request); if (!isAdmin(actor)) return json({ error: "Forbidden" }, { status: 403 });
    const body = await request.json(); if (!body.projectId || !body.amount || !body.dueDate) return json({ error: "projectId, amount and dueDate are required" }, { status: 400 });
    const db = requireDb(); const number = body.number || `HS-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const rows = await db`INSERT INTO invoices (project_id,number,amount,status,due_date,issued_at) VALUES (${body.projectId},${number},${Number(body.amount)},${body.status || "draft"}::invoice_status,${body.dueDate},${body.issuedAt || new Date().toISOString().slice(0,10)}) RETURNING id,project_id,number,amount,status,due_date,issued_at,paid_at`;
    return json({ invoice: rows[0], issuer }, { status: 201 });
  } catch (error) { if (error instanceof Response) return error; console.error(error); return json({ error: "Invoice could not be created" }, { status: 500 }); }
};

export const PATCH = async (request: Request) => {
  try {
    const actor = await requireActor(request); if (!isAdmin(actor)) return json({ error: "Forbidden" }, { status: 403 });
    const body = await request.json(); if (!body.id || !body.status) return json({ error: "id and status are required" }, { status: 400 });
    const allowed = ["draft", "sent", "paid", "overdue", "void"]; if (!allowed.includes(body.status)) return json({ error: "Invalid invoice status" }, { status: 400 });
    const db = requireDb();
    if (body.paymentId) { const payment = await db`SELECT id FROM payments WHERE id=${body.paymentId} AND project_id=(SELECT project_id FROM invoices WHERE id=${body.id}) LIMIT 1`; if (!payment.length) return json({ error: "Payment does not belong to invoice project" }, { status: 400 }); }
    const rows = await db`UPDATE invoices SET status=${body.status}::invoice_status,paid_at=${body.status === "paid" ? (body.paidAt || new Date().toISOString().slice(0,10)) : null},payment_id=${body.paymentId || null} WHERE id=${body.id} RETURNING id,project_id,payment_id,number,amount,status,due_date,issued_at,paid_at`;
    return rows.length ? json({ invoice: rows[0] }) : json({ error: "Invoice not found" }, { status: 404 });
  } catch (error) { if (error instanceof Response) return error; console.error(error); return json({ error: "Invoice could not be updated" }, { status: 500 }); }
};
