-- ─────────────────────────────────────────────────────────────────────────────
-- Schema do CRM da Gibelo Engenharia (Supabase / Postgres)
--
-- Rodar este arquivo no SQL Editor do Supabase ANTES de ativar o app contra o
-- banco. Os ids são `text` (não uuid) porque o app gera ids com prefixo
-- (`deal-...`, `cli-...`, `og-...`, `etapa-...`, `lista-...`, `card-...`,
-- `hist-...`, `tarefa-...`, `auto-...`, `srv-...`, `tsv-...`, `meta-...`,
-- `ctt-...`) via lib/id.ts — manter `text` evita reescrever a geração de id.
--
-- RLS: todas as tabelas têm Row-Level Security habilitada. O modelo é simples:
-- qualquer usuário autenticado (`authenticated`) tem acesso total. O role
-- `anon` (não autenticado) é bloqueado em tudo. Quatro policies por tabela
-- (SELECT/INSERT/UPDATE/DELETE) — omitidas abaixo por brevidade; ver as
-- migrations no painel Supabase para o texto exato das policies.
-- ─────────────────────────────────────────────────────────────────────────────

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
  probabilidade numeric(3,2) not null check (probabilidade between 0 and 1),
  -- O UNIQUE foi removido pra permitir reorder paralelo (Promise.all).
  ordem integer not null,
  -- Etapa de fechamento (negócio ganho). Não vira coluna no board ativo.
  final boolean default false
);

-- Deals (oportunidades)
create table deals (
  id text primary key,
  projeto text not null,
  cliente_id text not null references clientes(id) on delete restrict,
  contato_id text references contatos(id) on delete set null,
  valor numeric(12,2) not null,
  origem_id text not null references origens(id) on delete restrict,
  previsao_fechamento date,
  etapa_id text not null references etapas(id) on delete restrict,
  status text not null check (status in ('aberto', 'ganho', 'perdido')),
  motivo_perda text,
  notas text,
  responsavel_email text,
  area_projeto numeric(10,2),
  tipo_obra text,
  cidade_obra text,
  condominio text,
  exemplo boolean default false,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- Itens de serviço de um deal (1 deal → N serviços; valor do deal = soma)
create table deal_servicos (
  id text primary key,
  deal_id text not null references deals(id) on delete cascade,
  descricao text not null,
  valor numeric(12,2) not null,
  ordem integer not null default 0,
  criado_em timestamptz default now()
);

-- Catálogo de tipos de serviço (sugestões configuráveis no DealServicos)
create table tipos_servico (
  id text primary key,
  nome text not null,
  ordem integer not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz default now()
);

-- Timeline / histórico por deal (mudanças de etapa, notas, contatos, follow-ups)
create table deal_historico (
  id text primary key,
  deal_id text not null references deals(id) on delete cascade,
  tipo text not null check (tipo in ('nota','mudanca_etapa','contato','follow_up')),
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
  gatilho text not null check (gatilho in ('deal_entra_etapa','deal_criado')),
  acao text not null check (acao in ('criar_tarefa','registrar_nota')),
  configuracao jsonb not null,
  ativa boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz default now()
);

-- Perfis (nome de exibição configurável por usuário Supabase Auth)
create table perfis (
  id text primary key,
  nome_exibicao text not null,
  email text,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- Metas mensais de vendas (valor fechado em R$)
create table metas (
  id text primary key,
  mes text not null unique, -- formato YYYY-MM
  valor_meta numeric(12,2) not null,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- Configuração de alertas diários por email (Edge Function consome essa tabela)
create table alertas_config (
  id text primary key,
  emails_destino text[] not null default '{}',
  hora_envio integer not null default 10, -- hora UTC
  ativo boolean not null default true,
  ultimo_envio timestamptz,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- ── Quadro de atividades (Trello-like) ───────────────────────────────────────

create table atividades_listas (
  id text primary key,
  nome text not null,
  cor text not null,
  ordem integer not null unique
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
  atualizado_em timestamptz default now()
);

-- ── Índices ──────────────────────────────────────────────────────────────────

create index idx_deals_cliente on deals(cliente_id);
create index idx_deals_contato on deals(contato_id);
create index idx_deals_origem on deals(origem_id);
create index idx_deals_etapa on deals(etapa_id);
create index idx_deals_status on deals(status);
create index idx_contatos_cliente on contatos(cliente_id);
create index idx_deal_servicos_deal on deal_servicos(deal_id);
create index idx_deal_historico_deal on deal_historico(deal_id);
create index idx_tarefas_deal on tarefas(deal_id);
create index idx_atividades_cards_lista on atividades_cards(lista_id);
