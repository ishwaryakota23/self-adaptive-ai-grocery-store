# GrocerAI — Vercel Production Deployment Guide

**Project:** GrocerAI — Self-Adaptive AI Physical Grocery Store  
**Platform:** Vercel (Vite SPA + Node.js Serverless Functions)  
**Status:** Vercel-Ready (Full Serverless Parity Verified)  

---

## 1. What Was Changed for Vercel Compatibility

Previously, GrocerAI relied on custom Vite middleware inside `vite.config.ts` (`configureServer` and `configurePreviewServer`) to handle backend endpoints such as `/api/customer-agent`, `/api/store-agent`, and `/api/hindsight/*`. On Vercel, static build output ignores Vite dev server middleware. 

To achieve production compatibility without code duplication:
1. **Dedicated Serverless Functions (`/api`):** Created pure, Vercel-compatible Serverless Function handlers in `api/`:
   - `api/groq-status.ts` $\rightarrow$ `GET /api/groq-status`
   - `api/customer-agent.ts` $\rightarrow$ `POST /api/customer-agent`
   - `api/store-agent/index.ts` $\rightarrow$ `POST /api/store-agent`
   - `api/store-agent/overview.ts` $\rightarrow$ `GET /api/store-agent/overview`
   - `api/store-agent/actions.ts` $\rightarrow$ `POST /api/store-agent/actions`
   - `api/hindsight/status.ts` $\rightarrow$ `GET /api/hindsight/status`
   - `api/hindsight/activity.ts` $\rightarrow$ `GET /api/hindsight/activity`
   - `api/hindsight/recall.ts` $\rightarrow$ `POST /api/hindsight/recall`
   - `api/hindsight/retain.ts` $\rightarrow$ `POST /api/hindsight/retain`
   - `api/_utils.ts` $\rightarrow$ Shared body parser, CORS handler, and standard status/JSON responder.
2. **Unified Vite Dev Server:** Refactored `vite.config.ts` so both `npm run dev` and `npm run preview` delegate directly to the same Serverless handlers in `api/`. This ensures 100% logic and contract parity between local development and Vercel production.
3. **TypeScript Integration:** Updated `tsconfig.json` to include `"api"` in compilation so that `npm run build` (`tsc && vite build`) type-checks the serverless handlers.
4. **Vercel Routing (`vercel.json`):** Added explicit rewrites to ensure `/api/*` routes are handled by Serverless Functions while SPA browser routes (`/customer/*`, `/store/*`, `/manager/*`, etc.) route cleanly to `index.html`.
5. **Hindsight Cloud / Vercel Awareness:** Updated `src/services/hindsightService.ts` to support authenticated remote Hindsight endpoints (`HINDSIGHT_API_KEY`), abort timeouts (3s), and automatic localhost detection under `process.env.VERCEL` to prevent hanging serverless invocations.

---

## 2. Required Vercel Environment Variables

Configure these in the Vercel Dashboard under **Project Settings $\rightarrow$ Environment Variables**:

| Variable | Required | Default / Recommended | Purpose |
|:---|:---:|:---|:---|
| `GROQ_API_KEY` | **YES** | *(Private API Key)* | Powers Customer Agent & Store Agent LLM inference |
| `GROQ_MODEL` | NO | `llama-3.3-70b-versatile` | Target Groq model (fallback: `qwen/qwen3.8-27b`) |
| `HINDSIGHT_BASE_URL` | NO | *(Remote Hindsight URL or empty)* | URL of deployed Hindsight API server |
| `HINDSIGHT_API_KEY` | NO | *(Bearer Token if remote requires auth)* | Authentication token for Hindsight service |
| `HINDSIGHT_API_LLM_PROVIDER` | NO | `groq` | Consolidation provider for Hindsight daemon |
| `HINDSIGHT_STORE_BANK` | NO | `grocerai-store-main` | Default operational memory bank identifier |

---

## 3. Values That Are Safe Placeholders

These values have built-in fallbacks and can safely be left as default placeholders or omitted if running in standard demonstration mode:
- `GROQ_MODEL`: If omitted, defaults to `llama-3.3-70b-versatile` (with automatic fallback to `qwen/qwen3.8-27b`).
- `HINDSIGHT_STORE_BANK`: Defaults to `grocerai-store-main`.
- `HINDSIGHT_API_LLM_PROVIDER`: Defaults to `groq`.

---

## 4. Values That Must Be Supplied Privately

These values **must NEVER be committed to Git** and must be added securely in Vercel's Environment Variables manager:
- `GROQ_API_KEY`: Required for live reasoning. Obtain from [console.groq.com/keys](https://console.groq.com/keys). (Select: Production, Preview, Development environments).
- `HINDSIGHT_API_KEY`: If using an authenticated remote or cloud Hindsight deployment.

---

## 5. Hindsight Production Requirement

### Current Reality
- In local development, Hindsight runs as a local Python FastAPI daemon on `http://localhost:8888` backed by embedded PostgreSQL (`5432`).
- On Vercel, serverless functions are ephemeral and **cannot** run background Python daemons or local PostgreSQL on port 8888.

### Production Behavior
1. **Configured with Remote Hindsight:**
   - If `HINDSIGHT_BASE_URL` is set to an externally reachable URL (e.g. `https://hindsight.yourdomain.com` or `https://api.hindsight.vectorize.io`), GrocerAI automatically connects, authenticates via `HINDSIGHT_API_KEY`, and executes remote retain/recall/reflect operations.
2. **Unconfigured / Localhost on Vercel:**
   - If `HINDSIGHT_BASE_URL` is unset or still set to `http://localhost:8888`, the system detects `process.env.VERCEL`, avoids hanging on dead localhost ports, and honestly reports `isHealthy: false`.
   - The application **degrades gracefully**: Customer Agent, Store Agent, checkout, missions, product discovery, and all 17 screens function normally with memory operations failing non-destructively.

> [!IMPORTANT]
> Do NOT invent a fake Hindsight URL. If a dedicated remote Hindsight instance is not deployed yet, leave `HINDSIGHT_BASE_URL` unset or let it gracefully report offline. GrocerAI will never fake AI memories or crash.

---

## 6. Build Command

```bash
npm run build
```

This runs:
1. `tsc` — Strict TypeScript compilation across `src/`, `vite.config.ts`, and `api/`.
2. `vite build` — Bundles the production client into `dist/`.

---

## 7. Output Directory

```text
dist
```

---

## 8. Required Vercel Configuration (`vercel.json`)

GrocerAI includes the following root `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/api/store-agent",
      "destination": "/api/store-agent/index"
    },
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 9. Local Development Behavior

Local development remains 100% intact:
1. Run `npm run dev` $\rightarrow$ Launches on `http://localhost:3000`.
2. Vite dev server routes all `/api/*` calls through the Serverless handlers in `api/`.
3. Changes to `api/` or `src/` are hot-reloaded.
4. Run `npm run preview` $\rightarrow$ Launches production bundle with identical `/api/*` serverless handling.
5. If running local Hindsight daemon (`python scripts/start-hindsight.py`), memory banks on `http://localhost:8888` connect automatically.

---

## 10. Production Deployment & Verification Checklist

- [x] **Serverless API Routes:** All 9 endpoints implemented in `api/` and verified.
- [x] **CORS & Preflight:** Implemented in `api/_utils.ts` for all endpoints.
- [x] **TypeScript Compliance:** `npm run build` passes with zero errors.
- [x] **SPA Routing:** Client-side rewrites configured in `vercel.json`.
- [x] **Secret Isolation:** No secrets bundled into client build (verified via `git grep`).
- [x] **Environment Variables:** `.env.example` documented with clean placeholders.
- [x] **Regression Suites:** Phase 2, Customer Agent, Store Agent, and Hindsight test suites executed.
- [x] **Preview Parity:** Verified via `npx vite preview` on port 4173 with active `/api/*` endpoints.

---

### Step-by-Step Vercel Deployment Instructions (When Ready)

1. **Push Clean Code to GitHub:**
   ```powershell
   git add .
   git commit -m "feat: Vercel serverless functions, proxy parity, and deployment readiness"
   git push origin main
   ```
2. **Import Repository in Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new).
   - Select the `grocer-ai` repository.
   - Framework Preset: **Vite**
   - Root Directory: `./`
3. **Configure Environment Variables in Vercel:**
   - `GROQ_API_KEY` = `<your-groq-api-key>`
   - `GROQ_MODEL` = `llama-3.3-70b-versatile` (or `qwen/qwen3.8-27b`)
   - `HINDSIGHT_BASE_URL` = `<your-remote-url-if-any>`
4. **Deploy:**
   - Click **Deploy**. Vercel will build the frontend into `dist` and deploy the Serverless Functions from `api/`.
