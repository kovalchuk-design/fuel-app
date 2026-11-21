-- Секція Відомості заміру: машини групуються за видом пального, після кожної групи йдуть підсумки.
alter table public.vehicles add column report_group text check (report_group in ('a80', 'a92_95', 'diesel'));
update public.vehicles set report_group = case
  when seq in (3, 4, 5) then 'a80'
  when seq in (1, 2) then 'a92_95'
  else 'diesel' end;
alter table public.vehicles alter column report_group set not null;
