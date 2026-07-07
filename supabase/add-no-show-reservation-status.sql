alter table public.reservations
  drop constraint if exists reservations_status_check,
  add constraint reservations_status_check
    check (status in ('pending', 'confirmed', 'checked_in', 'checked_out', 'no_show', 'cancelled'));
