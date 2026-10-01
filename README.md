# Hermes Software Client Portal

Private project workspace for `client.hermessoftware.space`.

## Stack

React + Vite + TypeScript, Tailwind CSS, Neon Managed Auth, Neon PostgreSQL/Data API, Vercel Functions and private Cloudflare R2 storage.

## Local setup

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Apply [`db/schema.sql`](./db/schema.sql) to the Neon production branch before enabling live data. Never commit `.env.local`.

## Neon Auth

Neon Managed Auth is configured on the production branch with Better Auth. The frontend uses `@neondatabase/neon-js` for email/password sign-up, sign-in, session refresh and sign-out. Trusted domains include `http://localhost:5173` and `https://client.hermessoftware.space`.

Admin authorization is server-side via `ADMIN_EMAILS` plus the `role` column; the UI is not a security boundary.

## R2

Create a private bucket. The API generates short-lived signed URLs; browser clients never receive R2 credentials or bucket access.

## Deploy

Connect `yagizberkonay/hermes-client-portal` to Vercel, set the variables in `.env.example`, deploy, then add `client.hermessoftware.space` as the production domain. Neon Data API is provisioned for the `public` schema with Neon Auth as the JWT provider and a 100-row request limit.
