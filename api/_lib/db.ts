import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) console.warn("DATABASE_URL is not configured; API will return a configuration error.");
export const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
export function requireDb() { if (!sql) throw new Error("Database is not configured"); return sql; }
