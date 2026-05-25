-- ============================================================================
-- AutoBid — Gov Contract Bidding & Grant Submission Platform
-- PostgreSQL / Supabase schema  (run in Supabase SQL editor or psql)
-- ----------------------------------------------------------------------------
-- Multi-tenant by company_id. Enable RLS on tenant tables in Supabase and
-- scope every policy to the caller's company_id (see notes at bottom).
-- ============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "vector";       -- pgvector for RAG embeddings

-- ---------- enums ----------------------------------------------------------
create type user_role            as enum ('owner','admin','editor','reviewer','viewer');
create type opp_source           as enum ('sam_gov','grants_gov','state','county','city','school','university','foundation','manual');
create type opp_type             as enum ('contract','grant');
create type workspace_status     as enum ('draft','in_progress','in_review','approved','submitted','won','lost','no_bid','archived');
create type doc_kind             as enum ('capability_statement','past_performance','resume','certification','financials','registration','template','attachment','other');
create type checklist_status     as enum ('open','satisfied','waived','blocked');
create type submission_status    as enum ('not_started','package_exported','portal_assisted','submitted','confirmed','rejected','withdrawn');
create type task_status          as enum ('todo','doing','blocked','done');
create type reminder_kind        as enum ('deadline','amendment','qa_cutoff','site_visit','renewal','custom');
create type audit_action         as enum ('create','update','delete','approve','reject','submit','export','login','ingest');

-- ---------- core tenancy ---------------------------------------------------
create table companies (
  id              uuid primary key default gen_random_uuid(),
  legal_name      text not null,
  dba_name        text,
  uei             text,                 -- SAM.gov Unique Entity ID
  cage_code       text,
  duns_legacy     text,
  sam_status      text,                 -- active / expired / not_registered
  ein             text,
  website         text,
  primary_naics   text,
  set_asides      text[] default '{}',  -- e.g. {WOSB,SDVOSB,HUBZone,8a}
  hq_state        text,
  hq_city         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table users (
  id              uuid primary key default gen_random_uuid(),  -- mirror auth.users.id
  company_id      uuid not null references companies(id) on delete cascade,
  email           text not null unique,
  full_name       text,
  role            user_role not null default 'editor',
  created_at      timestamptz not null default now()
);

-- ---------- reference data (shared, not tenant-scoped) ---------------------
create table naics_codes (
  code            text primary key,           -- e.g. 541512
  title           text not null,
  size_standard   text                          -- $ or employee threshold
);

create table psc_codes (
  code            text primary key,           -- e.g. D302
  title           text not null,
  category        text
);

create table agencies (
  id              uuid primary key default gen_random_uuid(),
  source          opp_source not null,
  name            text not null,
  sub_tier        text,
  toptier_code    text,                         -- USAspending agency code
  state           text,
  created_at      timestamptz not null default now(),
  unique (source, name, sub_tier)
);

-- ---------- company knowledge / vault --------------------------------------
create table company_profiles (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  naics_list      text[] default '{}',
  psc_list        text[] default '{}',
  service_states  text[] default '{}',
  remote_ok       boolean default true,
  max_value       numeric,                      -- realistic ceiling for a single bid
  min_value       numeric,
  staff_count     int,
  bonding_capacity numeric,
  differentiators text,                          -- approved boilerplate
  approved_blurbs jsonb default '{}',            -- {exec_summary:"", mgmt_approach:""...}
  updated_at      timestamptz not null default now()
);

create table documents (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  kind            doc_kind not null,
  title           text not null,
  storage_path    text not null,                 -- Supabase Storage / S3 key
  mime_type       text,
  bytes           bigint,
  is_approved     boolean default false,         -- approved language reuse flag
  expires_on      date,                          -- certs/registrations expiry
  source_note     text,                          -- provenance / where it came from
  embedding       vector(1536),                  -- RAG over vault content
  created_by      uuid references users(id),
  created_at      timestamptz not null default now()
);

create table capability_statements (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  version         int not null default 1,
  title           text not null,
  body            jsonb not null,                -- structured sections
  pdf_document_id uuid references documents(id),
  is_current      boolean default false,
  created_by      uuid references users(id),
  created_at      timestamptz not null default now()
);

create table contacts (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid references companies(id) on delete cascade, -- null = gov contact
  agency_id       uuid references agencies(id),
  name            text,
  title           text,
  email           text,
  phone           text,
  role_note       text,                          -- contracting officer, partner, etc.
  created_at      timestamptz not null default now()
);

-- ---------- ingested opportunities -----------------------------------------
create table opportunities (
  id              uuid primary key default gen_random_uuid(),
  source          opp_source not null,
  external_id     text not null,                 -- SAM noticeId, etc.
  type            opp_type not null default 'contract',
  title           text not null,
  agency_id       uuid references agencies(id),
  description     text,
  naics           text,
  psc             text,
  set_aside       text,
  place_of_perf_state text,
  posted_date     date,
  response_deadline timestamptz,
  qa_cutoff       timestamptz,
  estimated_value numeric,
  solicitation_no text,
  url             text,
  resource_links  jsonb default '[]',            -- SAM resourceLinks attachments
  raw             jsonb,                          -- full source payload
  ingested_at     timestamptz not null default now(),
  unique (source, external_id)
);

create table grants (
  id              uuid primary key default gen_random_uuid(),
  source          opp_source not null default 'grants_gov',
  external_id     text not null,                 -- opportunityNumber
  title           text not null,
  agency_id       uuid references agencies(id),
  cfda_aln        text,                          -- Assistance Listing Number
  category        text,
  funding_floor   numeric,
  funding_ceiling numeric,
  total_funding   numeric,
  eligibility     text,
  cost_sharing    boolean,
  open_date       date,
  close_date      timestamptz,
  url             text,
  raw             jsonb,
  ingested_at     timestamptz not null default now(),
  unique (source, external_id)
);

-- ---------- amendments to opportunities ------------------------------------
create table amendments (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid references opportunities(id) on delete cascade,
  grant_id        uuid references grants(id) on delete cascade,
  number          text,
  summary         text,
  new_deadline    timestamptz,
  detected_at     timestamptz not null default now(),
  raw             jsonb,
  check (opportunity_id is not null or grant_id is not null)
);

-- ---------- scoring --------------------------------------------------------
create table opportunity_scores (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  opportunity_id  uuid references opportunities(id) on delete cascade,
  grant_id        uuid references grants(id) on delete cascade,
  total_score     numeric not null,              -- 0-100
  subscores       jsonb not null,                -- {naics:.., past_perf:..}
  rationale       text,                          -- AI explanation
  recommended     boolean default false,
  model_version   text,
  scored_at       timestamptz not null default now(),
  check (opportunity_id is not null or grant_id is not null)
);

-- ---------- bid / grant workspace ------------------------------------------
create table bid_workspaces (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  opportunity_id  uuid references opportunities(id),
  grant_id        uuid references grants(id),
  name            text not null,
  status          workspace_status not null default 'draft',
  owner_id        uuid references users(id),
  bid_decision    text,                          -- bid / no-bid + reason
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (opportunity_id is not null or grant_id is not null)
);

create table compliance_checklists (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references bid_workspaces(id) on delete cascade,
  requirement     text not null,                 -- extracted "shall" statement
  section_ref     text,                          -- L.3.2, Section M, etc.
  category        text,                          -- format / cert / attachment / eval
  status          checklist_status not null default 'open',
  evidence_doc_id uuid references documents(id),
  notes           text,
  is_attestation  boolean default false,         -- flags legal certs for human-only
  created_at      timestamptz not null default now()
);

create table generated_proposals (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references bid_workspaces(id) on delete cascade,
  version         int not null default 1,
  status          text not null default 'draft', -- draft / reviewed / approved
  model_version   text,
  approved_by     uuid references users(id),
  approved_at     timestamptz,
  created_at      timestamptz not null default now()
);

create table proposal_sections (
  id              uuid primary key default gen_random_uuid(),
  proposal_id     uuid not null references generated_proposals(id) on delete cascade,
  section_type    text not null,                 -- cover_letter, exec_summary, tech_approach...
  ordinal         int not null default 0,
  content_md      text,                          -- editable markdown
  source_blurbs   uuid[] default '{}',           -- documents.id reused (provenance)
  is_ai_generated boolean default true,
  is_locked       boolean default false,         -- human-edited / approved
  updated_at      timestamptz not null default now()
);

create table attachments (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references bid_workspaces(id) on delete cascade,
  document_id     uuid references documents(id),
  required        boolean default true,
  satisfied       boolean default false,
  label           text not null,                 -- "SF-33", "Past Performance Refs"
  created_at      timestamptz not null default now()
);

-- ---------- submission -----------------------------------------------------
create table submission_tasks (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references bid_workspaces(id) on delete cascade,
  title           text not null,
  assignee_id     uuid references users(id),
  due_at          timestamptz,
  status          task_status not null default 'todo',
  created_at      timestamptz not null default now()
);

create table submissions (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references bid_workspaces(id) on delete cascade,
  method          text not null,                 -- export / portal_assisted
  status          submission_status not null default 'not_started',
  package_path    text,                          -- exported zip/pdf in storage
  portal_url      text,
  confirmation_no text,
  submitted_by    uuid references users(id),     -- human who clicked submit
  submitted_at    timestamptz,
  created_at      timestamptz not null default now()
);

create table reminders (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  workspace_id    uuid references bid_workspaces(id) on delete cascade,
  kind            reminder_kind not null default 'deadline',
  fire_at         timestamptz not null,
  message         text not null,
  channel         text default 'email',          -- email / sms / in_app
  sent            boolean default false,
  created_at      timestamptz not null default now()
);

-- ---------- audit (append-only) --------------------------------------------
create table audit_logs (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid references companies(id) on delete set null,
  actor_id        uuid references users(id),
  actor_kind      text default 'user',           -- user / agent / system
  action          audit_action not null,
  entity_type     text not null,
  entity_id       uuid,
  before          jsonb,
  after           jsonb,
  meta            jsonb,                          -- agent name, model version, source
  created_at      timestamptz not null default now()
);

-- ---------- helpful indexes ------------------------------------------------
create index on opportunities (source, posted_date desc);
create index on opportunities (naics);
create index on grants (close_date);
create index on opportunity_scores (company_id, total_score desc);
create index on bid_workspaces (company_id, status);
create index on reminders (fire_at) where sent = false;
create index on documents using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ============================================================================
-- RLS NOTES (Supabase):
--   alter table <t> enable row level security;
--   create policy tenant_isolation on <t>
--     using (company_id = (select company_id from users where id = auth.uid()));
-- Apply to every table that has a company_id column. Reference tables
-- (naics_codes, psc_codes, agencies) can stay public-read.
-- audit_logs: allow INSERT, deny UPDATE/DELETE for all app roles.
-- ============================================================================
