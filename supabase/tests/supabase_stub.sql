-- Minimal Supabase environment stub so the migrations and the behavior
-- tests run on a plain Postgres 16 cluster (CI, or a local instance) —
-- no Docker or hosted project needed. Mirrors only the parts of
-- Supabase the schema touches: auth.users + auth.uid()/auth.role(),
-- the storage schema with foldername(), and the anon/authenticated
-- roles. See tests/README.md for how to run.

-- Roles are cluster-wide: tolerate a cluster that already has them.
do $$
begin
  begin create role anon nologin; exception when duplicate_object then null; end;
  begin create role authenticated nologin; exception when duplicate_object then null; end;
  begin create role service_role nologin bypassrls; exception when duplicate_object then null; end;
end;
$$;

create schema auth;

create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Supabase resolves these from the request JWT; the stub reads the same
-- request.jwt.claims GUC that PostgREST sets, so tests can impersonate
-- users with set_config().
create or replace function auth.uid()
returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;

create or replace function auth.role()
returns text
language sql stable
as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', 'anon')
$$;

create schema storage;

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  created_at timestamptz default now()
);

alter table storage.objects enable row level security;

create or replace function storage.foldername(name text)
returns text[]
language sql immutable
as $$
  select (string_to_array(name, '/'))[1 : array_length(string_to_array(name, '/'), 1) - 1]
$$;

grant usage on schema public, auth, storage to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
grant all on storage.objects, storage.buckets to authenticated;
grant select on auth.users to authenticated;
