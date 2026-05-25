# AutoBid — Government Contract Bidding & Grant Submission Platform
### Build-Ready Product & Technical Plan

A human-in-the-loop system that **discovers** federal/state/local/education/nonprofit opportunities, **scores** them against your company profile, **drafts** complete bid & grant packages from a reusable knowledge vault, runs a **compliance review**, and only submits **after explicit human approval**. Nothing is auto-certified, auto-priced, or blind-submitted.

Companion files: `schema.sql` (full database), `connectors.py` (SAM.gov / Grants.gov / USAspending starter connectors).

---

## 0. Guiding principle

> The platform's job is to get a package to **95% done and provably compliant**, then stop and hand the wheel to a human for the final 5%: pricing sign-off, certifications, and the submit click. Every artifact carries provenance (where the language/data came from) and an audit trail.

---

## 1. MVP Scope (build in ~4–6 weeks)

The MVP proves the core loop on **federal only**, where official APIs exist:

1. **Company Profile Vault** — one company, NAICS/PSC list, service states, value range, set-asides, document uploads, approved boilerplate blurbs.
2. **Opportunity Search** — SAM.gov contract notices + Grants.gov grants, filtered by your NAICS and states, on a daily refresh.
3. **Fit Scoring (0–100)** — automated score + plain-English rationale per opportunity.
4. **Opportunity Feed + Detail** — ranked list, detail page with AI summary, deadline, attachments.
5. **Bid Workspace** — user "selects" an opportunity → workspace created → requirement extraction → compliance checklist → AI proposal draft from vault language.
6. **Human Approval + Export** — reviewer approves; system exports a clean PDF/zip package. (Portal auto-submission is *Phase 6*, not MVP.)
7. **Deadline reminders + audit log.**

Explicitly **out of MVP:** state/local portal scraping, automated portal submission, pricing engine, multi-company/agency SaaS billing.

---

## 2. Core Features

| Feature | What it does |
|---|---|
| Company profile vault | Single source of truth: identifiers (UEI/CAGE), NAICS/PSC, states, value range, set-asides, capacity. |
| Capability statement builder | Generates a formatted one/two-pager from the profile; versioned; exports to PDF. |
| NAICS/PSC matching | Maps opportunity codes to your profile codes; exact + adjacent-code matching. |
| Opportunity search | SAM.gov contract notices; daily pull, dedupe, store raw + normalized. |
| Grant search | Grants.gov `search2`; statuses posted/forecasted; ALN + category filters. |
| Bid scoring | Weighted 0–100 model (Section 6) with sub-scores + rationale. |
| AI opportunity summaries | 5-sentence "what/who/how much/when/can-we-win" abstract per item. |
| Eligibility checker | Flags set-aside, registration, citizenship, cost-share, size-standard gates. |
| Compliance checklist generator | Extracts "shall/must" requirements + Section L/M into a tracked checklist. |
| Proposal/grant draft generator | Section-by-section drafts that reuse **approved** vault language only. |
| Required document checklist | Derives the attachment list (SF forms, reps & certs, past perf, budget). |
| Human approval workflow | Reviewer gate per section + a final approval that unlocks export/submit. |
| Submission tracker | Status pipeline (draft→submitted→won/lost) with confirmation numbers. |
| Dashboard | Pipeline value, deadlines this week, high-score new opps, tasks. |
| Reminders | Deadline, Q&A cutoff, and **amendment** alerts (re-checks source). |

---

## 3. Data Sources & Connectors

For each source: **what to collect · best method · refresh · key fields · limitations.**

### Official APIs (build first)

**SAM.gov — Contract Opportunities** (`api.sam.gov/prod/opportunities/v2/search`)
- **Collect:** notices, NAICS, PSC, set-aside, place of performance, deadlines, solicitation #, attachment links.
- **Method:** REST API, `api_key` query param. *(See `connectors.py`.)*
- **Refresh:** daily (active notices update daily; archived weekly).
- **Fields:** `noticeId, title, naicsCode, classificationCode, typeOfSetAside, responseDeadLine, resourceLinks, uiLink`.
- **Limits:** ~1,000 calls/day on a registered non-federal key (public/unregistered tier far lower); date range required (`postedFrom/postedTo`, MM/DD/YYYY); pagination required; **no GET-by-id** (refetch via `noticeId` on search); `title` is title-only, not full-text — so pull broadly by NAICS/date then filter locally. **Cache aggressively.**

**Grants.gov — `search2`** (`api.grants.gov/v1/api/search2`)
- **Collect:** grant opportunities, ALN/CFDA, funding floor/ceiling, eligibility, cost-sharing, open/close dates.
- **Method:** **keyless** POST, JSON body; `fetchOpportunity` for full detail.
- **Refresh:** daily.
- **Fields:** `number, title, agency, cfdaList, openDate, closeDate, oppStatus`.
- **Limits:** response shape varies (`data.oppHits`); enum/date formats are strict (YYYY-MM-DD); no rich full-text relevance — filter post-pull.

**USAspending.gov — award research** (`api.usaspending.gov/api/v2/...`)
- **Collect:** historical awards by NAICS/PSC/agency, incumbents, award amounts, recipients, period of performance.
- **Method:** **keyless** POST (`/search/spending_by_award/`, `/search/spending_by_award_count/`); GET detail via `generated_unique_award_id`.
- **Refresh:** weekly (or on-demand when scoring an opp).
- **Use:** "who won this work before, for how much, how often" → feeds Agency Relevance + Competition sub-scores.
- **Limits:** large payloads (use field selection + paging, 60–90s timeouts); award data lags real time.

### Non-API sources (Phase 7)

| Source | Best method | Refresh | Notes / limitation |
|---|---|---|---|
| State procurement (e.g. eVA, Cal eProcure, Bonfire/OpenGov tenants) | API where the vendor exposes one (Bonfire/OpenGov sometimes do); else **Playwright** browser automation; some offer **RSS/email alerts** | daily | No standard schema; per-portal scrapers; fragile to UI changes. |
| County / city procurement | Mostly **email-alert ingestion** + **Playwright**; occasional CSV/RSS | daily | Thousands of portals; prioritize by geography. Register the company's email for each portal's bid alerts → parse inbound. |
| School district RFPs | Email alerts + scraping; many on shared platforms (Bonfire, DemandStar, Public Purchase) | daily | Platform-level scrapers cover many districts at once — build per *platform*, not per district. |
| University procurement | Scraping + email alerts; some Ariba/Jaggaer supplier portals | weekly | Often supplier-portal gated; may need a registered account. |
| Foundation / private grants | Aggregators (Candid/Foundation Directory, Instrumentl, GrantStation) via **partner API or licensed data**; else scraping ToS-permitting | weekly | Respect each site's Terms; prefer licensed/partner feeds over scraping. |

**Connector design rules:** every connector normalizes into the `opportunities`/`grants` shape, stores the full `raw` payload, dedupes on `(source, external_id)`, and is idempotent (safe to re-run).

---

## 4. Database Schema

Full runnable schema is in **`schema.sql`** — 22 tables (`companies, users, company_profiles, documents, capability_statements, naics_codes, psc_codes, opportunities, grants, agencies, opportunity_scores, bid_workspaces, compliance_checklists, generated_proposals, proposal_sections, attachments, submission_tasks, submissions, amendments, contacts, reminders, audit_logs`), plus enums, indexes, `pgvector` for RAG, and Supabase RLS notes. Multi-tenant by `company_id`; `audit_logs` is append-only.

---

## 5. AI Agent Architecture

Agents are stateless functions orchestrated by a queue. Each writes to `audit_logs` (`actor_kind='agent'`, model version, source). **Hard rule for all agents: never invent facts, certifications, or past performance; cite the vault document each claim came from; flag anything not grounded for human input.**

| Agent | Purpose | Inputs | Outputs | Tools/Access | Guardrails | Failure handling |
|---|---|---|---|---|---|---|
| **Opportunity Scout** | Pull & normalize SAM.gov notices | profile NAICS/states, date window | rows in `opportunities` | SAM connector | dedupe; respect rate limit/cache | backoff + retry; alert on auth failure |
| **Grant Scout** | Pull & normalize Grants.gov | keywords, ALN, statuses | rows in `grants` | Grants connector | keyless; strict enum/date | retry; partial-result logging |
| **USAspending Research** | Incumbent & market intel | NAICS/PSC, agency | award history JSON | USAspending connector | read-only; cite award IDs | timeout → degrade gracefully (score without it) |
| **Fit Scoring** | 0–100 score + rationale | opp/grant + profile + USAspending | `opportunity_scores` | LLM + scoring fn | deterministic formula; LLM only for rationale | if data missing, lower confidence flag, don't guess |
| **Eligibility** | Pass/fail gates | opp + profile | eligibility verdict + reasons | LLM + rules | conservative; "unknown" ≠ "eligible" | escalate ambiguous to human |
| **Compliance Matrix** | Extract requirements | solicitation text/attachments | `compliance_checklists` rows | LLM + PDF parser | mark legal attestations `is_attestation=true` (human-only) | if doc unparseable, flag for manual review |
| **Proposal Writer** | Draft sections | checklist, profile, **approved** blurbs (RAG) | `proposal_sections` | LLM + vector store | reuse approved language only; no fabricated metrics; insert `[NEEDS HUMAN INPUT]` tokens | never fills certs/prices |
| **Capability Statement** | Build/refresh cap statement | profile | `capability_statements` + PDF | LLM + doc gen | facts from profile only | n/a |
| **Pricing Assistant** | *Suggest* structure & ranges | budget reqs, USAspending comps | pricing notes (draft only) | LLM + comps | **never submits or finalizes price**; labeled "draft, human must set" | flag low confidence |
| **Submission Prep** | Assemble package | approved sections + attachments | export zip/PDF + portal field map | doc/PDF gen, optional Playwright | blocks if any checklist item `open` or attestation unsigned | refuse export on missing required docs |
| **Human Review** | Orchestrate approvals | proposal + checklist | approval state changes | app DB | cannot self-approve; records approver id | n/a |
| **Follow-Up** | Watch amendments/deadlines | tracked opps | `amendments`, `reminders` | connectors | re-checks source for changed deadlines | alert on detected deadline change |

---

## 6. Scoring System (0–100)

Each sub-score is normalized to 0–1, multiplied by its weight, summed. Weights total 100.

| Sub-score | Weight | How it's computed |
|---|---|---|
| NAICS match | 15 | 1.0 exact; 0.6 same 4-digit; 0.3 same 2-digit; else 0 |
| PSC match | 8 | 1.0 exact; 0.5 same family letter; else 0 |
| Agency relevance | 10 | from USAspending: prior awards to you / familiarity with agency |
| Location fit | 7 | 1.0 in service state or remote-ok; 0.4 adjacent; 0 otherwise |
| Past-performance fit | 15 | semantic similarity of scope to your approved past-perf vault |
| Deadline feasibility | 12 | days-to-deadline vs. estimated effort tier (penalize <7 days) |
| Estimated value fit | 8 | 1.0 if within [min_value, max_value]; taper outside the band |
| Required certifications | 10 | 1.0 if all set-asides/certs held; 0.4 if obtainable in time; 0 if blocked |
| Competition level | 8 | from USAspending: fewer historical bidders/incumbent-lock → higher |
| Document complexity | 4 | inverse of attachment count + page-limit burden |
| Strategic value | 3 | manual/profile flag (target agency, door-opener) |

**Formula**

```
score = round(100 * Σ( weight_i/100 * subscore_i ))
recommended = score >= 70 AND eligibility == pass AND deadline_feasible
```

Store every sub-score in `opportunity_scores.subscores` (jsonb) so the UI can show the breakdown and the user can override weights per company later.

---

## 7. Proposal Generator

Generates these sections, each as an editable `proposal_sections` row with provenance (`source_blurbs` → `documents.id`):

`cover_letter · executive_summary · technical_approach · management_approach · staffing_plan · past_performance · risk_mitigation · pricing_notes · budget_narrative · grant_narrative · compliance_matrix · required_attachment_list`

**Rules**
- Pulls **only approved** language from the vault via RAG (pgvector over `documents.embedding` + `company_profiles.approved_blurbs`).
- Any fact not found in the vault is emitted as a literal `[NEEDS HUMAN INPUT: …]` token — never invented.
- `pricing_notes` and `budget_narrative` are **drafts with placeholders**; the system never sets final numbers.
- `compliance_matrix` is generated directly from `compliance_checklists`, cross-referenced to the section that answers each requirement.
- Output respects page/format limits captured in the checklist (the Submission Prep agent validates before export).

---

## 8. Submission Workflow (safe, human-gated)

```
1  Scout/Grant agents discover  → opportunities / grants
2  Fit Scoring agent scores     → opportunity_scores (+rationale)
3  USER selects an opportunity  → (explicit human action)
4  System creates bid_workspace
5  Compliance agent extracts requirements → compliance_checklists
6  System builds required-document checklist (attachments)
7  USER uploads missing docs to the vault
8  Proposal Writer drafts sections (approved language only)
9  USER reviews & edits each section (locks sections)
10 Submission Prep validates compliance (blocks if any item open/attestation unsigned)
11 USER gives FINAL APPROVAL  → unlocks export
12 System EITHER exports package (PDF/zip)  OR  assists portal entry
       (assisted = pre-fills fields via Playwright, human clicks submit)
13 System logs submission + confirmation # + sets deadline reminders
```

Steps 3, 7, 9, 11, and the submit click in 12 are **always human**.

---

## 9. Compliance Guardrails

- **No false certifications** — `is_attestation=true` checklist items are human-sign-only; agents are forbidden from completing them.
- **No fabricated past performance** — Proposal Writer can only cite vault documents; missing facts become `[NEEDS HUMAN INPUT]`.
- **No automatic legal attestations** — reps & certs require a named human approver recorded in `audit_logs`.
- **No pricing submission without approval** — Pricing Assistant outputs drafts only; final numbers set by a human.
- **No blind portal submission** — export or assisted entry only; a human performs the final submit.
- **Full audit trail** — append-only `audit_logs` for every create/update/approve/submit (user, agent, model version, source).
- **Version history** — `generated_proposals.version`, `proposal_sections.updated_at`, `capability_statements.version`.
- **Document source tracking** — `documents.source_note` + `proposal_sections.source_blurbs` provenance.
- **Human approval required** — Submission Prep refuses to export while any required item is unsatisfied.

---

## 10. Recommended Tech Stack (fast build)

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui** on **Vercel** | fast, matches your toolchain |
| Backend / API | **Python + FastAPI** (agents, connectors, scoring) | best for scraping + AI; clean async |
| DB | **Supabase Postgres** | auth + storage + RLS + pgvector in one |
| File storage | **Supabase Storage** (or S3/R2) | vault docs, exported packages |
| Queue / scheduler | **Celery + Redis** (or Supabase cron + Upstash) | nightly ingestion, scoring, reminders |
| AI model layer | **Claude** (proposal writing, compliance extraction, rationale) + optional GPT for second-opinion drafts | Claude for critical/compliance; mirror your ChatGPT-draft → Claude-rebuild workflow |
| Browser automation | **Playwright (Python)** | portal scraping + assisted submission |
| Email integration | **Postmark/Resend** (outbound reminders) + **inbound parse** (portal bid alerts) | ingest county/city alerts |
| Document generation | **docx** (python-docx) / Markdown → HTML | editable proposals |
| PDF generation | **WeasyPrint** or **Playwright print-to-PDF** | clean proposal/cap-statement PDFs |
| Vector DB / RAG | **pgvector** in Supabase | no extra infra |
| Auth | **Supabase Auth** (+ RLS by `company_id`) | tenant isolation |
| Hosting | **Vercel** (frontend) + **Fly.io/Render/Railway** (FastAPI workers) | simple, scalable |

Secrets in Vercel/Fly env + a manager; `SAM_GOV_API_KEY` never in code.

---

## 11. API Integration Plan

**SAM.gov** — GET `api.sam.gov/prod/opportunities/v2/search`, `api_key` in query; required `postedFrom/postedTo` (MM/DD/YYYY) + pagination (`limit`/`offset`); pull by NAICS+date window, filter locally; read attachments from `resourceLinks`; cache to stay under ~1,000/day. Working code in `connectors.py › SamGovConnector`.

**Grants.gov** — POST `api.grants.gov/v1/api/search2`, **no key**, JSON body (`keyword, oppStatuses, agencies, fundingCategories, rows, startRecordNum`); parse `data.oppHits` + `data.hitCount`; `fetchOpportunity` for detail; test host `api.test.grants.gov`. Code in `connectors.py › GrantsGovConnector`.

**USAspending** — POST `api.usaspending.gov/api/v2/search/spending_by_award/`, **no key**, body with `filters` (`naics_codes`, `agencies`, `time_period`, `award_type_codes`) + `fields`; detail by `generated_unique_award_id`. Code in `connectors.py › USAspendingConnector`.

**Portal scraping / browser automation** — Playwright per *platform* (Bonfire, DemandStar, OpenGov, Public Purchase, Ariba) not per agency; run headless in workers; store selectors as config so UI changes are quick to patch; respect robots/ToS; prefer official feeds/email alerts where available.

**Email-alert ingestion** — register your company email for portal bid alerts → route to an inbound-parse webhook → LLM extracts (title, agency, deadline, link) → upsert into `opportunities`.

**Document parsing** — download SAM `resourceLinks` / grant packages → extract text (pdfplumber / unstructured) → Compliance agent pulls "shall/must" + Section L/M into the checklist.

**PDF proposal generation** — render approved Markdown sections → HTML template → WeasyPrint/Playwright PDF; assemble with attachments into the export zip.

---

## 12. Build Roadmap

| Phase | Deliverable |
|---|---|
| **1** | Opportunity search + company profile vault (SAM + Grants ingestion, profile CRUD, document upload) |
| **2** | Scoring engine + dashboard + opportunity feed/detail with AI summaries |
| **3** | Bid/grant workspace: select → requirement extraction → compliance checklist |
| **4** | Proposal/document generation from vault (RAG) + capability statement builder + PDF export |
| **5** | Compliance review layer: attestation flags, validation gate, approval workflow, audit log |
| **6** | Assisted submission: package export + Playwright pre-fill (human submits) + submission tracker |
| **7** | State/local/education portal expansion (platform scrapers + email-alert ingestion) |
| **8** | Full AI operating system: pricing assistant, follow-up/amendment monitoring, multi-company SaaS, weight tuning, analytics |

---

## 13. User Interface — Screens

- **Dashboard** — pipeline value, deadlines this week, new high-score opps, open tasks/reminders.
- **Opportunity Feed** — ranked, filterable (source/NAICS/state/score/deadline) list with score chips.
- **Opportunity Detail** — AI summary, score breakdown, eligibility verdict, USAspending incumbents, attachments, "Start workspace."
- **Company Profile Vault** — identifiers, NAICS/PSC, states, value band, set-asides, approved blurbs editor.
- **Document Vault** — upload, tag (kind), approve-for-reuse toggle, expiry tracking, provenance.
- **Bid Workspace** — split view: requirements/compliance checklist ↔ proposal editor; status pipeline.
- **Grant Workspace** — same pattern, grant-narrative + budget-narrative focused.
- **AI Proposal Editor** — section list, regenerate/edit/lock, `[NEEDS HUMAN INPUT]` highlights, provenance hover.
- **Compliance Checklist** — requirement rows, section refs, status, evidence link, attestation (human-only) flag.
- **Submission Tracker** — pipeline board, confirmation #s, deadlines, win/loss.
- **Settings / API Keys** — store `SAM_GOV_API_KEY`, email/portal credentials, scoring-weight tuning.

---

## 14. Deliverables

### 14.1 First GitHub issue list (Phase 1)

1. `infra:` Provision Supabase project; run `schema.sql`; enable RLS + pgvector.
2. `infra:` Next.js + FastAPI monorepo scaffold; Vercel + Fly deploy; CI.
3. `auth:` Supabase Auth + company/user bootstrap + tenant RLS policies.
4. `vault:` Company profile CRUD (NAICS/PSC/states/value band/set-asides).
5. `vault:` Document upload to Storage + kind tagging + approve-for-reuse + expiry.
6. `connector:` SAM.gov ingestion worker (`connectors.py`) + nightly schedule + dedupe.
7. `connector:` Grants.gov `search2` ingestion worker + dedupe.
8. `connector:` USAspending research function (on-demand by NAICS/agency).
9. `feed:` Opportunity feed + detail page (filters, pagination).
10. `ai:` Opportunity summary endpoint (Claude) with caching.
11. `obs:` `audit_logs` writer + structured logging + Sentry.
12. `qa:` Connector contract tests against test hosts.

### 14.2 First sprint plan (2 weeks)

- **Days 1–2:** issues 1–2 (infra/scaffold).
- **Days 3–4:** issues 3–4 (auth + profile).
- **Days 5–6:** issue 5 (document vault + storage).
- **Days 7–9:** issues 6–8 (the three connectors + scheduler).
- **Days 10–11:** issues 9–10 (feed/detail + AI summary).
- **Day 12:** issue 11 (audit/logging).
- **Days 13–14:** issue 12 + hardening + demo: *"Pull live SAM + Grants opps for my NAICS into a ranked feed."*

### 14.3 Environment variables

```
# --- Supabase ---
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

# --- Government APIs ---
SAM_GOV_API_KEY=            # rotate the one shared in chat; keep only here
# Grants.gov search2 + USAspending need no key

# --- AI ---
ANTHROPIC_API_KEY=
OPENAI_API_KEY=             # optional second-opinion drafts

# --- Queue / cache ---
REDIS_URL=

# --- Email ---
RESEND_API_KEY=             # or POSTMARK_SERVER_TOKEN
INBOUND_PARSE_SECRET=       # verify portal-alert webhooks

# --- App ---
APP_BASE_URL=
JWT_SECRET=
ENVIRONMENT=development
```

### 14.4 Sample folder structure

```
autobid/
├─ apps/
│  ├─ web/                      # Next.js frontend (Vercel)
│  │  ├─ app/ (dashboard, feed, opportunity/[id], vault, workspace/[id], settings)
│  │  ├─ components/  └─ lib/
│  └─ api/                      # FastAPI backend (Fly/Render)
│     ├─ main.py
│     ├─ connectors/   sam_gov.py  grants_gov.py  usaspending.py  email_ingest.py
│     ├─ agents/       scout.py  scoring.py  eligibility.py  compliance.py
│     │                proposal_writer.py  capability.py  pricing.py  submission_prep.py  followup.py
│     ├─ scoring/      model.py        # the 0–100 formula
│     ├─ rag/          embed.py  retrieve.py
│     ├─ docs/         render_pdf.py  render_docx.py
│     ├─ scraping/     playwright/ (bonfire.py, demandstar.py, opengov.py)
│     ├─ tasks/        schedule.py  worker.py    # Celery
│     └─ db/           models.py  audit.py
├─ db/   schema.sql  migrations/
├─ packages/  shared types
└─ .env.example  README.md
```

### 14.5 Agent prompts (system-prompt skeletons)

**Proposal Writer**
> You draft one proposal section for a government bid. Use ONLY the approved company language and facts provided in CONTEXT (retrieved from the vault). You may rephrase for the solicitation but must not invent metrics, certifications, client names, or past performance. For any required fact missing from CONTEXT, output the literal token `[NEEDS HUMAN INPUT: <what is needed>]`. Never write pricing numbers or sign certifications. Respect the page/format limits in REQUIREMENTS. Return Markdown only.

**Compliance Matrix**
> Extract every binding requirement ("shall/must/required to") and all Section L (instructions) and Section M (evaluation) items from the solicitation text. Return a JSON array: `{requirement, section_ref, category(format|cert|attachment|eval), is_attestation}`. Set `is_attestation=true` for any legal certification, representation, or signature. Do not summarize away requirements; when unsure, include and flag it.

**Fit Scoring (rationale only)**
> Given the computed sub-scores and the opportunity/profile, write a 3–4 sentence rationale explaining the total score and the single biggest risk. Do not change the numbers. Be candid about weaknesses; do not oversell.

**Eligibility**
> Decide pass / fail / unknown for this opportunity against the company profile (set-aside, size standard, registration, citizenship, cost-share). "unknown" is NOT "pass." List the specific gate(s) that drove a fail/unknown. Be conservative.

### 14.6 Scoring formula

See **Section 6** — weighted sum of 11 normalized sub-scores; implemented in `apps/api/scoring/model.py`; sub-scores persisted to `opportunity_scores.subscores`.

### 14.7 Starter code outline

Provided: **`schema.sql`** (database) and **`connectors.py`** (SAM.gov / Grants.gov / USAspending). Next stubs to write, in order: `scoring/model.py` → `agents/compliance.py` → `rag/{embed,retrieve}.py` → `agents/proposal_writer.py` → `docs/render_pdf.py`.

---

### Key risks to manage early
- **SAM.gov rate limit (~1,000/day):** pull by NAICS+date window and cache; don't re-pull unchanged notices.
- **Portal fragility (Phase 7):** scrapers break on UI changes — keep selectors in config and prefer email-alert ingestion.
- **Compliance liability:** the human gates in Sections 8–9 are the product's core value; never weaken them for convenience.
- **Data ToS:** for foundation/private grants, license data or use partner APIs rather than scraping where ToS prohibits it.
