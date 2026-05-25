alter table public.rooms
  add column if not exists status text not null default 'active'
  check (status in ('active', 'maintenance', 'disabled'));

create index if not exists rooms_status_idx on public.rooms(status);

update public.rooms
set status = 'active'
where status is null;
