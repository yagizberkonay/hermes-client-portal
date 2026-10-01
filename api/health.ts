import { json } from "./_lib/auth.js";
export default async function handler() { return json({ ok: true, service: "hermes-client-portal", databaseConfigured: Boolean(process.env.DATABASE_URL), storageConfigured: Boolean(process.env.R2_BUCKET) }); }
