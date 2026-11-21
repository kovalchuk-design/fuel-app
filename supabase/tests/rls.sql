-- Перевірка прав: anon не бачить даних, authenticated має повний доступ.
do $$
begin
  assert not has_table_privilege('anon', 'public.waybills', 'select'), 'anon must not read waybills';
  assert has_table_privilege('authenticated', 'public.waybills', 'insert'), 'authenticated must write waybills';
  assert (select bool_and(relrowsecurity) from pg_class
          where relnamespace = 'public'::regnamespace and relkind = 'r'), 'RLS must be on for every table';
end $$;
