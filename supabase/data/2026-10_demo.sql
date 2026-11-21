-- Демо: звіт за жовтень 2026 (період 25.09–25.10.2026) за наданими таблицями.
-- Залишки й спідометр — «Розшифровка напрацювання»; надходження (з кг) — «Донесення»; № листа — «№ останнього шляхового листа» з Відомості заміру.
-- Шляхові листи відновлено з місячних підсумків: по одному зведеному листу на пару «машина × пальне».
insert into public.periods (date_from, date_to, label, report_year, report_month)
values ('2026-09-25', '2026-10-25', 'жовтень', 2026, 10)
on conflict (report_year, report_month) do nothing;

insert into public.period_balances (period_id, vehicle_id, fuel_type_id, opening)
select p.id, v.id, f.id, x.opening
from (values
  (1, 'А-92 Євро 5 Е0', 5),
  (1, 'А-95 Євро 5 Е0', 0),
  (2, 'А-95 Євро 5 Е0', 47),
  (2, 'А-92 Євро 5 Е0', 0),
  (3, 'А-80', 16),
  (3, 'А-80 ДЗ', 0),
  (4, 'А-80 ДЗ', 0),
  (5, 'А-80 ДЗ', 151),
  (6, 'ДП-Л Євро 5 В0', 49),
  (6, 'ДП-Л Євро 5 В5', 0),
  (7, 'ДП-Л Євро 5 В5', 15),
  (7, 'ДП-Л Євро 5 В0', 34),
  (8, 'ДП-Л Євро 5 В0', 8),
  (8, 'ДП-Л Євро 5 В5', 214),
  (9, 'ДП-Л Євро 5 В5', 38),
  (9, 'ДП-Артика Євро 5 В0', 33),
  (10, 'ДП-Л Євро 5 В5', 14),
  (11, 'ДП-Л Євро 5 В5', 0),
  (11, 'ДП-Л Євро 5 В0', 34),
  (12, 'ДП-Л Євро 5 В0', 50),
  (12, 'ДП-Артика Євро 5 В0', 37),
  (13, 'ДП-Л Євро 5 В5', 0),
  (13, 'ДП-Л Євро 5 В0', 14),
  (14, 'ДП-Артика Євро 5 В0', 65),
  (14, 'ДП-Л Євро 5 В0', 19),
  (15, 'ДП-Л Євро 5 В5', 0),
  (15, 'ДП-Л Євро 5 В0', 74),
  (15, 'ДП-З Євро 5 В5', 0),
  (16, 'ДП-Л Євро 5 В5', 0),
  (16, 'ДП-Л Євро 5 В0', 132),
  (17, 'ДП-Л Євро 5 В5', 0),
  (17, 'ДП-Л Євро 5 В0', 28),
  (18, 'ДП-Л Євро 5 В0', 1000),
  (18, 'ДП-З Євро 5 В5', 1743),
  (19, 'ДП-Артика Євро 5 В0', 200),
  (19, 'ДП-Л Євро 5 В0 (ДТ.Е К5 сорт Е)', 113.5),
  (20, 'ДП-Артика Євро 5 В0', 200),
  (20, 'ДП-Л Євро 5 В0 (ДТ.Е К5 сорт Е)', 149.2),
  (21, 'ДП-Артика Євро 5 В0', 200),
  (21, 'ДП-Л Євро 5 В0 (ДТ.Е К5 сорт Е)', 113),
  (22, 'ДП-Артика Євро 5 В0', 200),
  (22, 'ДП-Л Євро 5 В0 (ДТ.Е К5 сорт Е)', 141)
) as x(seq, fuel, opening)
join public.periods p on p.report_year = 2026 and p.report_month = 10
join public.vehicles v on v.seq = x.seq
join public.fuel_types f on f.name = x.fuel
on conflict (period_id, vehicle_id, fuel_type_id) do update set opening = excluded.opening;

insert into public.period_vehicles (period_id, vehicle_id, odometer_open)
select p.id, v.id, x.odo
from (values
  (1, 242969),
  (2, 557350),
  (3, 33523),
  (4, 1936),
  (5, 8549),
  (6, 548095),
  (7, 58602),
  (8, 36843),
  (9, 25527),
  (10, 338204),
  (11, 276364),
  (12, 332270),
  (13, 222273),
  (14, 276239),
  (15, 268309),
  (16, 341530),
  (17, 2293)
) as x(seq, odo)
join public.periods p on p.report_year = 2026 and p.report_month = 10
join public.vehicles v on v.seq = x.seq
on conflict (period_id, vehicle_id) do update set odometer_open = excluded.odometer_open;

delete from public.supplier_receipts where period_id = (select id from public.periods where report_year = 2026 and report_month = 10);
insert into public.supplier_receipts (period_id, fuel_type_id, liters, kg)
select p.id, f.id, x.liters, x.kg
from (values
  ('А-80 ДЗ', 290, 216),
  ('А-95 Євро 5 Е0', 160, 122),
  ('ДП-Л Євро 5 В5', 865, 727),
  ('ДП-Л Євро 5 В0', 297, 249)
) as x(fuel, liters, kg)
join public.periods p on p.report_year = 2026 and p.report_month = 10
join public.fuel_types f on f.name = x.fuel;

delete from public.waybills where period_id = (select id from public.periods where report_year = 2026 and report_month = 10);
insert into public.waybills (period_id, vehicle_id, fuel_type_id, number, liters_received, liters_used, odometer_start, odometer_end)
select p.id, v.id, f.id, x.num, x.received, x.used, x.odo_s, x.odo_e
from (values
  (2, 'А-95 Євро 5 Е0', '535', 160, 128, 557350, 559160),
  (3, 'А-80 ДЗ', '520', 90, 56, 33523, 33647),
  (5, 'А-80 ДЗ', '536', 200, 270, 8549, 9508),
  (6, 'ДП-Л Євро 5 В0', '531', 70, 70, 548095, 548579),
  (6, 'ДП-Л Євро 5 В5', '531', 10, 4, null, null),
  (7, 'ДП-Л Євро 5 В5', '526', 185, 167, 58602, 59900),
  (9, 'ДП-Л Євро 5 В5', '524', 0, 12, 25527, 25648),
  (10, 'ДП-Л Євро 5 В5', '533', 125, 106, 338204, 339121),
  (11, 'ДП-Л Євро 5 В5', '534', 160, 155, 276364, 277988),
  (12, 'ДП-Л Євро 5 В0', '522', 0, 32, 332270, 332473),
  (13, 'ДП-Л Євро 5 В5', '537', 130, 110, 222273, 223639),
  (14, 'ДП-Л Євро 5 В0', '525', 0, 8, 276239, 276266),
  (15, 'ДП-Л Євро 5 В5', '530', 180, 180, 268309, 270289),
  (15, 'ДП-Л Євро 5 В0', '530', 0, 9, null, null),
  (16, 'ДП-Л Євро 5 В5', '521', 35, 35, 341530, 343636),
  (16, 'ДП-Л Євро 5 В0', '521', 227, 276, null, null),
  (17, 'ДП-Л Євро 5 В5', '532', 40, 36, 2293, 2621),
  (18, 'ДП-Л Євро 5 В0', null, 0, 110, null, null)
) as x(seq, fuel, num, received, used, odo_s, odo_e)
join public.periods p on p.report_year = 2026 and p.report_month = 10
join public.vehicles v on v.seq = x.seq
join public.fuel_types f on f.name = x.fuel;

-- Початок жовтня 2026 у кг (вихідне Донесення, колонка «Становить на 25.09.2026», рядки «кг»).
insert into public.period_fuel_kg (period_id, fuel_type_id, kg_open)
select p.id, f.id, x.kg
from (values
  ('А-80 ДЗ', 118), ('А-80', 22), ('А-92 Євро 5 Е0', 4), ('А-95 Євро 5 Е0', 35),
  ('ДП-З Євро 5 В5', 1483), ('ДП-Л Євро 5 В5', 169), ('ДП-Л Євро 5 В0', 1279),
  ('ДП-Л Євро 5 В0 (ДТ.Е К5 сорт Е)', 434)
) as x(fuel, kg)
join public.periods p on p.report_year = 2026 and p.report_month = 10
join public.fuel_types f on f.name = x.fuel
on conflict (period_id, fuel_type_id) do update set kg_open = excluded.kg_open;
