import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireActor, json, isAdmin } from "./_lib/auth";
import { requireDb } from "./_lib/db";

const r2 = process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY ? new S3Client({ region: "auto", endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } }) : null;
export default async function handler(request: Request): Promise<Response> {
  try {
    const actor = await requireActor(request); const db = requireDb(); const url = new URL(request.url); const projectId = url.searchParams.get("projectId");
    if (!projectId) return json({ error: "projectId is required" }, { status: 400 });
    const allowed = isAdmin(actor) ? await db`SELECT p.id FROM projects p WHERE p.id=${projectId}` : await db`SELECT p.id FROM projects p JOIN clients c ON c.id=p.client_id JOIN users u ON u.id=c.user_id WHERE p.id=${projectId} AND u.auth0_sub=${actor.sub}`;
    if (!allowed.length) return json({ error: "Forbidden" }, { status: 403 });
    const files = await db`SELECT id,name,mime_type,size_bytes,created_at FROM files WHERE project_id=${projectId} ORDER BY created_at DESC`;
    if (request.method === "GET" && url.searchParams.has("fileId")) {
      if (!r2) return json({ error: "Storage is not configured" }, { status: 503 });
      const found = await db`SELECT storage_key,name FROM files WHERE id=${url.searchParams.get("fileId")} AND project_id=${projectId}`;
      if (!found.length) return json({ error: "Not found" }, { status: 404 });
      const signedUrl = await getSignedUrl(r2, new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: found[0].storage_key }), { expiresIn: 300 });
      return json({ url: signedUrl, name: found[0].name });
    }
    return json({ files });
  } catch (error) { if (error instanceof Response) return error; console.error(error); return json({ error: "Request failed" }, { status: 500 }); }
}
