-- Початкові показники по машині на початок періоду (спідометр).
create table public.period_vehicles (
  period_id uuid not null references public.periods(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  odometer_open int check (odometer_open >= 0),
  primary key (period_id, vehicle_id)
);

alter table public.period_vehicles enable row level security;
revoke all on public.period_vehicles from anon, public;
grant select, insert, update, delete on public.period_vehicles to authenticated;
create policy "authenticated full access" on public.period_vehicles for all to authenticated using (true) with check (true);
