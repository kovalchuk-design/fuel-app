-- Звіт подається щомісяця: 12 на рік. Місяць звіту — окремі колонки замість вільної примітки.
alter table public.periods
  add column report_year smallint not null,
  add column report_month smallint not null check (report_month between 1 and 12),
  add constraint periods_report_unique unique (report_year, report_month);
