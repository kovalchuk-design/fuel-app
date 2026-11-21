-- Залишок пального в кілограмах на початок періоду: окремий облік для Донесення (не густина × літри).
create table public.period_fuel_kg (
  period_id uuid not null references public.periods(id) on delete cascade,
  fuel_type_id uuid not null references public.fuel_types(id) on delete restrict,
  kg_open numeric(12,2) check (kg_open >= 0),
  primary key (period_id, fuel_type_id)
);

alter table public.period_fuel_kg enable row level security;
revoke all on public.period_fuel_kg from anon, public;
grant select, insert, update, delete on public.period_fuel_kg to authenticated;
create policy "authenticated full access" on public.period_fuel_kg for all to authenticated using (true) with check (true);
