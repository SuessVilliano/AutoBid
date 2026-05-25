# AutoBid

Human-in-the-loop government contract bidding & grant submission platform.
Discovers federal opportunities, scores them against your company profile, drafts
compliant bid/grant packages from an approved knowledge vault, runs a compliance
review, and exports only **after human approval**. Nothing is auto-certified,
auto-priced, or blind-submitted.

```
autobid/
├─ AutoBid-Build-Plan.md     full product + architecture plan (14 sections)
├─ db/schema.sql             Postgres/Supabase schema (22 tables, pgvector, RLS)
├─ apps/
│  ├─ api/                   FastAPI + Celery backend  (see apps/api/README.md)
│  └─ web/                   Next.js 14 frontend       (see apps/web/README.md)
```

## Quick start

1. **Database** — run `db/schema.sql` in Supabase (enables `vector`).
2. **Backend** — `cd apps/api`, install `requirements.txt`, fill `.env`, then
   `uvicorn main:app --reload` + Celery worker/beat. Ingest SAM/Grants, score.
3. **Frontend** — `cd apps/web`, `npm install`, set `.env.local`
   (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_COMPANY_ID`), `npm run dev`.

## The end-to-end loop (Phase 1)

Ingest opportunities → automatic 0–100 fit scoring → ranked **feed** →
**opportunity detail** (AI summary + score breakdown) → **Start bid workspace** →
paste solicitation → compliance matrix extracted → draft proposal from approved
vault language → human satisfies requirements & edits sections → **gated export**
(blocked until every requirement is satisfied and attestations are signed).

## Safety, enforced in code

- Scoring is deterministic; the LLM only writes the rationale.
- The Proposal Writer reuses only `is_approved` vault docs and emits
  `[NEEDS HUMAN INPUT]` for missing facts; it never writes final pricing or
  completes certifications.
- `/export` returns `409` while any compliance item is open or any attestation is
  unsigned — the UI shows this as "Export blocked."
- Every agent/user action is written to append-only `audit_logs`.

## Security

`SAM_GOV_API_KEY` and all other secrets are backend env vars only. If a key was
ever shared in chat/email, rotate it before use.
