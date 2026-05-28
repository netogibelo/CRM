"use client";

import { useState } from "react";
import type { AtividadeEtiqueta } from "@/lib/types";
import { useBoard } from "@/lib/activities-store";
import { btnPrimary, inputCls } from "@/lib/ui";
import {
  DragHandle,
  SortableConfigList,
  type DragHandleProps,
} from "./SortableConfigList";

const CORES_SUGERIDAS = [
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#374151",
  "#0D2137",
  "#06B6D4",
  "#84CC16",
];

function EtiquetaRow({
  etiqueta,
  handle,
  onRename,
  onPintar,
  onDelete,
}: {
  etiqueta: AtividadeEtiqueta;
  handle: DragHandleProps;
  onRename: (nome: string) => void;
  onPintar: (cor: string) => void;
  onDelete: () => void;
}) {
  const [editandoNome, setEditandoNome] = useState(false);
  const [nome, setNome] = useState(etiqueta.nome);
  const [paleta, setPaleta] = useState(false);

  function salvarNome() {
    const t = nome.trim();
    if (t && t !== etiqueta.nome) onRename(t);
    else setNome(etiqueta.nome);
    setEditandoNome(false);
  }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-navy-100 dark:border-dark-border bg-white dark:bg-dark-surface p-2">
      <DragHandle handle={handle} />
      <div className="relative">
        <button
          type="button"
          onClick={() => setPaleta((v) => !v)}
          aria-label={`Cor da etiqueta ${etiqueta.nome}`}
          aria-haspopup="menu"
          aria-expanded={paleta}
          className="h-6 w-6 shrink-0 rounded-full ring-1 ring-black/10 transition-transform hover:scale-105"
          style={{ backgroundColor: etiqueta.cor }}
        />
        {paleta && (
          <>
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => setPaleta(false)}
              className="fixed inset-0 z-10 cursor-default"
            />
            <div
              role="menu"
              className="absolute left-0 top-8 z-20 grid w-44 grid-cols-5 gap-1.5 rounded-lg border border-navy-100 bg-white p-2 shadow-card-hover dark:border-dark-border dark:bg-dark-surface"
            >
              {CORES_SUGERIDAS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="menuitemradio"
                  aria-checked={c === etiqueta.cor}
                  aria-label={`Cor ${c}`}
                  onClick={() => {
                    onPintar(c);
                    setPaleta(false);
                  }}
                  className={`h-6 w-6 shrink-0 rounded-full ring-1 ring-black/10 ${
                    c === etiqueta.cor ? "ring-2 ring-navy-700 ring-offset-1" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {editandoNome ? (
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={salvarNome}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              salvarNome();
            } else if (e.key === "Escape") {
              setNome(etiqueta.nome);
              setEditandoNome(false);
            }
          }}
          autoFocus
          aria-label="Editar nome da etiqueta"
          className="min-w-0 flex-1 rounded-md border border-navy-200 bg-white px-2 py-1 text-sm text-navy-900 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/30 dark:border-dark-border dark:bg-dark-elevated dark:text-gibelo-offwhite"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditandoNome(true)}
          className="min-w-0 flex-1 truncate rounded-md px-2 py-1 text-left text-sm text-navy-900 hover:bg-navy-50 dark:text-gibelo-offwhite dark:hover:bg-dark-elevated"
          aria-label={`Editar nome da etiqueta ${etiqueta.nome}`}
        >
          {etiqueta.nome}
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Excluir etiqueta ${etiqueta.nome}`}
        className="shrink-0 rounded-md p-1.5 text-navy-700 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gibelo-areia"
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

export function AtividadeEtiquetasConfig() {
  const {
    etiquetas,
    criarEtiqueta,
    atualizarEtiqueta,
    removerEtiqueta,
    reordenarEtiquetas,
  } = useBoard();
  const [nova, setNova] = useState("");
  const [novaCor, setNovaCor] = useState(CORES_SUGERIDAS[0]);

  async function adicionar() {
    const t = nova.trim();
    if (!t) return;
    const ordem = etiquetas.reduce((m, e) => Math.max(m, e.ordem), -1) + 1;
    await criarEtiqueta({ nome: t, cor: novaCor, ordem });
    setNova("");
  }

  async function excluir(id: string, nome: string) {
    if (!window.confirm(`Excluir a etiqueta "${nome}"?`)) return;
    await removerEtiqueta(id);
  }

  return (
    <section
      aria-label="Etiquetas de atividade"
      className="rounded-2xl border border-navy-100 bg-navy-50 p-4 dark:border-dark-border dark:bg-dark-elevated/40 sm:p-5"
    >
      <h2 className="text-sm font-semibold text-navy-900 dark:text-gibelo-offwhite">
        Etiquetas de atividade
      </h2>
      <p className="mt-0.5 text-xs text-navy-700 dark:text-gibelo-areia">
        Marcadores coloridos atribuíveis aos cards do quadro de atividades.
        Arraste para reordenar e clique no círculo para trocar a cor.
      </p>

      <div className="mt-4">
        <SortableConfigList
          ariaLabel="Lista de etiquetas de atividade"
          items={etiquetas}
          getId={(e) => e.id}
          getNome={(e) => e.nome}
          onReorder={reordenarEtiquetas}
          tituloAlfabetizar="Ordenar etiquetas A→Z"
          emptyLabel="Nenhuma etiqueta cadastrada."
          renderRow={(e, handle) => (
            <EtiquetaRow
              etiqueta={e}
              handle={handle}
              onRename={(nome) => atualizarEtiqueta(e.id, { nome })}
              onPintar={(cor) => atualizarEtiqueta(e.id, { cor })}
              onDelete={() => excluir(e.id, e.nome)}
            />
          )}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className="h-7 w-7 shrink-0 rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: novaCor }}
          aria-hidden="true"
        />
        <select
          value={novaCor}
          onChange={(e) => setNovaCor(e.target.value)}
          aria-label="Cor da nova etiqueta"
          className="rounded-lg border border-navy-200 bg-white px-2 py-2 text-xs text-navy-900 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/30 dark:border-dark-border dark:bg-dark-surface dark:text-gibelo-offwhite"
        >
          {CORES_SUGERIDAS.map((c) => (
            <option key={c} value={c} style={{ backgroundColor: c }}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && adicionar()}
          placeholder="Nova etiqueta…"
          aria-label="Nome da nova etiqueta"
          className={`${inputCls} mt-0 min-w-[8rem] flex-1`}
        />
        <button type="button" onClick={adicionar} className={btnPrimary}>
          Adicionar
        </button>
      </div>
    </section>
  );
}
