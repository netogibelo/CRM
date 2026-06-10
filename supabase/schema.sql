-- ─────────────────────────────────────────────────────────────────────────────
-- Schema do CRM da Gibelo Construtora (Supabase / Postgres)
--
-- Gerado a partir do banco de produção em 2026-06-10. Reflete o estado real:
-- 21 tabelas, índices, constraints, triggers e policies RLS.
--
-- Os ids são `text` (não uuid) porque o app gera ids com prefixo
-- (`deal-...`, `cli-...`, `og-...`, `etapa-...`, `lista-...`, `card-...`,
-- `hist-...`, `tarefa-...`, `auto-...`, `srv-...`, `tsv-...`, `meta-...`,
-- `ctt-...`) via lib/id.ts. Exceção: `perfis.id` é uuid (espelha auth.users)
-- e `alertas_config.id` é integer fixo em 1 (tabela singleton).
--
-- RLS: todas as tabelas têm Row-Level Security habilitada. Modelo empresarial:
-- qualquer usuário autenticado (`authenticated`) tem acesso total; o role
-- `anon` é bloqueado em tudo. Exceções com policies próprias:
--   - perfis: INSERT/UPDATE/DELETE só no próprio registro (auth.uid() = id)
--   - atividades_comentarios: UPDATE/DELETE só do próprio autor (email do JWT)
-- Funções auth.* nas policies ficam em subquery escalar `(select ...)` pra
-- serem avaliadas uma vez por statement, não por linha (auth_rls_initplan).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Função de trigger: atualizado_em ─────────────────────────────────────────

create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

-- ── Domínio principal ────────────────────────────────────────────────────────

-- Clientes (empresa ou pessoa)
create table clientes (
  id text primary key,
  nome text not null,
  telefone text,
  email text,
  observacoes text,
  exemplo boolean default false,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- Contatos (pessoas físicas vinculadas a um cliente)
create table contatos (
  id text primary key,
  cliente_id text not null references clientes(id) on delete cascade,
  nome text not null,
  cargo text,
  telefone text,
  email text,
  principal boolean not null default false,
  criado_em timestamptz not null default now()
);

-- Origens (cadastráveis pelo usuário em Configurações)
create table origens (
  id text primary key,
  nome text not null unique,
  ordem integer not null default 0
);

-- Etapas do funil (cadastráveis em Configurações)
create table etapas (
  id text primary key,
  nome text not null,
  probabilidade numeric(3,2) not null check (probabilidade >= 0 and probabilidade <= 1),
  -- Sem UNIQUE pra permitir reorder paralelo (Promise.all).
  ordem integer not null,
  -- Etapa de fechamento (negócio ganho). Não vira coluna no board ativo.
  final boolean default false
);

-- Deals (oportunidades)
create table deals (
  id text primary key,
  projeto text not null,
  cliente_id text not null references clientes(id) on delete restrict,
  valor numeric(12,2) not null,
  origem_id text not null references origens(id) on delete restrict,
  previsao_fechamento date,
  etapa_id text not null references etapas(id) on delete restrict,
  status text not null check (status in ('aberto', 'ganho', 'perdido')),
  motivo_perda text,
  notas text,
  exemplo boolean default false,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  responsavel_email text,
  area_projeto numeric(10,2),
  tipo_obra text,
  cidade_obra text,
  condominio text,
  contato_id text references contatos(id) on delete set null
);

-- Itens de serviço de um deal (1 deal → N serviços; valor do deal = soma)
create table deal_servicos (
  id text primary key,
  deal_id text not null references deals(id) on delete cascade,
  descricao text not null,
  valor numeric not null default 0,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);

-- Catálogo de tipos de serviço (sugestões configuráveis no DealServicos)
create table tipos_servico (
  id text primary key,
  nome text not null,
  ordem integer not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Timeline / histórico por deal (mudanças de etapa, notas, contatos, follow-ups)
create table deal_historico (
  id text primary key,
  deal_id text not null references deals(id) on delete cascade,
  tipo text not null check (tipo in ('nota', 'mudanca_etapa', 'contato', 'follow_up')),
  descricao text not null,
  autor_email text,
  criado_em timestamptz default now()
);

-- Tarefas com prazo, vinculadas a um deal
create table tarefas (
  id text primary key,
  deal_id text not null references deals(id) on delete cascade,
  titulo text not null,
  descricao text,
  responsavel_email text,
  data_vencimento date not null,
  concluida boolean not null default false,
  concluida_em timestamptz,
  criado_em timestamptz default now()
);

-- Automações: gatilho → ação (configuráveis em Configurações)
create table automacoes (
  id text primary key,
  nome text not null,
  gatilho text not null check (gatilho in ('deal_entra_etapa', 'deal_criado')),
  acao text not null check (acao in ('criar_tarefa', 'registrar_nota')),
  configuracao jsonb not null default '{}'::jsonb,
  ativa boolean not null default true,
  criado_em timestamptz default now(),
  ordem integer not null default 0
);

-- Perfis (nome de exibição configurável por usuário Supabase Auth)
create table perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome_exibicao text not null,
  email text,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- Metas mensais de vendas (valor fechado em R$)
create table metas (
  id text primary key,
  mes text not null unique check (mes ~ '^\d{4}-\d{2}$'), -- formato YYYY-MM
  valor_meta numeric(14,2) not null check (valor_meta >= 0),
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- Configuração de alertas diários por email (Edge Function alertas-diarios).
-- Tabela singleton: sempre uma única linha com id = 1.
create table alertas_config (
  id integer primary key default 1 check (id = 1),
  ativo boolean not null default true,
  -- Inclui alertas do quadro de atividades (cards vencendo/vencidos) no email.
  incluir_atividades boolean not null default true,
  atualizado_em timestamptz default now()
);

-- ── Quadro de atividades (Trello-like) ───────────────────────────────────────

create table atividades_listas (
  id text primary key,
  nome text not null,
  cor text not null,
  -- Sem UNIQUE pra permitir reorder em batch (mesma razão de etapas.ordem).
  ordem integer not null
);

create table atividades_cards (
  id text primary key,
  lista_id text not null references atividades_listas(id) on delete cascade,
  titulo text not null,
  descricao text,
  cor text,
  data date,
  ordem numeric not null,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  valor_estimado numeric(12,2),
  fornecedor text,
  numero_nf text,
  metragem numeric(10,2),
  data_inicio date,
  data_vencimento date,
  hora_vencimento text,
  recorrencia text not null default 'nunca'
    check (recorrencia in ('nunca', 'diaria', 'semanal', 'quinzenal', 'mensal')),
  concluida_em timestamptz,
  responsavel_email text
);

-- Etiquetas (labels) dos cards
create table atividades_etiquetas (
  id text primary key,
  nome text not null,
  cor text not null,
  ordem integer not null default 0,
  criado_em timestamptz default now()
);

-- N:N card ↔ etiqueta
create table atividades_cards_etiquetas (
  card_id text not null references atividades_cards(id) on delete cascade,
  etiqueta_id text not null references atividades_etiquetas(id) on delete cascade,
  primary key (card_id, etiqueta_id)
);

-- Checklist por card
create table atividades_checklist (
  id text primary key,
  card_id text not null references atividades_cards(id) on delete cascade,
  titulo text not null,
  concluida boolean not null default false,
  ordem integer not null default 0,
  criado_em timestamptz default now()
);

-- Comentários por card (autoria via email do JWT)
create table atividades_comentarios (
  id text primary key,
  card_id text not null references atividades_cards(id) on delete cascade,
  autor_email text not null,
  texto text not null,
  criado_em timestamptz not null default now(),
  editado_em timestamptz
);

-- Timeline de eventos por card
create table atividades_historico (
  id text primary key,
  card_id text not null references atividades_cards(id) on delete cascade,
  autor_email text,
  tipo text not null check (tipo in (
    'criacao', 'movimentacao', 'conclusao', 'reabertura',
    'edicao', 'comentario', 'checklist', 'etiqueta'
  )),
  descricao text not null,
  criado_em timestamptz not null default now()
);

-- Templates de card (etiquetas, checklist e campos pré-definidos)
create table atividades_templates (
  id text primary key,
  nome text not null,
  descricao text,
  etiquetas_ids jsonb not null default '[]'::jsonb,
  checklist_items jsonb not null default '[]'::jsonb,
  campos_defaults jsonb not null default '{}'::jsonb,
  ordem integer not null default 0,
  criado_em timestamptz default now()
);

-- ── Índices ──────────────────────────────────────────────────────────────────

create index contatos_cliente_id_idx on contatos(cliente_id);
create index idx_deals_cliente on deals(cliente_id);
create index idx_deals_origem on deals(origem_id);
create index idx_deals_etapa on deals(etapa_id);
create index idx_deals_status on deals(status);
create index deals_contato_id_idx on deals(contato_id);
create index deal_servicos_deal_id_idx on deal_servicos(deal_id);
create index tipos_servico_ativo_ordem_idx on tipos_servico(ativo, ordem);
create index idx_historico_deal on deal_historico(deal_id);
create index idx_historico_criado_em on deal_historico(criado_em desc);
create index idx_tarefas_deal on tarefas(deal_id);
create index idx_tarefas_responsavel on tarefas(responsavel_email);
create index idx_tarefas_vencimento on tarefas(data_vencimento);
create index idx_metas_mes on metas(mes);
create index idx_atividades_cards_lista on atividades_cards(lista_id);
create index idx_cards_etiquetas_card on atividades_cards_etiquetas(card_id);
create index idx_cards_etiquetas_etiqueta on atividades_cards_etiquetas(etiqueta_id);
create index idx_atividades_checklist_card on atividades_checklist(card_id);
create index idx_atividades_comentarios_card on atividades_comentarios(card_id);
create index idx_atividades_historico_card on atividades_historico(card_id);

-- ── Triggers de atualizado_em ────────────────────────────────────────────────

create trigger trg_set_atualizado_em
  before update on alertas_config
  for each row execute function public.set_atualizado_em();

create trigger trg_set_atualizado_em
  before update on atividades_cards
  for each row execute function public.set_atualizado_em();

create trigger trg_set_atualizado_em
  before update on clientes
  for each row execute function public.set_atualizado_em();

create trigger trg_set_atualizado_em
  before update on deals
  for each row execute function public.set_atualizado_em();

create trigger trg_set_atualizado_em
  before update on metas
  for each row execute function public.set_atualizado_em();

create trigger trg_set_atualizado_em
  before update on perfis
  for each row execute function public.set_atualizado_em();

-- ── Row-Level Security ───────────────────────────────────────────────────────

alter table clientes enable row level security;
alter table contatos enable row level security;
alter table origens enable row level security;
alter table etapas enable row level security;
alter table deals enable row level security;
alter table deal_servicos enable row level security;
alter table tipos_servico enable row level security;
alter table deal_historico enable row level security;
alter table tarefas enable row level security;
alter table automacoes enable row level security;
alter table perfis enable row level security;
alter table metas enable row level security;
alter table alertas_config enable row level security;
alter table atividades_listas enable row level security;
alter table atividades_cards enable row level security;
alter table atividades_etiquetas enable row level security;
alter table atividades_cards_etiquetas enable row level security;
alter table atividades_checklist enable row level security;
alter table atividades_comentarios enable row level security;
alter table atividades_historico enable row level security;
alter table atividades_templates enable row level security;

-- clientes
create policy "clientes_select_authenticated" on clientes for select to authenticated using (true);
create policy "clientes_insert_authenticated" on clientes for insert to authenticated with check (true);
create policy "clientes_update_authenticated" on clientes for update to authenticated using (true) with check (true);
create policy "clientes_delete_authenticated" on clientes for delete to authenticated using (true);

-- contatos
create policy "contatos select authenticated" on contatos for select to authenticated using (true);
create policy "contatos insert authenticated" on contatos for insert to authenticated with check (true);
create policy "contatos update authenticated" on contatos for update to authenticated using (true) with check (true);
create policy "contatos delete authenticated" on contatos for delete to authenticated using (true);

-- origens
create policy "origens_select_authenticated" on origens for select to authenticated using (true);
create policy "origens_insert_authenticated" on origens for insert to authenticated with check (true);
create policy "origens_update_authenticated" on origens for update to authenticated using (true) with check (true);
create policy "origens_delete_authenticated" on origens for delete to authenticated using (true);

-- etapas
create policy "etapas_select_authenticated" on etapas for select to authenticated using (true);
create policy "etapas_insert_authenticated" on etapas for insert to authenticated with check (true);
create policy "etapas_update_authenticated" on etapas for update to authenticated using (true) with check (true);
create policy "etapas_delete_authenticated" on etapas for delete to authenticated using (true);

-- deals
create policy "deals_select_authenticated" on deals for select to authenticated using (true);
create policy "deals_insert_authenticated" on deals for insert to authenticated with check (true);
create policy "deals_update_authenticated" on deals for update to authenticated using (true) with check (true);
create policy "deals_delete_authenticated" on deals for delete to authenticated using (true);

-- deal_servicos
create policy "auth select" on deal_servicos for select to authenticated using (true);
create policy "auth insert" on deal_servicos for insert to authenticated with check (true);
create policy "auth update" on deal_servicos for update to authenticated using (true) with check (true);
create policy "auth delete" on deal_servicos for delete to authenticated using (true);

-- tipos_servico
create policy "auth select" on tipos_servico for select to authenticated using (true);
create policy "auth insert" on tipos_servico for insert to authenticated with check (true);
create policy "auth update" on tipos_servico for update to authenticated using (true) with check (true);
create policy "auth delete" on tipos_servico for delete to authenticated using (true);

-- deal_historico
create policy "deal_historico_select_authenticated" on deal_historico for select to authenticated using (true);
create policy "deal_historico_insert_authenticated" on deal_historico for insert to authenticated with check (true);
create policy "deal_historico_update_authenticated" on deal_historico for update to authenticated using (true) with check (true);
create policy "deal_historico_delete_authenticated" on deal_historico for delete to authenticated using (true);

-- tarefas
create policy "tarefas_select_authenticated" on tarefas for select to authenticated using (true);
create policy "tarefas_insert_authenticated" on tarefas for insert to authenticated with check (true);
create policy "tarefas_update_authenticated" on tarefas for update to authenticated using (true) with check (true);
create policy "tarefas_delete_authenticated" on tarefas for delete to authenticated using (true);

-- automacoes
create policy "automacoes_select_authenticated" on automacoes for select to authenticated using (true);
create policy "automacoes_insert_authenticated" on automacoes for insert to authenticated with check (true);
create policy "automacoes_update_authenticated" on automacoes for update to authenticated using (true) with check (true);
create policy "automacoes_delete_authenticated" on automacoes for delete to authenticated using (true);

-- perfis (leitura geral; escrita só no próprio registro)
create policy "perfis_select_authenticated" on perfis for select to authenticated using (true);
create policy "perfis_insert_self" on perfis for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "perfis_update_self" on perfis for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "perfis_delete_self" on perfis for delete to authenticated
  using ((select auth.uid()) = id);

-- metas
create policy "Authenticated select metas" on metas for select to authenticated using (true);
create policy "Authenticated insert metas" on metas for insert to authenticated with check (true);
create policy "Authenticated update metas" on metas for update to authenticated using (true) with check (true);
create policy "Authenticated delete metas" on metas for delete to authenticated using (true);

-- alertas_config (singleton: sem insert/delete via app)
create policy "Authenticated read alertas_config" on alertas_config for select to authenticated using (true);
create policy "Authenticated update alertas_config" on alertas_config for update to authenticated using (true) with check (true);

-- atividades_listas
create policy "atividades_listas_select_authenticated" on atividades_listas for select to authenticated using (true);
create policy "atividades_listas_insert_authenticated" on atividades_listas for insert to authenticated with check (true);
create policy "atividades_listas_update_authenticated" on atividades_listas for update to authenticated using (true) with check (true);
create policy "atividades_listas_delete_authenticated" on atividades_listas for delete to authenticated using (true);

-- atividades_cards
create policy "atividades_cards_select_authenticated" on atividades_cards for select to authenticated using (true);
create policy "atividades_cards_insert_authenticated" on atividades_cards for insert to authenticated with check (true);
create policy "atividades_cards_update_authenticated" on atividades_cards for update to authenticated using (true) with check (true);
create policy "atividades_cards_delete_authenticated" on atividades_cards for delete to authenticated using (true);

-- atividades_etiquetas
create policy "etiq_select_auth" on atividades_etiquetas for select to authenticated using (true);
create policy "etiq_insert_auth" on atividades_etiquetas for insert to authenticated with check (true);
create policy "etiq_update_auth" on atividades_etiquetas for update to authenticated using (true) with check (true);
create policy "etiq_delete_auth" on atividades_etiquetas for delete to authenticated using (true);

-- atividades_cards_etiquetas
create policy "cards_etiq_select_auth" on atividades_cards_etiquetas for select to authenticated using (true);
create policy "cards_etiq_insert_auth" on atividades_cards_etiquetas for insert to authenticated with check (true);
create policy "cards_etiq_update_auth" on atividades_cards_etiquetas for update to authenticated using (true) with check (true);
create policy "cards_etiq_delete_auth" on atividades_cards_etiquetas for delete to authenticated using (true);

-- atividades_checklist
create policy "checklist_select_auth" on atividades_checklist for select to authenticated using (true);
create policy "checklist_insert_auth" on atividades_checklist for insert to authenticated with check (true);
create policy "checklist_update_auth" on atividades_checklist for update to authenticated using (true) with check (true);
create policy "checklist_delete_auth" on atividades_checklist for delete to authenticated using (true);

-- atividades_comentarios (leitura geral; escrita só do próprio autor).
-- (select auth.jwt()) sozinho no subquery: equivalente e reconhecido pelo
-- lint auth_rls_initplan.
create policy "coment_select_auth" on atividades_comentarios for select to authenticated using (true);
create policy "coment_insert_own" on atividades_comentarios for insert to authenticated
  with check (autor_email = ((select auth.jwt()) ->> 'email'));
create policy "coment_update_own" on atividades_comentarios for update to authenticated
  using (autor_email = ((select auth.jwt()) ->> 'email'))
  with check (autor_email = ((select auth.jwt()) ->> 'email'));
create policy "coment_delete_own" on atividades_comentarios for delete to authenticated
  using (autor_email = ((select auth.jwt()) ->> 'email'));

-- atividades_historico (append-only: sem update/delete via app)
create policy "ahist_select_auth" on atividades_historico for select to authenticated using (true);
create policy "ahist_insert_auth" on atividades_historico for insert to authenticated with check (true);

-- atividades_templates
create policy "atpl_select_auth" on atividades_templates for select to authenticated using (true);
create policy "atpl_insert_auth" on atividades_templates for insert to authenticated with check (true);
create policy "atpl_update_auth" on atividades_templates for update to authenticated using (true) with check (true);
create policy "atpl_delete_auth" on atividades_templates for delete to authenticated using (true);
