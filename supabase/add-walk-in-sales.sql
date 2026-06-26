create table if not exists public.walk_in_sales (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  contact_number text,
  payment_method text not null default 'cash' check (payment_method in ('cash', 'bank_transfer', 'card', 'e_wallet', 'other')),
  total_amount numeric(10, 2) not null default 0 check (total_amount >= 0),
  notes text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.walk_in_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.walk_in_sales(id) on delete cascade,
  description text not null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price numeric(10, 2) not null default 0 check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create index if not exists walk_in_sales_paid_at_idx
  on public.walk_in_sales(paid_at);

create index if not exists walk_in_sale_items_sale_id_idx
  on public.walk_in_sale_items(sale_id);

alter table public.walk_in_sales disable row level security;
alter table public.walk_in_sale_items disable row level security;

grant select, insert, update, delete on public.walk_in_sales to authenticated;
grant select, insert, update, delete on public.walk_in_sale_items to authenticated;
