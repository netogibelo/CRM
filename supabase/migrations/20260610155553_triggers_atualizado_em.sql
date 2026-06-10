-- atualizado_em tinha apenas DEFAULT now(); não mudava em UPDATE.
-- Função única + trigger BEFORE UPDATE em toda tabela com a coluna.

CREATE OR REPLACE FUNCTION public.set_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_atualizado_em
  BEFORE UPDATE ON public.alertas_config
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

CREATE TRIGGER trg_set_atualizado_em
  BEFORE UPDATE ON public.atividades_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

CREATE TRIGGER trg_set_atualizado_em
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

CREATE TRIGGER trg_set_atualizado_em
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

CREATE TRIGGER trg_set_atualizado_em
  BEFORE UPDATE ON public.metas
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

CREATE TRIGGER trg_set_atualizado_em
  BEFORE UPDATE ON public.perfis
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
