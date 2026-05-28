"use client";

import { useState } from "react";
import type { Etapa, Origem, TipoServico } from "@/lib/types";
import { useOrigins, useStages, useTiposServico } from "@/lib/crm-store";
import { ordenarEtapas, corDaEtapa } from "@/lib/stages";
import { btnPrimary, inputCls } from "@/lib/ui";
import { EditableText } from "./EditableText";
import { AutomacoesSection } from "./AutomacoesSection";
import { AlertasSection } from "./AlertasSection";
import { AtividadeEtiquetasConfig } from "./AtividadeEtiquetasConfig";
import {
  DragHandle,
  SortableConfigList,
  type DragHandleProps,
} from "./SortableConfigList";

const nomeInlineCls =
  "min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-navy-900 dark:text-gibelo-offwhite hover:border-navy-200 dark:hover:border-gibelo-areia/40 dark:border-dark-border focus:border-navy-500 focus:bg-white dark:bg-dark-surface focus:outline-none focus:ring-2 focus:ring-navy-500/30";

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

export function ConfiguracoesView() {
  const origens = useOrigins();
  const stages = useStages();
  const tipos = useTiposServico();

  const [novaOrigem, setNovaOrigem] = useState("");
  const [novaEtapa, setNovaEtapa] = useState("");
  const [novaProb, setNovaProb] = useState(50);
  const [novoTipo, setNovoTipo] = useState("");

  const etapasOrd = ordenarEtapas(stages.etapas);
  const ativas = etapasOrd.filter((e) => !e.final);
  const final = etapasOrd.find((e) => e.final);

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
    if (!r.ok) window.alert(r.erro);
  }

  async function addEtapa() {
    const t = novaEtapa.trim();
    if (!t) return;
    const maxAtiva = ativas.reduce((m, e) => Math.max(m, e.ordem), -1);
    const novaOrdem = maxAtiva + 1;
    if (final && final.ordem <= novaOrdem) {
      await stages.atualizar(final.id, { ordem: novaOrdem + 1 });
    }
    const prob = Number.isNaN(novaProb) ? 0 : Math.max(0, Math.min(100, novaProb));
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
    if (!r.ok) window.alert(r.erro);
  }

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

  // Para etapas: garante que a etapa final sempre fique no final da lista.
  async function reordenarEtapasAtivas(idsAtivas: string[]) {
    const todos = final ? [...idsAtivas, final.id] : idsAtivas;
    await stages.reordenar(todos);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Origens */}
      <section
        aria-label="Origens"
        className="rounded-2xl border border-navy-100 dark:border-dark-border bg-navy-50 dark:bg-dark-elevated/40 p-4 sm:p-5"
      >
        <h2 className="text-sm font-semibold text-navy-900 dark:text-gibelo-offwhite">Origens</h2>
        <p className="mt-0.5 text-xs text-navy-700 dark:text-gibelo-areia">
          De onde vêm as oportunidades. Arraste para reordenar. Não é possível
          excluir uma origem em uso.
        </p>

        <div className="mt-4">
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
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={novaOrigem}
            onChange={(e) => setNovaOrigem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addOrigem()}
            placeholder="Nova origem…"
            aria-label="Nome da nova origem"
            className={`${inputCls} mt-0 flex-1`}
          />
          <button type="button" onClick={addOrigem} className={btnPrimary}>
            Adicionar
          </button>
        </div>
      </section>

      {/* Etapas */}
      <section
        aria-label="Etapas do funil"
        className="rounded-2xl border border-navy-100 dark:border-dark-border bg-navy-50 dark:bg-dark-elevated/40 p-4 sm:p-5"
      >
        <h2 className="text-sm font-semibold text-navy-900 dark:text-gibelo-offwhite">Etapas do funil</h2>
        <p className="mt-0.5 text-xs text-navy-700 dark:text-gibelo-areia">
          Nome, probabilidade (alimenta o valor ponderado) e ordem das colunas.
          Arraste para reordenar. A etapa de fechamento (ganho) fica fixa no fim.
        </p>

        <div className="mt-4">
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

        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={novaEtapa}
            onChange={(e) => setNovaEtapa(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addEtapa()}
            placeholder="Nova etapa…"
            aria-label="Nome da nova etapa"
            className={`${inputCls} mt-0 min-w-[8rem] flex-1`}
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              value={novaProb}
              onChange={(e) => setNovaProb(Number(e.target.value))}
              aria-label="Probabilidade da nova etapa em %"
              className="w-16 rounded-lg border border-navy-200 dark:border-dark-border px-2 py-2 text-right text-sm focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/30"
            />
            <span className="text-xs text-navy-700 dark:text-gibelo-areia">%</span>
          </div>
          <button type="button" onClick={addEtapa} className={btnPrimary}>
            Adicionar
          </button>
        </div>
      </section>

      {/* Tipos de serviço */}
      <section
        aria-label="Tipos de serviço"
        className="rounded-2xl border border-navy-100 dark:border-dark-border bg-navy-50 dark:bg-dark-elevated/40 p-4 sm:p-5"
      >
        <h2 className="text-sm font-semibold text-navy-900 dark:text-gibelo-offwhite">Tipos de serviço</h2>
        <p className="mt-0.5 text-xs text-navy-700 dark:text-gibelo-areia">
          Sugestões oferecidas ao adicionar um serviço dentro de um deal.
          Arraste para reordenar. Excluir não apaga histórico, só remove da lista
          de sugestões.
        </p>

        <div className="mt-4">
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
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={novoTipo}
            onChange={(e) => setNovoTipo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTipoServico()}
            placeholder="Novo tipo de serviço…"
            aria-label="Nome do novo tipo de serviço"
            className={`${inputCls} mt-0 flex-1`}
          />
          <button type="button" onClick={addTipoServico} className={btnPrimary}>
            Adicionar
          </button>
        </div>
      </section>

      <AtividadeEtiquetasConfig />

      <AutomacoesSection />

      <AlertasSection />
    </div>
  );
}
