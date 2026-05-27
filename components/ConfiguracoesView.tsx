"use client";

import { useState } from "react";
import type { Etapa, Origem } from "@/lib/types";
import { useOrigins, useStages } from "@/lib/crm-store";
import { ordenarEtapas, corDaEtapa } from "@/lib/stages";
import { btnPrimary, inputCls } from "@/lib/ui";
import { EditableText } from "./EditableText";
import { AutomacoesSection } from "./AutomacoesSection";

const nomeInlineCls =
  "min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-navy-900 hover:border-navy-200 focus:border-navy-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-500/30";

// ── Origem ───────────────────────────────────────────────────────────────────
function OrigemRow({
  origem,
  usos,
  onRename,
  onDelete,
}: {
  origem: Origem;
  usos: number;
  onRename: (nome: string) => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-navy-100 bg-white p-2">
      <EditableText
        value={origem.nome}
        onCommit={onRename}
        ariaLabel={`Nome da origem ${origem.nome}`}
        className={nomeInlineCls}
      />
      <span className="shrink-0 rounded-full bg-navy-50 px-2 py-0.5 text-[11px] text-navy-500">
        {usos} uso{usos === 1 ? "" : "s"}
      </span>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Excluir origem ${origem.nome}`}
        className="shrink-0 rounded-md p-1.5 text-navy-400 transition-colors hover:bg-red-50 hover:text-red-600"
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
function EtapaRow({
  etapa,
  usos,
  posicao,
  total,
  onRename,
  onProb,
  onMover,
  onDelete,
}: {
  etapa: Etapa;
  usos: number;
  posicao: number;
  total: number;
  onRename: (nome: string) => void;
  onProb: (prob: number) => void;
  onMover: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  const [prob, setProb] = useState(Math.round(etapa.probabilidade * 100));

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-navy-100 bg-white p-2">
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
          className="w-16 rounded-md border border-navy-200 px-2 py-1 text-right text-sm text-navy-900 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/30"
        />
        <span className="text-xs text-navy-400">%</span>
      </div>

      {etapa.final ? (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
          ganho
        </span>
      ) : (
        <>
          <div className="flex">
            <button
              type="button"
              onClick={() => onMover(-1)}
              disabled={posicao === 0}
              aria-label={`Mover etapa ${etapa.nome} para cima`}
              className="rounded-md p-1 text-navy-400 transition-colors hover:bg-navy-50 hover:text-navy-700 disabled:opacity-30"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 11V5M5 8l3-3 3 3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onMover(1)}
              disabled={posicao === total - 1}
              aria-label={`Mover etapa ${etapa.nome} para baixo`}
              className="rounded-md p-1 text-navy-400 transition-colors hover:bg-navy-50 hover:text-navy-700 disabled:opacity-30"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 5v6M5 8l3 3 3-3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <span className="shrink-0 rounded-full bg-navy-50 px-2 py-0.5 text-[11px] text-navy-500">
            {usos} no funil
          </span>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Excluir etapa ${etapa.nome}`}
            className="shrink-0 rounded-md p-1.5 text-navy-400 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2.5 4h11M6 4V2.5h4V4M5 4l.5 9h5l.5-9" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}
    </li>
  );
}

export function ConfiguracoesView() {
  const origens = useOrigins();
  const stages = useStages();

  const [novaOrigem, setNovaOrigem] = useState("");
  const [novaEtapa, setNovaEtapa] = useState("");
  const [novaProb, setNovaProb] = useState(50);

  const etapasOrd = ordenarEtapas(stages.etapas);
  const ativas = etapasOrd.filter((e) => !e.final);

  async function addOrigem() {
    const t = novaOrigem.trim();
    if (!t) return;
    await origens.criar({ nome: t });
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
    const final = etapasOrd.find((e) => e.final);
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

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Origens */}
      <section
        aria-label="Origens"
        className="rounded-2xl border border-navy-100 bg-navy-50/40 p-4 sm:p-5"
      >
        <h2 className="text-sm font-semibold text-navy-900">Origens</h2>
        <p className="mt-0.5 text-xs text-navy-400">
          De onde vêm as oportunidades. Não é possível excluir uma origem em uso.
        </p>

        <ul className="mt-4 space-y-2">
          {origens.origens.map((o) => (
            <OrigemRow
              key={o.id}
              origem={o}
              usos={origens.emUso(o.id)}
              onRename={(nome) => origens.atualizar(o.id, { nome })}
              onDelete={() => delOrigem(o.id, o.nome)}
            />
          ))}
        </ul>

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
        className="rounded-2xl border border-navy-100 bg-navy-50/40 p-4 sm:p-5"
      >
        <h2 className="text-sm font-semibold text-navy-900">Etapas do funil</h2>
        <p className="mt-0.5 text-xs text-navy-400">
          Nome, probabilidade (alimenta o valor ponderado) e ordem das colunas.
        </p>

        <ul className="mt-4 space-y-2">
          {etapasOrd.map((e) => {
            const posicao = ativas.findIndex((a) => a.id === e.id);
            return (
              <EtapaRow
                key={e.id}
                etapa={e}
                usos={stages.emUso(e.id)}
                posicao={posicao}
                total={ativas.length}
                onRename={(nome) => stages.atualizar(e.id, { nome })}
                onProb={(probabilidade) => stages.atualizar(e.id, { probabilidade })}
                onMover={(dir) => stages.mover(e.id, dir)}
                onDelete={() => delEtapa(e.id, e.nome)}
              />
            );
          })}
        </ul>

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
              className="w-16 rounded-lg border border-navy-200 px-2 py-2 text-right text-sm focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/30"
            />
            <span className="text-xs text-navy-400">%</span>
          </div>
          <button type="button" onClick={addEtapa} className={btnPrimary}>
            Adicionar
          </button>
        </div>
      </section>

      <AutomacoesSection />
    </div>
  );
}
