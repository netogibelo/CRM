-- Corrige auth_rls_initplan: funções auth.* em policies devem ficar em
-- subquery escalar (select ...) para serem avaliadas uma vez por statement,
-- não por linha.

-- perfis (auth.uid())
ALTER POLICY "perfis_insert_self" ON public.perfis
  WITH CHECK ((select auth.uid()) = id);

ALTER POLICY "perfis_update_self" ON public.perfis
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

ALTER POLICY "perfis_delete_self" ON public.perfis
  USING ((select auth.uid()) = id);

-- atividades_comentarios (auth.jwt() ->> 'email')
ALTER POLICY "coment_insert_own" ON public.atividades_comentarios
  WITH CHECK (autor_email = (select auth.jwt() ->> 'email'));

ALTER POLICY "coment_update_own" ON public.atividades_comentarios
  USING (autor_email = (select auth.jwt() ->> 'email'))
  WITH CHECK (autor_email = (select auth.jwt() ->> 'email'));

ALTER POLICY "coment_delete_own" ON public.atividades_comentarios
  USING (autor_email = (select auth.jwt() ->> 'email'));
