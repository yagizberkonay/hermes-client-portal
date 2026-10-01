import { createInternalNeonAuth } from "@neondatabase/auth";
import { createClient } from "@neondatabase/neon-js";

const authUrl = import.meta.env.VITE_NEON_AUTH_URL || import.meta.env.VITE_NEON_AUTH_BASE_URL;
const dataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL;

export const neonAuth = authUrl ? createInternalNeonAuth(authUrl) : null;
export const neonClient = authUrl && dataApiUrl
  ? createClient({ auth: { url: authUrl }, dataApi: { url: dataApiUrl } })
  : null;

export const neonConfigured = Boolean(neonClient && neonAuth);

export async function getNeonToken(): Promise<string | null> {
  return neonAuth?.getJWTToken() || null;
}
