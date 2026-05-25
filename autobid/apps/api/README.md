# AutoBid — Phase 1 Backend

Human-in-the-loop government contract bidding & grant submission platform.
This package is the **FastAPI + Celery backend**: connectors, scoring, RAG,
proposal drafting, compliance extraction, and a gated PDF export.

See `../../AutoBid-Build-Plan.md` for the full product/architecture plan and
`db/schema.sql` for the database.

## What's here

```
apps/api/
├─ config.py              env-driven settings (no secrets in code)
├─ llm.py                 Anthropic wrapper (text + JSON)
├─ main.py                FastAPI endpoints
├─ ingest.py              upsert SAM/Grants into Postgres (idempotent)
├─ connectors/            sam_gov.py · grants_gov.py · usaspending.py
├─ scoring/model.py       deterministic 0–100 fit formula (Section 6)
├─ agents/                scoring_agent · compliance · proposal_writer
├─ rag/                   embed.py · retrieve.py  (pgvector, approved docs only)
├─ docs/render_pdf.py     Markdown sections → proposal PDF (WeasyPrint)
├─ tasks/                 worker.py (Celery) · schedule.py (beat)
└─ db/                    pool.py · audit.py · schema.sql
```

## Setup

```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in values

# 1) create the database (Supabase SQL editor or psql)
psql "$DATABASE_URL" -f db/schema.sql

# 2) run the API
uvicorn main:app --reload

# 3) run background workers (separate shells)
celery -A tasks.worker.app worker -l info
celery -A tasks.worker.app beat   -l info
```

## The core loop (Phase 1)

```bash
# pull live opportunities
curl -X POST localhost:8000/ingest/sam?days_back=2
curl -X POST localhost:8000/ingest/grants

# score one opp for a company (deterministic formula + LLM rationale)
curl -X POST localhost:8000/companies/$CID/opportunities/$OID/score

# ranked feed
curl localhost:8000/companies/$CID/feed?min_score=70

# create a workspace, extract requirements, draft, export (gated)
curl -X POST localhost:8000/companies/$CID/workspaces -d '{"opportunity_id":"...","name":"..."}'
curl -X POST localhost:8000/workspaces/$WID/compliance/extract -d '{"solicitation_text":"...","company_id":"'$CID'"}'
curl -X POST localhost:8000/workspaces/$WID/proposal/draft     -d '{"company_id":"'$CID'"}'
curl -X POST localhost:8000/workspaces/$WID/proposals/$PID/export -o proposal.pdf
```

## Safety gates (do not weaken these)

- **Export is blocked** while any compliance item is `open` or any attestation is
  unsigned (`agents/compliance.validate_ready_to_export` → `409`).
- **Proposal Writer** reuses only `is_approved` vault docs and emits
  `[NEEDS HUMAN INPUT: …]` for missing facts. It never writes final pricing or
  completes certifications.
- **Scoring numbers are deterministic**; the LLM only writes the rationale.
- **Every agent/user action** writes to append-only `audit_logs`.
- Submission to a portal is **assisted only** (Phase 6) — a human clicks submit.

## Security

`SAM_GOV_API_KEY` is read from the environment only. If a key was ever pasted
into chat/email, rotate it in SAM.gov before use. Enable Supabase RLS on every
`company_id` table (policies sketched at the bottom of `schema.sql`).

## Embeddings note

The schema uses `vector(1536)` to match OpenAI `text-embedding-3-small`. To use
Voyage AI instead, change `rag/embed.py` and `EMBED_DIM`, and recreate the
`documents.embedding` column at the new dimension.
```
