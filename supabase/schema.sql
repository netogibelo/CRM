-- ─────────────────────────────────────────────────────────────────────────────
-- Schema do CRM da Gibelo Engenharia (Supabase / Postgres)
--
-- Rodar este arquivo no SQL Editor do Supabase ANTES de ativar o app contra o
-- banco. Os ids são `text` (não uuid) porque o app gera ids com prefixo
-- (`deal-...`, `cli-...`, `og-...`, `etapa-...`, `lista-...`, `card-...`) via
-- lib/id.ts — manter `text` evita reescrever a geração de id na migração.
--
-- O schema espelha exatamente lib/types.ts. Dois pontos onde o rascunho inicial
-- da migração divergia do modelo real e foram CORRIGIDOS aqui (sem essas colunas
-- o round-trip perderia dados):
--   1. etapas.final     — marca a etapa de fechamento ("Fechado (ganho)", 100%).
--                         Exatamente uma etapa tem final = true; o board ativo a
--                         esconde e o cálculo de conversão depende dela.
--   2. atividades_cards.criado_em / atualizado_em — AtividadeCard carrega esses
--                         timestamps (não-opcionais) em lib/types.ts.
-- ─────────────────────────────────────────────────────────────────────────────

-- Clientes
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

-- Origens
create table origens (
  id text primary key,
  nome text not null unique
);

-- Etapas do funil
create table etapas (
  id text primary key,
  nome text not null,
  probabilidade numeric(3,2) not null check (probabilidade between 0 and 1),
  ordem integer not null unique,
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
  atualizado_em timestamptz default now()
);

-- Listas de atividades
create table atividades_listas (
  id text primary key,
  nome text not null,
  cor text not null,
  ordem integer not null unique
);

-- Cards de atividades
create table atividades_cards (
  id text primary key,
  lista_id text not null references atividades_listas(id) on delete cascade,
  titulo text not null,
  descricao text,
  cor text,
  data date,
  ordem numeric(10,6) not null,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- Índices
create index idx_deals_cliente on deals(cliente_id);
create index idx_deals_origem on deals(origem_id);
create index idx_deals_etapa on deals(etapa_id);
create index idx_deals_status on deals(status);
create index idx_atividades_cards_lista on atividades_cards(lista_id);
