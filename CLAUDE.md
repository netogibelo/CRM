# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status & hard constraints

CRM de funil de vendas (estilo Pipedrive) + quadro de atividades (estilo Trello) para a Gibelo Engenharia. Interface inteiramente em **pt-BR**.

This phase is **local-only**: persistence is `localStorage`, behind the repository layer. Do **not** add a backend, Supabase, deploy config, or environment variables unless explicitly asked — that is a planned later phase. The whole point of the architecture is that the Supabase migration is a single-file change when the time comes.

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

### Persistence is fully abstracted — the UI never touches `localStorage`

`lib/repository.ts` is the only module that reads/writes storage. It defines one interface per collection (`DealRepository`, `ClientRepository`, `OriginRepository`, `StageRepository`, `ActivityRepository`) and exports a concrete `localStorage` instance of each at the **bottom of the file** — that export block is the **single swap point** for a future `Supabase*Repository`. Never import `localStorage` or call `window.localStorage` from a component or hook.

Two storage keys, two independent stores:
- `gibelo-crm-state` → `{ deals, clientes, origens, etapas }` (funnel domain)
- `gibelo-atividades-state` → `{ listas, cards }` (activities board)

`readCrm()` seeds on first run (`gerarSeedCrm`) and runs `migrarCrm()` on every read — this is a **lightweight migration** that upgrades older saved states (e.g. deals that stored `cliente`/`origem` as free text are converted into `Cliente` records + `clienteId`/`origemId` references). When changing the `Deal`/`CrmState` shape, update `migrarCrm` in `lib/seed.ts` so existing users' data still loads.

### State layer: two providers, dedicated hooks

`app/layout.tsx` wraps the tree in `components/Providers.tsx` → `CrmProvider` (`lib/crm-store.tsx`) + `ActivitiesProvider` (`lib/activities-store.tsx`). Each provider holds the **single in-memory source of truth** for its domain and exposes purpose-built hooks. Components consume hooks, **never the repositories directly**:

- `useDeals`, `useClients`, `useOrigins`, `useStages`, `useResolvers` (id→nome lookups) — from `crm-store`
- `useBoard` — from `activities-store`

Mutation pattern inside the providers: call the repository (which persists), then mirror the result into React state. Callbacks are wrapped in `useCallback([])` and read current data via a `useRef` mirror of state (`ref.current`) so their identities stay stable while never going stale. Preserve this pattern when adding mutations.

**Referential integrity** lives in the provider, not the repository: `removerCliente`/`removerOrigem`/`removerEtapa` return `{ ok, erro }` and refuse deletion when the entity is in use by a deal (or, for the final stage, structurally). UI surfaces `erro` via `window.alert`. `*EmUso(id)` helpers expose the usage count.

### Funnel stage model (important nuance)

Etapas are editable data (`Etapa { nome, probabilidade, ordem, final? }`), seeded in `lib/seed.ts`. Exactly one etapa has `final: true` ("Fechado (ganho)", 100%). Helpers in `lib/stages.ts`:
- The board renders only `etapasAtivas` (non-final), ordered by `ordem`.
- Marking a deal "ganho" sets `etapaId` to the final stage and `status: "ganho"`, which moves it out of the board into the Histórico tab.
- All etapas (including final) feed the conversion funnel and weighted-value math in `lib/metrics.ts`. `probabilidade` is user-editable in Configurações and drives **valor ponderado = Σ(valor × probabilidade da etapa atual)**.

Deal lifecycle is driven by `status` (`"aberto" | "ganho" | "perdido"`), not by which column it's in. Won/lost deals leave the board and appear in Histórico; they can be reopened.

### Boards & drag-and-drop

Both Kanban boards (funnel and activities) use **native HTML5 drag-and-drop** via shared helpers in `lib/dnd.ts` (`useDropTarget`, `dragProps`, `activationProps`). Mobile fallbacks exist (stage dropdown in the deal form; "Mover para" menu on activity cards) because HTML5 DnD doesn't work on touch. Column/list order and card-within-list order are controlled by an `ordem` field; reordering swaps `ordem` between neighbors.

### Conventions

- Formatting/parsing (BRL currency, dd/mm/aaaa dates, "parado > 14 dias" logic) is centralized in `lib/format.ts`. Percentages in `lib/metrics.ts` (`formatPct`).
- Shared Tailwind class tokens for forms/buttons live in `lib/ui.ts`; reuse them instead of re-typing input/button classes.
- Brand color is `navy` (`#0D2137`) defined in `tailwind.config.ts`; the tone is sober/professional, not playful.
- `components/Modal.tsx` supports **nested modals** via a module-level stack (e.g. the quick-add-client popup opens on top of the deal form) — only the topmost modal handles Escape and traps Tab.
- The whole app is client-rendered under the providers; the page (`app/page.tsx`) is a tab switcher across view components (`FunilView`, `AtividadesView`, `ClientesView`, `ConfiguracoesView`, `HistoricoView`). Each view owns its own modal/form state.

## Padrões de qualidade (obrigatório — gate de aceitação)

Toda mudança deve passar por:
- `npx tsc --noEmit` → zero erros de tipo
- `npm run build` → compila sem warnings
- Lighthouse (build de produção): Performance ≥ 97, Accessibility 100, Best Practices 100, SEO 100

**Accessibility:** aria-label em todos os elementos interativos; foco visível; prefers-reduced-motion respeitado.

**Responsivo:** mobile a partir de 375px; board com scroll horizontal nas colunas quando necessário.

## Regras de dados sensíveis

**CPF/RG nunca são armazenados.** Documentos são fornecidos apenas no ponto de uso (ex: assinatura de contrato), nunca persistidos no sistema. Se um campo de cadastro pedir documento, é opcional e o prompt deve avisar que não será salvo.

Quando migrar para Supabase: `.env.local` com credenciais do banco fica no `.gitignore`; variáveis de ambiente vão como Environment Variables no painel da Vercel, nunca commitadas.

## Identidade visual — Gibelo Engenharia

- Cor dominante: navy `#0D2137`
- Rodapé: "Gibelo Engenharia • CREA-SP 5070966442"
- Tom: profissional/sóbrio (ferramenta de trabalho de ticket alto, não lúdica)
- Toda interface em **português brasileiro**

## Pendências conhecidas (não mexer sem autorização)

- **Kanban (Atividades):** drag-and-drop não funciona (só navegação por setas). Correção planejada com `@dnd-kit` antes do deploy.
- **Cores do Kanban:** listas e cards precisam de paletas de cor customizáveis e distintas. Vai junto com o fix do DnD.