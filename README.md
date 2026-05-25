# AutoBid

Human-in-the-loop government contract bidding & grant submission platform.
Discovers federal opportunities, scores them against your company profile,
drafts compliant bid/grant packages from an approved knowledge vault, runs a
compliance review, and exports only **after human approval**.

## Repo layout

```
/
├─ app/, components/, lib/   Next.js 14 frontend (deployed to Vercel)
├─ api/index.py              Vercel Python serverless stub (demo data)
├─ vercel.json               /api/* → api/index rewrite
└─ autobid/                  Original full-stack source for reference
   ├─ apps/api/              Real FastAPI + Celery backend (NOT deployed)
   ├─ db/schema.sql          Postgres/Supabase schema (pgvector, RLS)
   └─ AutoBid-Build-Plan.md  Full product + architecture plan
```

## Deploy

Pushed to Vercel. The site serves the Next.js UI; `/api/*` is handled by a
small Python serverless function (`api/index.py`) that returns demo data so
the dashboard, feed, and opportunity pages render out of the box.

## Wiring up the real backend

The real backend in `autobid/apps/api/` is **not** Vercel-serverless friendly:

- Celery + Redis need long-running workers
- weasyprint pulls native cairo/pango binaries past Vercel's 250 MB function limit
- RAG / scoring / ingest jobs are batch workloads

Deploy that FastAPI app on Fly, Render, Railway, or a VM, then in Vercel set:

- `NEXT_PUBLIC_API_URL` → your backend URL (e.g. `https://api.autobid.example`)
- `NEXT_PUBLIC_COMPANY_ID` → company UUID from `companies` table

Backend env vars it needs (see `autobid/apps/api/.env.example`):
`DATABASE_URL`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `SAM_GOV_API_KEY`,
`REDIS_URL`, `CORS_ORIGINS`.

## Local dev

```
npm install
npm run dev          # Next.js on :3000, uses /api stub
```
