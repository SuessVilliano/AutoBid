-- AutoBid: subcontractor Rolodex
-- Run after 0001_init.sql. Idempotent: safe to run multiple times.

-- ---------------------------------------------------------------------------
-- subcontractors: per-company teaming partner directory.
-- ---------------------------------------------------------------------------
create table if not exists public.subcontractors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  website text,
  capabilities text[] not null default '{}',
  naics text[] not null default '{}',
  certifications text[] not null default '{}',
  regions text[] not null default '{}',
  past_projects integer,
  rate text,
  status text not null default 'active'
    check (status in ('vetted', 'active', 'contacted', 'inactive')),
  preferred boolean not null default false,
  notes text,
  last_contacted timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists subs_company_idx on public.subcontractors(company_id);
create index if not exists subs_preferred_idx on public.subcontractors(company_id, preferred);
create index if not exists subs_naics_gin on public.subcontractors using gin (naics);
create index if not exists subs_certs_gin on public.subcontractors using gin (certifications);

drop trigger if exists subs_touch on public.subcontractors;
create trigger subs_touch before update on public.subcontractors
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: only the owner of the parent company can access subs.
-- ---------------------------------------------------------------------------
alter table public.subcontractors enable row level security;

drop policy if exists "subs via company owner" on public.subcontractors;
create policy "subs via company owner" on public.subcontractors
  for all using (
    exists (select 1 from public.companies c
            where c.id = subcontractors.company_id and c.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.companies c
            where c.id = subcontractors.company_id and c.owner_id = auth.uid())
  );
