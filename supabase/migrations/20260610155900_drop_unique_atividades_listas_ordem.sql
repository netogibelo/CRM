-- UNIQUE em ordem impede o reorder em batch (upserts paralelos colidem
-- durante a transição). Mesma razão da remoção em etapas.ordem
-- (prepare_config_reorder).
ALTER TABLE public.atividades_listas
  DROP CONSTRAINT IF EXISTS atividades_listas_ordem_key;
