create extension if not exists pgcrypto;

drop table if exists public.reserved_rooms cascade;
drop table if exists public.reservations cascade;
drop table if exists public.customers cascade;
drop table if exists public.rooms cascade;

drop function if exists public.room_availability(date, date);
drop function if exists public.create_reservation(text, text, text, text, uuid, integer, date, date, integer, integer, text);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  occupancy integer not null default 1 check (occupancy > 0),
  quantity integer not null default 1 check (quantity >= 0),
  rate numeric(10, 2) not null default 0 check (rate >= 0),
  status text not null default 'active' check (status in ('active', 'maintenance', 'disabled')),
  image jsonb,
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  contact_number text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table public.reservations (
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

create table public.reserved_rooms (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete restrict,
  reserved_quantity integer not null default 1 check (reserved_quantity > 0),
  created_at timestamptz not null default now()
);

create index reserved_rooms_room_id_idx on public.reserved_rooms(room_id);
create index reserved_rooms_reservation_id_idx on public.reserved_rooms(reservation_id);
create index rooms_status_idx on public.rooms(status);
create index reservations_dates_status_idx on public.reservations(checkin, checkout, status);
create index reservations_customer_id_idx on public.reservations(customer_id);

alter table public.rooms disable row level security;
alter table public.customers disable row level security;
alter table public.reservations disable row level security;
alter table public.reserved_rooms disable row level security;

grant usage on schema public to anon, authenticated;

grant select on public.rooms to anon, authenticated;
grant insert, update, delete on public.rooms to authenticated;

grant insert on public.customers to anon, authenticated;
grant select on public.customers to authenticated;

grant select, insert on public.reservations to anon, authenticated;
grant update, delete on public.reservations to authenticated;

grant select, insert on public.reserved_rooms to anon, authenticated;

insert into public.rooms (name, description, occupancy, quantity, rate, status, image)
values
  (
    'Garden Villa',
    'Private villa near the garden path with a queen bed, patio, and ensuite bath.',
    2,
    6,
    3200.00,
    'active',
    '{"url":"https://images.unsplash.com/photo-1566073771259-6a8506099945"}'
  ),
  (
    'Poolside Deluxe',
    'Deluxe room steps from the pool with a king bed and daybed.',
    3,
    4,
    4500.00,
    'active',
    '{"url":"https://images.unsplash.com/photo-1590490360182-c33d57733427"}'
  ),
  (
    'Family Suite',
    'Spacious suite with two bedrooms, lounge space, and breakfast for four.',
    5,
    3,
    6800.00,
    'active',
    '{"url":"https://images.unsplash.com/photo-1582719478250-c89cae4dc85b"}'
  );
