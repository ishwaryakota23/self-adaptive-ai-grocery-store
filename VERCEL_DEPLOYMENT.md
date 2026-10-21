# GrocerAI Deployment Guide

GrocerAI is a Vite React application with Vercel serverless handlers in `api/`. The local Vite middleware dispatches to the same handlers during development and preview.

## Environment variables

Set secrets in the Vercel project settings. Do not commit `.env`.

- `GROQ_API_KEY` and optional `GROQ_MODEL` for Customer and Store LLM reasoning.
- Existing Supabase URL and public client key for browser-facing setup.
- Server-only `SUPABASE_SECRET_KEY` (or the existing service-role alias) for business APIs and native memory.
- Existing manager signing, email, and checkout provider settings only when those services are enabled.

Native memory does not use a third-party memory service or a memory-specific API key. Apply `supabase/migrations/20261021_native_grocerai_memory.sql` manually to the intended Supabase project before enabling persistent memory. The table is service-role only and queried by server functions.

## Native memory API routes

- `POST /api/memory/retain` — validates the agent scope and stores a record.
- `POST /api/memory/recall` — searches only the authenticated customer or manager branch scope.
- `POST /api/memory/reflect` — produces deterministic reflections from scoped records.
- `GET /api/memory/status` and `/api/memory/activity` — manager-authorized diagnostics.

The old `/api/hindsight/*` routes and daemon configuration have been removed. If Supabase or the migration is unavailable, memory operations return an explicit failure; they do not report a local fallback as persistent.

## Build and deploy

Vercel runs `npm run build` and serves `dist/`. API files remain under `api/` and are included in TypeScript checks. Preview the production bundle locally with:

```bash
npm run build
npm run preview
```

Before release, verify required Supabase migrations are applied, environment secrets are configured, and the native memory suite passes with `npm run test:native-memory`.
