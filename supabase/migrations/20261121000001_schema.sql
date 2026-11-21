-- Схема обліку ПММ. Основна одиниця — літри; кг лише для відображення.

create table public.fuel_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind text not null default 'fuel' check (kind in ('fuel', 'lubricant')),
  sort int not null default 0
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  seq int not null unique,
  name text not null,
  vehicle_type text,
  military_number text,
  unit text not null default 'ВМЗ',
  is_generator boolean not null default false,
  active boolean not null default true
);

create table public.vehicle_fuels (
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  fuel_type_id uuid not null references public.fuel_types(id) on delete restrict,
  primary key (vehicle_id, fuel_type_id)
);

create table public.periods (
  id uuid primary key default gen_random_uuid(),
  date_from date not null,
  date_to date not null,
  label text,
  status text not null default 'draft' check (status in ('draft', 'closed')),
  created_at timestamptz not null default now(),
  check (date_to > date_from),
  unique (date_from, date_to)
);

create table public.supplier_receipts (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.periods(id) on delete cascade,
  fuel_type_id uuid not null references public.fuel_types(id) on delete restrict,
  liters numeric(12,2) not null check (liters >= 0),
  kg numeric(12,2) check (kg >= 0),
  doc_ref text
);

create table public.waybills (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.periods(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  fuel_type_id uuid not null references public.fuel_types(id) on delete restrict,
  number text,
  liters_used numeric(12,2) not null default 0 check (liters_used >= 0),
  liters_received numeric(12,2) not null default 0 check (liters_received >= 0),
  odometer_start int,
  odometer_end int,
  check (odometer_end is null or odometer_start is null or odometer_end >= odometer_start),
  foreign key (vehicle_id, fuel_type_id) references public.vehicle_fuels(vehicle_id, fuel_type_id)
);

create table public.period_balances (
  period_id uuid not null references public.periods(id) on delete cascade,
  vehicle_id uuid not null,
  fuel_type_id uuid not null,
  opening numeric(12,2) not null default 0,
  measured_closing numeric(12,2),
  primary key (period_id, vehicle_id, fuel_type_id),
  foreign key (vehicle_id, fuel_type_id) references public.vehicle_fuels(vehicle_id, fuel_type_id)
);

create table public.document_settings (
  id int primary key default 1 check (id = 1),
  unit_code text not null default 'А1446',
  supplier_unit_code text not null default 'А4240',
  explanation text,
  signatories jsonb not null default '[]'::jsonb
);

create index on public.waybills (period_id, vehicle_id);
create index on public.supplier_receipts (period_id);

-- RLS + явні GRANT: лише автентифіковані користувачі.
do $$
declare t text;
begin
  foreach t in array array['fuel_types','vehicles','vehicle_fuels','periods','supplier_receipts','waybills','period_balances','document_settings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, public', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "authenticated full access" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
