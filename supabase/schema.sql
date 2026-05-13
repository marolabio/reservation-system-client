create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  occupancy integer not null default 1 check (occupancy > 0),
  quantity integer not null default 1 check (quantity >= 0),
  rate numeric(10, 2) not null default 0,
  image jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  contact_number text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  checkin date not null,
  checkout date not null,
  adult integer not null default 1 check (adult >= 0),
  children integer not null default 0 check (children >= 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  check (checkout > checkin)
);

create table if not exists public.reserved_rooms (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete restrict,
  reserved_quantity integer not null default 1 check (reserved_quantity > 0),
  created_at timestamptz not null default now()
);

alter table public.reservations add column if not exists notes text;

create index if not exists reserved_rooms_room_id_idx on public.reserved_rooms(room_id);
create index if not exists reserved_rooms_reservation_id_idx on public.reserved_rooms(reservation_id);
create index if not exists reservations_dates_status_idx on public.reservations(checkin, checkout, status);

alter table public.rooms enable row level security;
alter table public.customers enable row level security;
alter table public.reservations enable row level security;
alter table public.reserved_rooms enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.rooms to anon, authenticated;
grant insert on public.customers to anon, authenticated;
grant select, insert on public.reservations to anon, authenticated;
grant select, insert on public.reserved_rooms to anon, authenticated;
grant select on public.customers to authenticated;
grant update on public.reservations to authenticated;

drop policy if exists "Rooms are readable by authenticated users" on public.rooms;
drop policy if exists "Reservations are readable by authenticated users" on public.reservations;
drop policy if exists "Customers are readable by authenticated users" on public.customers;
drop policy if exists "Reserved rooms are readable by authenticated users" on public.reserved_rooms;
drop policy if exists "Authenticated users can create customers" on public.customers;
drop policy if exists "Authenticated users can create reservations" on public.reservations;
drop policy if exists "Authenticated users can create reserved rooms" on public.reserved_rooms;
drop policy if exists "rooms_select_public" on public.rooms;
drop policy if exists "customers_select_admin" on public.customers;
drop policy if exists "customers_insert_public" on public.customers;
drop policy if exists "reservations_select_public" on public.reservations;
drop policy if exists "reservations_insert_public" on public.reservations;
drop policy if exists "reservations_update_admin" on public.reservations;
drop policy if exists "reserved_rooms_select_public" on public.reserved_rooms;
drop policy if exists "reserved_rooms_insert_public" on public.reserved_rooms;

create policy "rooms_select_public"
  on public.rooms for select
  to anon, authenticated
  using (true);

create policy "customers_select_admin"
  on public.customers for select
  to authenticated
  using (true);

create policy "customers_insert_public"
  on public.customers for insert
  to anon, authenticated
  with check (
    first_name is not null
    and last_name is not null
    and contact_number is not null
    and email is not null
  );

create policy "reservations_select_public"
  on public.reservations for select
  to anon, authenticated
  using (true);

create policy "reservations_insert_public"
  on public.reservations for insert
  to anon, authenticated
  with check (status = 'pending');

create policy "reservations_update_admin"
  on public.reservations for update
  to authenticated
  using (true)
  with check (true);

create policy "reserved_rooms_select_public"
  on public.reserved_rooms for select
  to anon, authenticated
  using (true);

create policy "reserved_rooms_insert_public"
  on public.reserved_rooms for insert
  to anon, authenticated
  with check (true);

drop function if exists public.room_availability(date, date);
drop function if exists public.create_reservation(text, text, text, text, uuid, integer, date, date, integer, integer, text);

insert into public.rooms (name, description, occupancy, quantity, rate, image)
values
  (
    'Garden Villa',
    'Private villa near the garden path with a queen bed, patio, and ensuite bath.',
    2,
    6,
    3200.00,
    '{"url":"https://images.unsplash.com/photo-1566073771259-6a8506099945"}'
  ),
  (
    'Poolside Deluxe',
    'Deluxe room steps from the pool with a king bed and daybed.',
    3,
    4,
    4500.00,
    '{"url":"https://images.unsplash.com/photo-1590490360182-c33d57733427"}'
  ),
  (
    'Family Suite',
    'Spacious suite with two bedrooms, lounge space, and breakfast for four.',
    5,
    3,
    6800.00,
    '{"url":"https://images.unsplash.com/photo-1582719478250-c89cae4dc85b"}'
  )
on conflict do nothing;
