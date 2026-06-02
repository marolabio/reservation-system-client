create table if not exists public.reservation_payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  payment_type text not null check (payment_type in ('downpayment', 'full_payment', 'refund')),
  amount numeric(10, 2) not null check (amount > 0),
  method text not null default 'cash' check (method in ('cash', 'bank_transfer', 'card', 'e_wallet', 'other')),
  reference_number text,
  notes text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists reservation_payments_reservation_id_idx
  on public.reservation_payments(reservation_id);

alter table public.reservation_payments disable row level security;

grant select, insert, update, delete on public.reservation_payments to authenticated;
