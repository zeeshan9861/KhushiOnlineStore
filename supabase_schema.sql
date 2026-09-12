-- Run this once in Supabase SQL Editor.
create table if not exists public.products (
  id text primary key,
  product jsonb not null,
  created_at timestamptz not null default now()
);

-- The server uses the service-role key, so keep this table private.
-- Do not expose SUPABASE_SERVICE_ROLE_KEY in browser code.
