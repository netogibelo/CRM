-- O linter auth_rls_initplan só reconhece a função auth.* sozinha dentro do
-- select. (select auth.jwt() ->> 'email') vira ( SELECT (auth.jwt() ->> ...))
-- no deparse e continua sendo apontado; (select auth.jwt()) ->> 'email' é
-- equivalente (initplan único) e passa no lint.

ALTER POLICY "coment_insert_own" ON public.atividades_comentarios
  WITH CHECK (autor_email = ((select auth.jwt()) ->> 'email'));

ALTER POLICY "coment_update_own" ON public.atividades_comentarios
  USING (autor_email = ((select auth.jwt()) ->> 'email'))
  WITH CHECK (autor_email = ((select auth.jwt()) ->> 'email'));

ALTER POLICY "coment_delete_own" ON public.atividades_comentarios
  USING (autor_email = ((select auth.jwt()) ->> 'email'));
