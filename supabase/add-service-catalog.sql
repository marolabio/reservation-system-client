create table if not exists public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  unit_price numeric(10, 2) not null default 0 check (unit_price >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create index if not exists service_catalog_status_idx
  on public.service_catalog(status);

alter table public.service_catalog disable row level security;

grant select, insert, update, delete on public.service_catalog to authenticated;
