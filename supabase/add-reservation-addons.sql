create table if not exists public.reservation_addons (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  description text not null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price numeric(10, 2) not null default 0 check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create index if not exists reservation_addons_reservation_id_idx
  on public.reservation_addons(reservation_id);

alter table public.reservation_addons disable row level security;

grant select, insert, update, delete on public.reservation_addons to authenticated;
