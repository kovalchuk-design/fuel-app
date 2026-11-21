-- Категорія пального і клас машини: бензинова машина може заправлятись будь-яким бензином, дизельна будь-яким дизелем.
alter table public.fuel_types add column category text check (category in ('petrol', 'diesel', 'lubricant'));
update public.fuel_types set category = case
  when kind = 'lubricant' then 'lubricant'
  when name like 'А-%' then 'petrol'
  else 'diesel' end;
alter table public.fuel_types alter column category set not null;

alter table public.vehicles add column fuel_class text check (fuel_class in ('petrol', 'diesel'));
update public.vehicles set fuel_class = case when seq between 1 and 5 then 'petrol' else 'diesel' end;
alter table public.vehicles alter column fuel_class set not null;

-- Усі види пального свого класу для кожної машини; наявні пари (з порядком за вихідною таблицею) лишаються.
insert into public.vehicle_fuels (vehicle_id, fuel_type_id, position)
select v.id, f.id, 100 + f.sort
from public.vehicles v
join public.fuel_types f on f.category = v.fuel_class
on conflict (vehicle_id, fuel_type_id) do nothing;
