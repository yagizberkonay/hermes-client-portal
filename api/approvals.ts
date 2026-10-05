import { createHash } from "node:crypto";
import { requireActor, json, isAdmin } from "./_lib/auth.js";
import { requireDb } from "./_lib/db.js";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const requestMeta = (request: Request) => ({ ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null, userAgent: request.headers.get("user-agent") || null });

export const GET = async (request: Request) => {
  try {
    const actor = await requireActor(request); const db = requireDb();
    const rows = isAdmin(actor)
      ? await db`SELECT a.id,a.project_id,a.title,a.document_type,a.content,a.content_hash,a.terms_version,a.legal_notice,a.status,a.requested_at,a.read_confirmed_at,a.approved_at,a.approved_by_name,a.approved_by_email,a.approval_hash,p.name AS project_name,c.company_name FROM digital_approvals a JOIN projects p ON p.id=a.project_id JOIN clients c ON c.id=p.client_id ORDER BY a.created_at DESC LIMIT 200`
      : await db`SELECT a.id,a.project_id,a.title,a.document_type,a.content,a.content_hash,a.terms_version,a.legal_notice,a.status,a.requested_at,a.read_confirmed_at,a.approved_at,a.approved_by_name,a.approved_by_email,a.approval_hash,p.name AS project_name,c.company_name FROM digital_approvals a JOIN projects p ON p.id=a.project_id JOIN clients c ON c.id=p.client_id JOIN users u ON u.id=c.user_id WHERE u.auth0_sub=${actor.sub} ORDER BY a.created_at DESC LIMIT 100`;
    return json({ approvals: rows });
  } catch (error) { if (error instanceof Response) return error; console.error(error); return json({ error: "Approvals could not be loaded" }, { status: 500 }); }
};

export const POST = async (request: Request) => {
  try {
    const actor = await requireActor(request); if (!isAdmin(actor)) return json({ error: "Forbidden" }, { status: 403 });
    const body = await request.json(); if (!body.projectId || !body.title || !body.content) return json({ error: "projectId, title and content are required" }, { status: 400 });
    const db = requireDb(); const project = await db`SELECT id FROM projects WHERE id=${body.projectId} LIMIT 1`; if (!project.length) return json({ error: "Project not found" }, { status: 404 });
    const content = String(body.content).trim(); const contentHash = hash(content); const rows = await db`INSERT INTO digital_approvals (project_id,title,document_type,content,content_hash) VALUES (${body.projectId},${String(body.title).trim()},${body.documentType || "project_approval"},${content},${contentHash}) RETURNING id,project_id,title,document_type,content,content_hash,terms_version,legal_notice,status,requested_at,read_confirmed_at,approved_at`;
    const actorRows = await db`SELECT id FROM users WHERE auth0_sub=${actor.sub} LIMIT 1`; if (actorRows.length) await db`INSERT INTO approval_events (approval_id,actor_id,event_type,metadata) VALUES (${rows[0].id},${actorRows[0].id},'created',${JSON.stringify({ contentHash, termsVersion: rows[0].terms_version })}::jsonb)`;
    return json({ approval: rows[0] }, { status: 201 });
  } catch (error) { if (error instanceof Response) return error; console.error(error); return json({ error: "Approval could not be created" }, { status: 500 }); }
};

export const PATCH = async (request: Request) => {
  try {
    const actor = await requireActor(request); if (isAdmin(actor)) return json({ error: "Only the client can complete this document" }, { status: 403 });
    const body = await request.json(); if (!body.id) return json({ error: "id is required" }, { status: 400 });
    const db = requireDb(); const found = await db`SELECT a.id,a.project_id,a.title,a.content_hash,a.terms_version,a.read_confirmed_at,u.id AS user_id,u.name,u.email FROM digital_approvals a JOIN projects p ON p.id=a.project_id JOIN clients c ON c.id=p.client_id JOIN users u ON u.id=c.user_id WHERE a.id=${body.id} AND u.auth0_sub=${actor.sub} AND a.status='pending' LIMIT 1`;
    if (!found.length) return json({ error: "Approval not found or not available" }, { status: 404 });
    const meta = requestMeta(request);
    if (body.action === "read") {
      if (body.readConfirmed !== true) return json({ error: "You must confirm that you read the complete document" }, { status: 400 });
      const rows = await db`UPDATE digital_approvals SET read_confirmed_at=COALESCE(read_confirmed_at,now()),read_by=${found[0].user_id},read_ip_address=NULLIF(${meta.ip || ""},'')::inet,read_user_agent=${meta.userAgent} WHERE id=${found[0].id} AND status='pending' RETURNING id,read_confirmed_at`;
      await db`INSERT INTO approval_events (approval_id,actor_id,event_type,ip_address,user_agent,metadata) VALUES (${found[0].id},${found[0].user_id},'read_confirmed',NULLIF(${meta.ip || ""},'')::inet,${meta.userAgent},${JSON.stringify({ contentHash: found[0].content_hash, termsVersion: found[0].terms_version })}::jsonb)`;
      return json({ approval: rows[0] });
    }
    if (body.action !== "approve" || body.confirmed !== true || body.legalAccepted !== true || !String(body.signatureName || "").trim()) return json({ error: "Complete reading, legal acknowledgement and typed name are required" }, { status: 400 });
    if (!found[0].read_confirmed_at) return json({ error: "Document must be read and confirmed before approval" }, { status: 400 });
    const approvedAt = new Date().toISOString(); const signatureName = String(body.signatureName).trim(); const approvalHash = hash([found[0].id,found[0].content_hash,actor.sub,signatureName,approvedAt].join("|"));
    const rows = await db`UPDATE digital_approvals SET status='approved',approved_at=${approvedAt},approved_by=${found[0].user_id},approved_by_name=${found[0].name},approved_by_email=${found[0].email},ip_address=NULLIF(${meta.ip || ""},'')::inet,user_agent=${meta.userAgent},approval_hash=${approvalHash} WHERE id=${found[0].id} AND status='pending' AND read_confirmed_at IS NOT NULL RETURNING id,status,approved_at,approved_by_name,approved_by_email,approval_hash`;
    if (!rows.length) return json({ error: "Approval was already completed" }, { status: 409 });
    await db`INSERT INTO approval_events (approval_id,actor_id,event_type,ip_address,user_agent,metadata) VALUES (${found[0].id},${found[0].user_id},'approved',NULLIF(${meta.ip || ""},'')::inet,${meta.userAgent},${JSON.stringify({ approvalHash, contentHash: found[0].content_hash, termsVersion: found[0].terms_version, legalAccepted: true, typedName: signatureName })}::jsonb)`;
    return json({ approval: rows[0] });
  } catch (error) { if (error instanceof Response) return error; console.error(error); return json({ error: "Approval could not be completed" }, { status: 500 }); }
};
