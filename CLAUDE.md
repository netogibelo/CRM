# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

CRM de funil de vendas (estilo Pipedrive) + quadro de atividades (estilo Trello) para a Gibelo Engenharia. Interface inteiramente em **pt-BR**.

**Em produção**: https://crm-gibelo.vercel.app
**Stack**: Next.js 16 (App Router, Turbopack) · React 19 · Tailwind · Supabase (Postgres + Auth) · Vercel (deploy)
**Persistência**: Supabase. A camada `lib/repository.ts` continua sendo o único ponto de acesso a dados.
**Auth**: Supabase Auth com **email + senha**. Usuários são criados manualmente no dashboard Supabase (Authentication → Users → Add user com "Auto Confirm" marcado); não há cadastro público.
**Deploy**: automático no Vercel. Push em `master` dispara um build de Production. Para deploy manual: `vercel --prod`.

## Commands

```bash
npm run dev        # dev server (http://localhost:3000)
npm run build      # production build — must be warning-free
npm run start      # serve the production build (use this for Lighthouse, NOT dev)
npm run typecheck  # tsc --noEmit — the verification gate; must be clean
```

There is **no test framework** and **no ESLint configured** (`npm run lint` would trigger Next's interactive ESLint setup — don't run it). Verify changes with `npm run typecheck` then `npm run build`.

Quality bar from the project brief, expected to hold: typecheck clean, zero new build warnings, Lighthouse (measured on `npm run start`) Perf ≥ 97 / A11y 100 / Best Practices 100 / SEO 100, `aria-label` on every interactive element, visible focus, `prefers-reduced-motion` respected, responsive from 375px.

## Architecture

### Auth & route protection

- `proxy.ts` (Next 16 renomeou `middleware.ts` → `proxy.ts`, e a função exportada agora se chama `proxy`) intercepta todas as rotas. Não autenticado em rota não-pública → redirect pra `/login`. Autenticado em `/login` → redirect pra `/`.
- O proxy usa `supabase.auth.getUser()` (valida com o servidor), nunca `getSession()` (que só lê cookie sem validar).
- **Únicas rotas públicas**: `/login`.
- `lib/supabase.ts` — browser client (`createBrowserClient`). Usado por todo código `"use client"`.
- `lib/supabase-server.ts` — server client (`createServerClient` + `await cookies()`). Usar em Server Components e Route Handlers. **Nunca importe esse arquivo em código client** — quebra o build (depende de `next/headers`).
- `components/LogoutButton.tsx` — header mostra email do usuário + botão Sair, escuta `onAuthStateChange`.

### Layout structure (route groups)

```
app/
├── layout.tsx              ← root: html/body/Footer apenas (sem providers, aparece em /login também)
├── login/
│   ├── layout.tsx          ← passthrough (deliberadamente sem Providers)
│   └── page.tsx            ← email+senha, signInWithPassword
└── (app)/                  ← route group, não afeta URL
    ├── layout.tsx          ← injeta Providers (CrmProvider + ActivitiesProvider)
    └── page.tsx            ← tab switcher (Funil / Atividades / Clientes / Configurações / Histórico)
```

A `/login` fica **fora** do route group `(app)/`, então **não monta os providers** — providers que tentariam buscar dados no Supabase sem sessão e poluiriam o console. Quando adicionar rotas autenticadas novas, colocar dentro de `app/(app)/`.

### Persistência — `lib/repository.ts` é o único ponto de acesso a dados

A camada de repositório expõe interfaces (`DealRepository`, `ClientRepository`, `OriginRepository`, `StageRepository`, `ActivityRepository`) e implementa **duas variantes** no mesmo arquivo:
- `Supabase*Repository` — **ativa em produção**, usa o client `supabase` de `lib/supabase.ts`.
- `LocalStorage*Repository` — preservada como fallback histórico (não usar; mantida só pra referência).

O **bloco de export no final** instancia as variantes Supabase. Componentes **nunca** importam essas classes diretamente — sempre consomem via hooks dos providers (`useDeals`, `useClients`, etc.). Nunca chame `supabase.from(...)` fora de `lib/repository.ts`.

**Schema** em `supabase/schema.sql`. 6 tabelas: `clientes`, `origens`, `etapas`, `deals`, `atividades_listas`, `atividades_cards`. Ids são `text` (não uuid) com prefixos (`deal-...`, `cli-...`, etc.) gerados por `lib/id.ts`.

### Row-Level Security (RLS)

RLS está **habilitada** nas 6 tabelas. Modelo empresarial: qualquer usuário autenticado tem acesso total (sem segregação por usuário). 4 policies por tabela: SELECT/INSERT/UPDATE/DELETE para o role `authenticated`, todas `USING (true)` / `WITH CHECK (true)`. O `anon` (não autenticado) é bloqueado.

**Consequência operacional**: scripts que usam o `anon key` sem sessão JWT (ex: `scripts/migrate-to-supabase.ts`) **não conseguem mais** ler/escrever. Se precisar rodar migração novamente, adapte pra usar `SUPABASE_SERVICE_ROLE_KEY` (que bypassa RLS) — essa key deve ficar em `.env.local`, nunca commitada.

### State layer: dois providers, hooks dedicados

`components/Providers.tsx` (montado em `app/(app)/layout.tsx`) compõe `CrmProvider` (`lib/crm-store.tsx`) + `ActivitiesProvider` (`lib/activities-store.tsx`). Cada provider mantém a **fonte única em memória** do seu domínio e expõe hooks:

- `useDeals`, `useClients`, `useOrigins`, `useStages`, `useResolvers` (id→nome lookups) — de `crm-store`
- `useBoard` — de `activities-store`

Padrão de mutação: chama o repositório (que persiste no Supabase), espelha o resultado no state. Callbacks são `useCallback([])` lendo estado atual via `useRef` mirror (`ref.current`) — identidade estável sem dados velhos. Preservar esse padrão ao adicionar mutações.

**Integridade referencial** vive no provider, não no repositório: `removerCliente`/`removerOrigem`/`removerEtapa` retornam `{ ok, erro }` e recusam exclusão quando a entidade está em uso. UI mostra `erro` via `window.alert`. Helpers `*EmUso(id)` expõem contagem de uso.

### Funnel stage model

Etapas são dados editáveis (`Etapa { nome, probabilidade, ordem, final? }`). Exatamente uma etapa tem `final: true` ("Fechado (ganho)", 100%). Helpers em `lib/stages.ts`:
- O board renderiza só `etapasAtivas` (não-finais), ordenadas por `ordem`.
- Marcar deal "ganho" seta `etapaId` pra etapa final + `status: "ganho"` — sai do board, vai pra aba Histórico.
- Todas as etapas (inclusive final) alimentam funil de conversão e math de valor ponderado em `lib/metrics.ts`. `probabilidade` é editável em Configurações: **valor ponderado = Σ(valor × probabilidade da etapa atual)**.

Ciclo de vida do deal é por `status` (`"aberto" | "ganho" | "perdido"`), não pela coluna onde está. Ganhos/perdidos saem do board, aparecem em Histórico, podem ser reabertos.

### Boards & drag-and-drop

Funil usa **HTML5 drag-and-drop nativo** via helpers em `lib/dnd.ts` (`useDropTarget`, `dragProps`, `activationProps`), com fallback mobile (dropdown de etapa no form do deal). Atividades (Kanban) usa **`@dnd-kit/core` + `@dnd-kit/sortable`** — suporta touch nativo, listas arrastáveis, cards arrastáveis entre listas. Reordenação controlada por campo `ordem` em listas e cards.

### Convenções

- Formatação/parsing (BRL, dd/mm/aaaa, "parado > 14 dias") em `lib/format.ts`. Percentuais em `lib/metrics.ts` (`formatPct`).
- Tokens Tailwind compartilhados pra forms/buttons em `lib/ui.ts`.
- Cor de marca `navy` (`#0D2137`) em `tailwind.config.ts`. Tom sóbrio/profissional.
- `components/Modal.tsx` suporta **modais aninhados** via stack module-level — só o topmost trata Escape e prende Tab.
- App é todo client-rendered sob os providers. `app/(app)/page.tsx` é um tab switcher entre as views (`FunilView`, `AtividadesView`, `ClientesView`, `ConfiguracoesView`, `HistoricoView`). Cada view tem seus próprios modais.

## Padrões de qualidade (obrigatório — gate de aceitação)

- `npx tsc --noEmit` → zero erros
- `npm run build` → zero warnings novos
- Lighthouse (build de produção): Performance ≥ 97, Accessibility 100, Best Practices 100, SEO 100
- **Accessibility:** `aria-label` em todo elemento interativo; foco visível; `prefers-reduced-motion` respeitado.
- **Responsivo:** mobile a partir de 375px; board com scroll horizontal quando necessário.

## Regras de dados sensíveis

- **CPF/RG nunca são armazenados.** Documentos só no ponto de uso (assinatura de contrato), nunca persistidos.
- **Credenciais Supabase** em `.env.local` (gitignored): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Em produção, configuradas como Environment Variables no painel da Vercel.
- **`SUPABASE_SERVICE_ROLE_KEY`** (se necessária pra scripts) **nunca** vai pro browser nem é commitada — só em `.env.local` e/ou Vercel env (sem prefixo `NEXT_PUBLIC_`).
- Nunca commitar `.vercel/`, `.env*`, ou tokens do Supabase.

## Identidade visual — Gibelo Engenharia

- Cor dominante: navy `#0D2137`
- Rodapé: "Gibelo Engenharia • CREA-SP 5070966442"
- Tom: profissional/sóbrio (ferramenta de trabalho de ticket alto)
- Toda interface em **português brasileiro**
