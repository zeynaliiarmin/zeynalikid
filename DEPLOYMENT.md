# Deployment — Zeynalikid

Repository root is the Vite application root.

## Required verification

```bash
npm ci
npm run check
```

CI runs lint, TypeScript, unit tests, production build and a production-dependency audit.

## Environment

Configure only the public values listed in `.env.example` for Vite. Admin and
service credentials belong only in Supabase Edge Function secrets; never use a
`VITE_` prefix for them.

## Supabase changes

- Schema source: `supabase/migrations/`
- Historical SQL: `supabase/legacy/` — never execute
- Deploy only affected Functions and keep their documented custom authentication.

## Vercel

Deploy the repository root to the linked `zeynalikid` Vercel project. Confirm the
production alias, HTTP 200, security headers and a read-only browser smoke test.
