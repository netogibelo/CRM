"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Compass,
  Filter,
  LayoutTemplate,
  Mail,
  Settings,
  Tags,
  Users,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Etapa, Origem, TipoServico } from "@/lib/types";
import { useOrigins, useStages, useTiposServico } from "@/lib/crm-store";
import { useNav } from "@/lib/nav-store";
import { CONFIG_SECOES } from "@/lib/nav";
import { ordenarEtapas, corDaEtapa } from "@/lib/stages";
import { notificarErro } from "@/lib/toast-store";
import { btnPrimary, inputCls } from "@/lib/ui";
import { EditableText } from "./EditableText";
import { AutomacoesSection } from "./AutomacoesSection";
import { AlertasSection } from "./AlertasSection";
import { AtividadeEtiquetasConfig } from "./AtividadeEtiquetasConfig";
import { AtividadeTemplatesConfig } from "./AtividadeTemplatesConfig";
import { EquipeSection } from "./EquipeSection";
import {
  DragHandle,
  SortableConfigList,
  type DragHandleProps,
} from "./SortableConfigList";

const nomeInlineCls =
  "min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-navy-900 dark:text-gibelo-offwhite hover:border-navy-200 dark:hover:border-gibelo-areia/40 dark:border-dark-border focus:border-navy-500 focus:bg-white dark:bg-dark-surface focus:outline-none focus:ring-2 focus:ring-navy-500/30";

const cardCls =
  "rounded-2xl border border-navy-100 dark:border-dark-border bg-navy-50 dark:bg-dark-elevated/40 p-4 sm:p-5";

// Subpáginas com lista arrastável + formulário de adição usam uma coluna
// centrada e legível em telas normais e abrem em 2 colunas (lista à esquerda,
// formulário à direita) quando o canvas é largo — nunca esticam a lista.
const listShellCls =
  "mx-auto w-full max-w-[900px] @5xl/canvas:max-w-[1180px]";
const listGridCls =
  "mt-4 grid gap-6 @5xl/canvas:grid-cols-[minmax(0,1fr)_22rem] @5xl/canvas:items-start";

// ── Origem ───────────────────────────────────────────────────────────────────
function OrigemRow({
  origem,
  usos,
  handle,
  onRename,
  onDelete,
}: {
  origem: Origem;
  usos: number;
  handle: DragHandleProps;
  onRename: (nome: string) => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-navy-100 dark:border-dark-border bg-white dark:bg-dark-surface p-2">
      <DragHandle handle={handle} />
      <EditableText
        value={origem.nome}
        onCommit={onRename}
        ariaLabel={`Nome da origem ${origem.nome}`}
        className={nomeInlineCls}
      />
      <span className="shrink-0 rounded-full bg-navy-50 dark:bg-dark-elevated px-2 py-0.5 text-[11px] text-navy-700 dark:text-gibelo-areia">
        {usos} uso{usos === 1 ? "" : "s"}
      </span>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Excluir origem ${origem.nome}`}
        className="shrink-0 rounded-md p-1.5 text-navy-700 dark:text-gibelo-areia transition-colors hover:bg-red-50 hover:text-red-600"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M2.5 4h11M6 4V2.5h4V4M5 4l.5 9h5l.5-9"
            stroke="currentColor"
            strokeWidth="1.3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </li>
  );
}

// ── Etapa ────────────────────────────────────────────────────────────────────
//
// As etapas têm uma regra particular: a etapa "final" (ganho, 100%) fica
// renderizada FORA do bloco arrastável, mantendo a posição final fixa. Só as
// ativas entram no DnD. Ao reordenar, o store recebe ids_ativas + final.id.
function EtapaRow({
  etapa,
  usos,
  handle,
  onRename,
  onProb,
  onDelete,
}: {
  etapa: Etapa;
  usos: number;
  handle?: DragHandleProps;
  onRename: (nome: string) => void;
  onProb: (prob: number) => void;
  onDelete?: () => void;
}) {
  const [prob, setProb] = useState(Math.round(etapa.probabilidade * 100));

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-navy-100 dark:border-dark-border bg-white dark:bg-dark-surface p-2">
      {handle ? (
        <DragHandle handle={handle} />
      ) : (
        <span className="w-6 shrink-0" aria-hidden="true" />
      )}
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: corDaEtapa(etapa.ordem) }}
        aria-hidden="true"
      />
      <EditableText
        value={etapa.nome}
        onCommit={onRename}
        ariaLabel={`Nome da etapa ${etapa.nome}`}
        className={`${nomeInlineCls} min-w-[8rem]`}
      />

      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={100}
          aria-label={`Probabilidade da etapa ${etapa.nome} em %`}
          value={prob}
          onChange={(e) => setProb(Number(e.target.value))}
          onBlur={() => {
            const p = Number.isNaN(prob) ? 0 : Math.max(0, Math.min(100, prob));
            setProb(p);
            if (p / 100 !== etapa.probabilidade) onProb(p / 100);
          }}
          className="w-16 rounded-md border border-navy-200 dark:border-dark-border px-2 py-1 text-right text-sm text-navy-900 dark:text-gibelo-offwhite focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/30"
        />
        <span className="text-xs text-navy-700 dark:text-gibelo-areia">%</span>
      </div>

      {etapa.final ? (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
          ganho
        </span>
      ) : (
        <>
          <span className="shrink-0 rounded-full bg-navy-50 dark:bg-dark-elevated px-2 py-0.5 text-[11px] text-navy-700 dark:text-gibelo-areia">
            {usos} no funil
          </span>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Excluir etapa ${etapa.nome}`}
              className="shrink-0 rounded-md p-1.5 text-navy-700 dark:text-gibelo-areia transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2.5 4h11M6 4V2.5h4V4M5 4l.5 9h5l.5-9" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </>
      )}
    </li>
  );
}

// ── Tipo de serviço ──────────────────────────────────────────────────────────
function TipoServicoRow({
  tipo,
  handle,
  onRename,
  onDesativar,
}: {
  tipo: TipoServico;
  handle: DragHandleProps;
  onRename: (nome: string) => void;
  onDesativar: () => void;
}) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-navy-100 dark:border-dark-border bg-white dark:bg-dark-surface p-2">
      <DragHandle handle={handle} />
      <EditableText
        value={tipo.nome}
        onCommit={onRename}
        ariaLabel={`Nome do tipo de serviço ${tipo.nome}`}
        className={nomeInlineCls}
      />
      <button
        type="button"
        onClick={onDesativar}
        aria-label={`Excluir tipo de serviço ${tipo.nome}`}
        className="shrink-0 rounded-md p-1.5 text-navy-700 dark:text-gibelo-areia transition-colors hover:bg-red-50 hover:text-red-600"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M2.5 4h11M6 4V2.5h4V4M5 4l.5 9h5l.5-9"
            stroke="currentColor"
            strokeWidth="1.3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </li>
  );
}

// ── Painel de adição (coluna direita no layout largo) ─────────────────────────
function AddPanel({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-navy-200 bg-white p-4 dark:border-dark-border dark:bg-dark-surface @5xl/canvas:sticky @5xl/canvas:top-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-navy-700 dark:text-gibelo-areia">
        {titulo}
      </p>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

// ── Subpágina: Origens ────────────────────────────────────────────────────────
function OrigensSubpagina() {
  const origens = useOrigins();
  const [novaOrigem, setNovaOrigem] = useState("");

  async function addOrigem() {
    const t = novaOrigem.trim();
    if (!t) return;
    const proxOrdem =
      origens.origens.reduce((m, o) => Math.max(m, o.ordem), -1) + 1;
    await origens.criar({ nome: t, ordem: proxOrdem });
    setNovaOrigem("");
  }

  async function delOrigem(id: string, nome: string) {
    if (!window.confirm(`Excluir a origem "${nome}"?`)) return;
    const r = await origens.remover(id);
    if (!r.ok && r.erro) notificarErro(r.erro);
  }

  return (
    <div className={listShellCls}>
      <section aria-label="Origens" className={cardCls}>
        <h2 className="text-sm font-semibold text-navy-900 dark:text-gibelo-offwhite">
          Origens
        </h2>
        <p className="mt-0.5 text-xs text-navy-700 dark:text-gibelo-areia">
          De onde vêm as oportunidades. Arraste para reordenar. Não é possível
          excluir uma origem em uso.
        </p>

        <div className={listGridCls}>
          <SortableConfigList
            ariaLabel="Lista de origens"
            items={origens.origens}
            getId={(o) => o.id}
            getNome={(o) => o.nome}
            onReorder={(ids) => origens.reordenar(ids)}
            tituloAlfabetizar="Ordenar origens A→Z"
            renderRow={(o, handle) => (
              <OrigemRow
                origem={o}
                usos={origens.emUso(o.id)}
                handle={handle}
                onRename={(nome) => origens.atualizar(o.id, { nome })}
                onDelete={() => delOrigem(o.id, o.nome)}
              />
            )}
          />

          <AddPanel titulo="Adicionar origem">
            <input
              value={novaOrigem}
              onChange={(e) => setNovaOrigem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addOrigem()}
              placeholder="Nova origem…"
              aria-label="Nome da nova origem"
              className={`${inputCls} mt-0`}
            />
            <button
              type="button"
              onClick={addOrigem}
              className={`${btnPrimary} w-full`}
            >
              Adicionar
            </button>
          </AddPanel>
        </div>
      </section>
    </div>
  );
}

// ── Subpágina: Etapas do funil ────────────────────────────────────────────────
function EtapasSubpagina() {
  const stages = useStages();
  const [novaEtapa, setNovaEtapa] = useState("");
  const [novaProb, setNovaProb] = useState(50);

  const etapasOrd = ordenarEtapas(stages.etapas);
  const ativas = etapasOrd.filter((e) => !e.final);
  const final = etapasOrd.find((e) => e.final);

  async function addEtapa() {
    const t = novaEtapa.trim();
    if (!t) return;
    const maxAtiva = ativas.reduce((m, e) => Math.max(m, e.ordem), -1);
    const novaOrdem = maxAtiva + 1;
    if (final && final.ordem <= novaOrdem) {
      await stages.atualizar(final.id, { ordem: novaOrdem + 1 });
    }
    const prob = Number.isNaN(novaProb)
      ? 0
      : Math.max(0, Math.min(100, novaProb));
    await stages.criar({
      nome: t,
      probabilidade: prob / 100,
      ordem: novaOrdem,
    });
    setNovaEtapa("");
    setNovaProb(50);
  }

  async function delEtapa(id: string, nome: string) {
    if (!window.confirm(`Excluir a etapa "${nome}"?`)) return;
    const r = await stages.remover(id);
    if (!r.ok && r.erro) notificarErro(r.erro);
  }

  // Garante que a etapa final sempre fique no fim da lista ao reordenar.
  async function reordenarEtapasAtivas(idsAtivas: string[]) {
    const todos = final ? [...idsAtivas, final.id] : idsAtivas;
    await stages.reordenar(todos);
  }

  return (
    <div className={listShellCls}>
      <section aria-label="Etapas do funil" className={cardCls}>
        <h2 className="text-sm font-semibold text-navy-900 dark:text-gibelo-offwhite">
          Etapas do funil
        </h2>
        <p className="mt-0.5 text-xs text-navy-700 dark:text-gibelo-areia">
          Nome, probabilidade (alimenta o valor ponderado) e ordem das colunas.
          Arraste para reordenar. A etapa de fechamento (ganho) fica fixa no fim.
        </p>

        <div className={listGridCls}>
          <div>
            <SortableConfigList
              ariaLabel="Lista de etapas ativas"
              items={ativas}
              getId={(e) => e.id}
              getNome={(e) => e.nome}
              onReorder={reordenarEtapasAtivas}
              tituloAlfabetizar="Ordenar etapas A→Z"
              renderRow={(e, handle) => (
                <EtapaRow
                  etapa={e}
                  usos={stages.emUso(e.id)}
                  handle={handle}
                  onRename={(nome) => stages.atualizar(e.id, { nome })}
                  onProb={(probabilidade) =>
                    stages.atualizar(e.id, { probabilidade })
                  }
                  onDelete={() => delEtapa(e.id, e.nome)}
                />
              )}
            />
            {final && (
              <ul className="mt-2">
                <EtapaRow
                  etapa={final}
                  usos={stages.emUso(final.id)}
                  onRename={(nome) => stages.atualizar(final.id, { nome })}
                  onProb={(probabilidade) =>
                    stages.atualizar(final.id, { probabilidade })
                  }
                />
              </ul>
            )}
          </div>

          <AddPanel titulo="Adicionar etapa">
            <input
              value={novaEtapa}
              onChange={(e) => setNovaEtapa(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEtapa()}
              placeholder="Nova etapa…"
              aria-label="Nome da nova etapa"
              className={`${inputCls} mt-0`}
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={novaProb}
                onChange={(e) => setNovaProb(Number(e.target.value))}
                aria-label="Probabilidade da nova etapa em %"
                className="w-20 rounded-lg border border-navy-200 dark:border-dark-border px-2 py-2 text-right text-sm text-navy-900 dark:text-gibelo-offwhite focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/30"
              />
              <span className="text-xs text-navy-700 dark:text-gibelo-areia">
                % de probabilidade
              </span>
            </div>
            <button
              type="button"
              onClick={addEtapa}
              className={`${btnPrimary} w-full`}
            >
              Adicionar
            </button>
          </AddPanel>
        </div>
      </section>
    </div>
  );
}

// ── Subpágina: Tipos de serviço ───────────────────────────────────────────────
function TiposServicoSubpagina() {
  const tipos = useTiposServico();
  const [novoTipo, setNovoTipo] = useState("");

  async function addTipoServico() {
    const t = novoTipo.trim();
    if (!t) return;
    const maxOrdem = tipos.ativos.reduce((m, x) => Math.max(m, x.ordem), -1);
    await tipos.criar({ nome: t, ordem: maxOrdem + 1, ativo: true });
    setNovoTipo("");
  }

  async function delTipoServico(id: string, nome: string) {
    if (!window.confirm(`Excluir o tipo "${nome}"?`)) return;
    await tipos.desativar(id);
  }

  return (
    <div className={listShellCls}>
      <section aria-label="Tipos de serviço" className={cardCls}>
        <h2 className="text-sm font-semibold text-navy-900 dark:text-gibelo-offwhite">
          Tipos de serviço
        </h2>
        <p className="mt-0.5 text-xs text-navy-700 dark:text-gibelo-areia">
          Sugestões oferecidas ao adicionar um serviço dentro de um deal.
          Arraste para reordenar. Excluir não apaga histórico, só remove da lista
          de sugestões.
        </p>

        <div className={listGridCls}>
          <SortableConfigList
            ariaLabel="Lista de tipos de serviço"
            items={tipos.ativos}
            getId={(t) => t.id}
            getNome={(t) => t.nome}
            onReorder={(ids) => tipos.reordenar(ids)}
            tituloAlfabetizar="Ordenar tipos A→Z"
            renderRow={(t, handle) => (
              <TipoServicoRow
                tipo={t}
                handle={handle}
                onRename={(nome) => tipos.atualizar(t.id, { nome })}
                onDesativar={() => delTipoServico(t.id, t.nome)}
              />
            )}
          />

          <AddPanel titulo="Adicionar tipo de serviço">
            <input
              value={novoTipo}
              onChange={(e) => setNovoTipo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTipoServico()}
              placeholder="Novo tipo de serviço…"
              aria-label="Nome do novo tipo de serviço"
              className={`${inputCls} mt-0`}
            />
            <button
              type="button"
              onClick={addTipoServico}
              className={`${btnPrimary} w-full`}
            >
              Adicionar
            </button>
          </AddPanel>
        </div>
      </section>
    </div>
  );
}

// ── Wrapper para seções que já são cards completos e auto-contidos ────────────
function SubpaginaCard({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-[960px]">{children}</div>;
}

const CONFIG_ICONS: Record<string, LucideIcon> = {
  alertas: Mail,
  automacoes: Zap,
  equipe: Users,
  etapas: Filter,
  "etiquetas-atividade": Tags,
  origens: Compass,
  "templates-atividade": LayoutTemplate,
  "tipos-servico": Wrench,
};

// ── Tela inicial: grade de cards ──────────────────────────────────────────────
function ConfigHome({ onAbrir }: { onAbrir: (id: string) => void }) {
  return (
    <div>
      <header className="mb-5">
        <h1 className="text-lg font-semibold text-navy-900 dark:text-gibelo-offwhite">
          Configurações
        </h1>
        <p className="mt-1 text-sm text-navy-700 dark:text-gibelo-areia">
          Escolha uma área para configurar.
        </p>
      </header>

      <ul className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        {CONFIG_SECOES.map((s) => {
          const Icon = CONFIG_ICONS[s.id] ?? Settings;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onAbrir(s.id)}
                aria-label={`Abrir ${s.label}`}
                className="group flex w-full items-start gap-3 rounded-2xl border border-navy-100 bg-white p-4 text-left transition-colors hover:border-navy-300 hover:bg-navy-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/40 dark:border-dark-border dark:bg-dark-surface dark:hover:border-gibelo-areia/40 dark:hover:bg-dark-elevated dark:focus-visible:ring-gibelo-areia/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700 transition-colors group-hover:bg-navy-900 group-hover:text-white dark:bg-dark-elevated dark:text-gibelo-areia">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-navy-900 dark:text-gibelo-offwhite">
                    {s.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-navy-700 dark:text-gibelo-areia">
                    {s.descricao}
                  </span>
                </span>
                <ArrowRight
                  size={16}
                  aria-hidden="true"
                  className="mt-1 shrink-0 text-navy-400 transition-transform group-hover:translate-x-0.5 group-hover:text-navy-700 dark:text-gibelo-areia dark:group-hover:text-gibelo-offwhite"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Breadcrumb + voltar ───────────────────────────────────────────────────────
function ConfigBreadcrumb({
  label,
  onVoltar,
}: {
  label: string;
  onVoltar: () => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
      <button
        type="button"
        onClick={onVoltar}
        aria-label="Voltar para Configurações"
        className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 px-3 py-1.5 text-sm font-medium text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/30 dark:border-dark-border dark:text-gibelo-offwhite dark:hover:bg-dark-elevated"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar
      </button>
      <nav aria-label="Trilha de navegação" className="min-w-0">
        <ol className="flex items-center gap-1.5 text-sm">
          <li>
            <button
              type="button"
              onClick={onVoltar}
              className="rounded text-navy-600 transition-colors hover:text-navy-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/30 dark:text-gibelo-areia dark:hover:text-gibelo-offwhite"
            >
              Configurações
            </button>
          </li>
          <li aria-hidden="true" className="text-navy-400 dark:text-gibelo-areia/60">
            <ChevronRight size={14} />
          </li>
          <li
            aria-current="page"
            className="truncate font-medium text-navy-900 dark:text-gibelo-offwhite"
          >
            {label}
          </li>
        </ol>
      </nav>
    </div>
  );
}

function ConfigConteudo({ id }: { id: string }) {
  switch (id) {
    case "origens":
      return <OrigensSubpagina />;
    case "etapas":
      return <EtapasSubpagina />;
    case "tipos-servico":
      return <TiposServicoSubpagina />;
    case "automacoes":
      return (
        <SubpaginaCard>
          <AutomacoesSection />
        </SubpaginaCard>
      );
    case "templates-atividade":
      return (
        <SubpaginaCard>
          <AtividadeTemplatesConfig />
        </SubpaginaCard>
      );
    case "etiquetas-atividade":
      return (
        <SubpaginaCard>
          <AtividadeEtiquetasConfig />
        </SubpaginaCard>
      );
    case "equipe":
      return (
        <SubpaginaCard>
          <EquipeSection />
        </SubpaginaCard>
      );
    case "alertas":
      return (
        <SubpaginaCard>
          <AlertasSection />
        </SubpaginaCard>
      );
    default:
      return null;
  }
}

export function ConfiguracoesView() {
  const { subpaginaConfig, setSubpaginaConfig } = useNav();

  const secao = subpaginaConfig
    ? CONFIG_SECOES.find((s) => s.id === subpaginaConfig)
    : undefined;

  // Sem subpágina (ou id inválido) → tela inicial com a grade de cards.
  if (!secao) {
    return <ConfigHome onAbrir={setSubpaginaConfig} />;
  }

  return (
    <div>
      <ConfigBreadcrumb
        label={secao.label}
        onVoltar={() => setSubpaginaConfig(null)}
      />
      <ConfigConteudo id={secao.id} />
    </div>
  );
}
