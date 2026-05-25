-- AutoBid: initial schema
-- Run this in the Supabase SQL Editor on your project, top to bottom.
-- Idempotent: safe to run multiple times.

-- ---------------------------------------------------------------------------
-- profiles: app-level data per auth.users row, auto-created via trigger.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz default now()
);

-- Trigger: when a Supabase auth.users row is created, create a profiles row.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- companies: each user can own multiple companies they're bidding from.
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  description text,
  websites text[] not null default '{}',
  min_value integer not null default 25000,
  max_value integer not null default 5000000,
  service_states text[] not null default '{}',
  set_asides text[] not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists companies_owner_idx on public.companies(owner_id);

-- ---------------------------------------------------------------------------
-- naics_codes: per-company list of qualifying NAICS codes.
-- ---------------------------------------------------------------------------
create table if not exists public.naics_codes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  label text not null,
  is_primary boolean not null default false,
  enabled boolean not null default true,
  created_at timestamptz default now(),
  unique (company_id, code)
);

create index if not exists naics_company_idx on public.naics_codes(company_id);

-- ---------------------------------------------------------------------------
-- vault_docs: uploaded files and AI-drafted markdown per company.
-- Uploaded file bytes live in Storage bucket `vault`; storage_path points at it.
-- ---------------------------------------------------------------------------
create table if not exists public.vault_docs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  kind text not null,
  title text not null,
  source text not null check (source in ('uploaded', 'generated')),
  status text not null default 'draft' check (status in ('draft', 'approved')),
  markdown text,
  file_name text,
  file_type text,
  file_size bigint,
  storage_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists vault_company_idx on public.vault_docs(company_id);

-- Touch updated_at automatically.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists companies_touch on public.companies;
create trigger companies_touch before update on public.companies
  for each row execute function public.touch_updated_at();

drop trigger if exists vault_docs_touch on public.vault_docs;
create trigger vault_docs_touch before update on public.vault_docs
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: each user only sees their own companies and what hangs
-- off them.
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.companies     enable row level security;
alter table public.naics_codes   enable row level security;
alter table public.vault_docs    enable row level security;

-- profiles: user can read and edit their own row.
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles self write" on public.profiles;
create policy "profiles self write" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles
  for insert with check (auth.uid() = id);

-- companies: only owner can do anything.
drop policy if exists "companies owner all" on public.companies;
create policy "companies owner all" on public.companies
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- naics_codes: only owner of the parent company.
drop policy if exists "naics via company owner" on public.naics_codes;
create policy "naics via company owner" on public.naics_codes
  for all using (
    exists (select 1 from public.companies c
            where c.id = naics_codes.company_id and c.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.companies c
            where c.id = naics_codes.company_id and c.owner_id = auth.uid())
  );

-- vault_docs: only owner of the parent company.
drop policy if exists "vault via company owner" on public.vault_docs;
create policy "vault via company owner" on public.vault_docs
  for all using (
    exists (select 1 from public.companies c
            where c.id = vault_docs.company_id and c.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.companies c
            where c.id = vault_docs.company_id and c.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Storage bucket for vault file uploads.
-- ---------------------------------------------------------------------------
-- Run this once in the Supabase Storage UI, OR uncomment to do it via SQL:
-- insert into storage.buckets (id, name, public) values ('vault', 'vault', false)
--   on conflict do nothing;

-- Storage RLS: users can read/write only inside folders named after their
-- companies (path layout: vault/<company_id>/<doc_id>/<filename>).
-- These policies assume the bucket has been created.

drop policy if exists "vault storage read own" on storage.objects;
create policy "vault storage read own" on storage.objects
  for select using (
    bucket_id = 'vault'
    and exists (
      select 1 from public.companies c
      where c.owner_id = auth.uid()
        and c.id::text = split_part(name, '/', 1)
    )
  );

drop policy if exists "vault storage write own" on storage.objects;
create policy "vault storage write own" on storage.objects
  for insert with check (
    bucket_id = 'vault'
    and exists (
      select 1 from public.companies c
      where c.owner_id = auth.uid()
        and c.id::text = split_part(name, '/', 1)
    )
  );

drop policy if exists "vault storage delete own" on storage.objects;
create policy "vault storage delete own" on storage.objects
  for delete using (
    bucket_id = 'vault'
    and exists (
      select 1 from public.companies c
      where c.owner_id = auth.uid()
        and c.id::text = split_part(name, '/', 1)
    )
  );
