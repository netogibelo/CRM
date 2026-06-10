-- Toggle de alertas de atividades (quadro Kanban) no email diário.
ALTER TABLE public.alertas_config
  ADD COLUMN IF NOT EXISTS incluir_atividades boolean NOT NULL DEFAULT true;
