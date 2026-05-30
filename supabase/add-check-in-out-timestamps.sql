alter table public.reservations
  add column if not exists checked_in_at timestamptz,
  add column if not exists checked_out_at timestamptz;
