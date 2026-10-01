import { createClient } from "@neondatabase/neon-js";

const authUrl = import.meta.env.VITE_NEON_AUTH_URL || import.meta.env.VITE_NEON_AUTH_BASE_URL;
const dataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL;

export const neonClient = authUrl && dataApiUrl
  ? createClient({ auth: { url: authUrl }, dataApi: { url: dataApiUrl } })
  : null;

export const neonConfigured = Boolean(neonClient);
