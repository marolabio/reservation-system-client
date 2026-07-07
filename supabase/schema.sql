create extension if not exists pgcrypto;

drop table if exists public.reserved_rooms cascade;
drop table if exists public.reservation_addons cascade;
drop table if exists public.reservation_payments cascade;
drop table if exists public.walk_in_sale_items cascade;
drop table if exists public.walk_in_sales cascade;
drop table if exists public.service_catalog cascade;
drop table if exists public.room_amenities cascade;
drop table if exists public.amenities cascade;
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

create table public.amenities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.room_amenities (
  room_id uuid not null references public.rooms(id) on delete cascade,
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  primary key (room_id, amenity_id)
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  checkin date not null,
  checkout date not null,
  adult integer not null default 1 check (adult >= 0),
  children integer not null default 0 check (children >= 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'checked_in', 'checked_out', 'no_show', 'cancelled')),
  notes text,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
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

create table public.reservation_payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  payment_type text not null check (payment_type in ('downpayment', 'partial_payment', 'full_payment', 'refund')),
  amount numeric(10, 2) not null check (amount > 0),
  method text not null default 'cash' check (method in ('cash', 'bank_transfer', 'card', 'e_wallet', 'other')),
  reference_number text,
  notes text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.reservation_addons (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  description text not null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price numeric(10, 2) not null default 0 check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create table public.walk_in_sales (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  contact_number text,
  payment_method text not null default 'cash' check (payment_method in ('cash', 'bank_transfer', 'card', 'e_wallet', 'other')),
  total_amount numeric(10, 2) not null default 0 check (total_amount >= 0),
  notes text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.walk_in_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.walk_in_sales(id) on delete cascade,
  description text not null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price numeric(10, 2) not null default 0 check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create table public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  unit_price numeric(10, 2) not null default 0 check (unit_price >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create index reserved_rooms_room_id_idx on public.reserved_rooms(room_id);
create index reserved_rooms_reservation_id_idx on public.reserved_rooms(reservation_id);
create index reservation_payments_reservation_id_idx on public.reservation_payments(reservation_id);
create index reservation_addons_reservation_id_idx on public.reservation_addons(reservation_id);
create index walk_in_sales_paid_at_idx on public.walk_in_sales(paid_at);
create index walk_in_sale_items_sale_id_idx on public.walk_in_sale_items(sale_id);
create index service_catalog_status_idx on public.service_catalog(status);
create index room_amenities_amenity_id_idx on public.room_amenities(amenity_id);
create index rooms_status_idx on public.rooms(status);
create index reservations_dates_status_idx on public.reservations(checkin, checkout, status);
create index reservations_customer_id_idx on public.reservations(customer_id);

alter table public.rooms disable row level security;
alter table public.customers disable row level security;
alter table public.amenities disable row level security;
alter table public.room_amenities disable row level security;
alter table public.reservations disable row level security;
alter table public.reserved_rooms disable row level security;
alter table public.reservation_payments disable row level security;
alter table public.reservation_addons disable row level security;
alter table public.walk_in_sales disable row level security;
alter table public.walk_in_sale_items disable row level security;
alter table public.service_catalog disable row level security;

grant usage on schema public to anon, authenticated;

grant select on public.rooms to anon, authenticated;
grant insert, update, delete on public.rooms to authenticated;

grant select on public.amenities to anon, authenticated;
grant insert, update, delete on public.amenities to authenticated;

grant select on public.room_amenities to anon, authenticated;
grant insert, update, delete on public.room_amenities to authenticated;

grant insert on public.customers to anon, authenticated;
grant select on public.customers to authenticated;

grant select, insert on public.reservations to anon, authenticated;
grant update, delete on public.reservations to authenticated;

grant select, insert on public.reserved_rooms to anon, authenticated;
grant update, delete on public.reserved_rooms to authenticated;

grant select, insert, update, delete on public.reservation_payments to authenticated;
grant select, insert, update, delete on public.reservation_addons to authenticated;
grant select, insert, update, delete on public.walk_in_sales to authenticated;
grant select, insert, update, delete on public.walk_in_sale_items to authenticated;
grant select, insert, update, delete on public.service_catalog to authenticated;

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

insert into public.amenities (name)
values
  ('WiFi'),
  ('Air conditioning'),
  ('Breakfast'),
  ('Pool access'),
  ('Private patio'),
  ('Family lounge'),
  ('Ensuite bath');

insert into public.room_amenities (room_id, amenity_id)
select rooms.id, amenities.id
from public.rooms
join public.amenities
  on (
    rooms.name = 'Garden Villa'
    and amenities.name in ('WiFi', 'Air conditioning', 'Private patio', 'Ensuite bath')
  )
  or (
    rooms.name = 'Poolside Deluxe'
    and amenities.name in ('WiFi', 'Air conditioning', 'Breakfast', 'Pool access')
  )
  or (
    rooms.name = 'Family Suite'
    and amenities.name in ('WiFi', 'Air conditioning', 'Breakfast', 'Family lounge')
  );
