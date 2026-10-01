# Hermes Software Client Portal

Private project workspace for `client.hermessoftware.space`.

## Stack

React + Vite + TypeScript, Tailwind CSS, Auth0, Neon PostgreSQL, Vercel Functions and private Cloudflare R2 storage.

## Local setup

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Apply [`db/schema.sql`](./db/schema.sql) to the Neon production branch before enabling live data. Never commit `.env.local`.

## Auth0

Create an SPA application and API audience. Add `http://localhost:5173`, `https://client.hermessoftware.space` and matching callback/logout URLs. Admin authorization is server-side via `ADMIN_EMAILS` plus the `role` column; the UI is not a security boundary.

## R2

Create a private bucket. The API generates short-lived signed URLs; browser clients never receive R2 credentials or bucket access.

## Deploy

Connect `yagizberkonay/hermes-client-portal` to Vercel, set the variables in `.env.example`, deploy, then add `client.hermessoftware.space` as the production domain.
