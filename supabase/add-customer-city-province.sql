alter table public.customers
  add column if not exists city_province text;
