import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export type Actor = JWTPayload & { sub: string; email?: string; permissions?: string[] };
const domain = process.env.AUTH0_DOMAIN;
const audience = process.env.AUTH0_AUDIENCE;
const jwks = domain ? createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`)) : null;

export async function requireActor(request: Request): Promise<Actor> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !jwks || !audience) throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });
  try { const result = await jwtVerify(token, jwks, { issuer: `https://${domain}/`, audience }); return result.payload as Actor; }
  catch { throw new Response(JSON.stringify({ error: "Invalid access token" }), { status: 401, headers: { "content-type": "application/json" } }); }
}
export function json(data: unknown, init: ResponseInit = {}) { return new Response(JSON.stringify(data), { ...init, headers: { "content-type": "application/json", ...(init.headers || {}) } }); }
export function isAdmin(actor: Actor) { const admins = (process.env.ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean); return Boolean(actor.email && admins.includes(actor.email.toLowerCase())); }
