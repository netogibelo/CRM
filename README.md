# Pipeline de Vendas — Gibelo Engenharia

CRM de funil de vendas (estilo Pipedrive) + quadro de atividades (estilo Trello)
para oportunidades de projetos residenciais de alto padrão. Roda **apenas
localmente** nesta fase, com persistência em `localStorage`.

## Como rodar

```bash
npm install
npm run dev        # http://localhost:3000
```

Outros scripts:

```bash
npm run build      # build de produção (medir Lighthouse aqui, não no dev)
npm run typecheck  # tsc --noEmit (deve sair limpo)
```

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- Drag-and-drop nativo (HTML5); no mobile também há alternativas por menu/dropdown
- Sem backend: persistência em `localStorage`

## Abas

- **Funil** — board Kanban das oportunidades abertas, com dashboard de métricas
  (total na mesa, valor ponderado, conversão entre etapas, ticket médio, alerta
  de paradas). CRUD de oportunidade, mudança de etapa por arrastar ou dropdown,
  e desfechos ganho/perdido.
- **Atividades** — quadro único estilo Trello para tarefas da semana. Listas
  cadastráveis (criar, renomear, reordenar, excluir) e cards arrastáveis entre
  listas (com título, descrição, etiqueta de cor e data). Persistência separada.
- **Clientes** — CRUD de clientes (nome, telefone, e-mail, observações). O campo
  Cliente da oportunidade é um select alimentado por esta aba, com cadastro
  rápido por popup sem fechar o modal da oportunidade.
- **Configurações** — gerenciamento de **Origens** (CRUD) e **Etapas do funil**
  (CRUD com nome, **probabilidade editável** e ordem reordenável).
- **Histórico** — negócios ganhos e perdidos, mais a análise de origem (de onde
  vêm os negócios que realmente fecham, por valor).

## Dados cadastráveis

Origens, etapas e clientes deixaram de ser constantes e passaram a ser coleções
persistidas, semeadas no primeiro uso com os valores padrão:

- **Etapas** (probabilidade): Lead 10% · Contato qualificado 25% · Proposta
  enviada 50% · Negociação 75% · Fechado (ganho) 100%.
- A **probabilidade de cada etapa é editável** na aba Configurações e alimenta o
  **valor ponderado** = Σ (valor do deal × probabilidade da etapa atual). O
  recálculo é imediato ao editar uma probabilidade.

**Integridade referencial**: origem, etapa e cliente em uso por alguma
oportunidade não podem ser excluídos — a exclusão é bloqueada com aviso claro
até que os deals sejam reatribuídos/movidos.

## Arquitetura de dados (ponto-chave)

Toda persistência fica atrás do padrão de repositório (`lib/repository.ts`),
com uma interface por coleção: `DealRepository`, `ClientRepository`,
`OriginRepository`, `StageRepository` e `ActivityRepository`. A UI **nunca**
toca no storage diretamente — consome hooks dedicados:

- `useDeals`, `useClients`, `useOrigins`, `useStages` (provider `CrmProvider`,
  chave `gibelo-crm-state`)
- `useBoard` (provider `ActivitiesProvider`, chave `gibelo-atividades-state`)

**Para migrar para Supabase no futuro**: crie implementações
`Supabase*Repository implements *Repository` e troque o **bloco de
instanciação no final de `lib/repository.ts`**. Nenhum componente muda.

## Migração leve

Estados antigos (deals com `cliente`/`origem` em texto livre) são migrados no
primeiro carregamento: clientes são criados a partir do texto e as origens são
mapeadas por nome, mantendo o vínculo via `clienteId`/`origemId`.

## Estrutura

```
app/         layout, página (tabs), favicon
components/  Funil/Histórico (Board, Column, DealCard, DealForm, Dashboard,
             OriginAnalysis, HistorySection), Clientes (ClientesView, ClienteForm),
             Configurações (ConfiguracoesView), Atividades (AtividadesView,
             AtividadeColuna, AtividadeCard, AtividadeCardForm), Modal, Providers
lib/         types, repository, crm-store, activities-store, stages, metrics,
             format, seed (defaults + migração), ui, atividade-cores
```

## Seed

No primeiro acesso o funil é populado com 3 oportunidades e 3 clientes de
exemplo (etiqueta `exemplo`), e o quadro de atividades com as listas
"A fazer / Em andamento / Concluído". Para reiniciar, limpe as chaves
`gibelo-crm-state` e `gibelo-atividades-state` no localStorage.

---

Gibelo Engenharia • CREA-SP 5070966442
