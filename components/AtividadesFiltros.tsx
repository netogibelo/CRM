"use client";

import { useEffect } from "react";
import type { AtividadeEtiqueta } from "@/lib/types";
import { EQUIPE, nomeOuEmail } from "@/lib/equipe";
import { usePerfis } from "@/lib/crm-store";
import { inputCls } from "@/lib/ui";

export type StatusFiltro =
  | "todos"
  | "abertos"
  | "concluidos"
  | "atrasados"
  | "vencendo_hoje";

export interface FiltrosAtividades {
  responsavel: string;
  etiquetasIds: string[];
  status: StatusFiltro;
  ocultarRecorrentes: boolean;
  busca: string;
}

export const FILTROS_VAZIOS: FiltrosAtividades = {
  responsavel: "",
  etiquetasIds: [],
  status: "abertos",
  ocultarRecorrentes: false,
  busca: "",
};

const STORAGE_KEY = "gibelo-crm-filtros-atividades";

export function carregarFiltros(): FiltrosAtividades {
  if (typeof window === "undefined") return FILTROS_VAZIOS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return FILTROS_VAZIOS;
    const parsed = JSON.parse(raw) as Partial<FiltrosAtividades>;
    return { ...FILTROS_VAZIOS, ...parsed };
  } catch {
    return FILTROS_VAZIOS;
  }
}

function salvarFiltros(f: FiltrosAtividades) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
}

interface Props {
  filtros: FiltrosAtividades;
  onChange: (f: FiltrosAtividades) => void;
  etiquetas: AtividadeEtiqueta[];
  visiveis: number;
  total: number;
}

export function AtividadesFiltros({
  filtros,
  onChange,
  etiquetas,
  visiveis,
  total,
}: Props) {
  const { perfis } = usePerfis();

  useEffect(() => {
    salvarFiltros(filtros);
  }, [filtros]);

  const ativos =
    filtros.responsavel !== "" ||
    filtros.etiquetasIds.length > 0 ||
    filtros.status !== "todos" ||
    filtros.ocultarRecorrentes ||
    filtros.busca.trim() !== "";

  function toggleEtiqueta(id: string) {
    const has = filtros.etiquetasIds.includes(id);
    onChange({
      ...filtros,
      etiquetasIds: has
        ? filtros.etiquetasIds.filter((x) => x !== id)
        : [...filtros.etiquetasIds, id],
    });
  }

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-3 dark:border-dark-border dark:bg-dark-surface">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={filtros.busca}
          onChange={(e) => onChange({ ...filtros, busca: e.target.value })}
          placeholder="Buscar título ou descrição…"
          aria-label="Buscar cards"
          className={`${inputCls} mt-0 min-w-[10rem] flex-1`}
        />

        <select
          value={filtros.responsavel}
          onChange={(e) =>
            onChange({ ...filtros, responsavel: e.target.value })
          }
          aria-label="Filtrar por responsável"
          className="rounded-lg border border-navy-200 bg-white px-2 py-2 text-sm text-navy-900 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/30 dark:border-dark-border dark:bg-dark-elevated dark:text-gibelo-offwhite"
        >
          <option value="">Todos os responsáveis</option>
          <option value="__sem">Sem responsável</option>
          {EQUIPE.map((m) => (
            <option key={m.email} value={m.email}>
              {nomeOuEmail(m.email, perfis)}
            </option>
          ))}
        </select>

        <select
          value={filtros.status}
          onChange={(e) =>
            onChange({ ...filtros, status: e.target.value as StatusFiltro })
          }
          aria-label="Filtrar por status"
          className="rounded-lg border border-navy-200 bg-white px-2 py-2 text-sm text-navy-900 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/30 dark:border-dark-border dark:bg-dark-elevated dark:text-gibelo-offwhite"
        >
          <option value="todos">Todos</option>
          <option value="abertos">Em aberto</option>
          <option value="concluidos">Concluídos</option>
          <option value="atrasados">Atrasados</option>
          <option value="vencendo_hoje">Vencendo hoje</option>
        </select>

        <label className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 px-2 py-2 text-sm text-navy-900 dark:border-dark-border dark:text-gibelo-offwhite">
          <input
            type="checkbox"
            checked={filtros.ocultarRecorrentes}
            onChange={(e) =>
              onChange({ ...filtros, ocultarRecorrentes: e.target.checked })
            }
            className="h-4 w-4 cursor-pointer rounded border-navy-300 text-navy-700 focus:ring-2 focus:ring-navy-500/40"
          />
          <span className="text-xs">Ocultar recorrentes</span>
        </label>
      </div>

      {etiquetas.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-navy-700 dark:text-gibelo-areia">
            Etiquetas:
          </span>
          {etiquetas.map((e) => {
            const ativa = filtros.etiquetasIds.includes(e.id);
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => toggleEtiqueta(e.id)}
                aria-pressed={ativa}
                aria-label={`${ativa ? "Remover filtro" : "Filtrar por"} etiqueta ${e.nome}`}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-all ${
                  ativa
                    ? "text-white ring-1 ring-white/40"
                    : "text-navy-700 opacity-60 hover:opacity-100 dark:text-gibelo-offwhite"
                }`}
                style={{
                  backgroundColor: ativa ? e.cor : "transparent",
                  border: ativa ? "none" : `1px solid ${e.cor}`,
                  color: ativa ? "white" : e.cor,
                }}
              >
                {e.nome}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className="text-navy-700 dark:text-gibelo-areia">
          {visiveis} de {total} card{total === 1 ? "" : "s"} visíveis
        </span>
        {ativos && (
          <button
            type="button"
            onClick={() => onChange(FILTROS_VAZIOS)}
            className="font-medium text-navy-700 hover:text-navy-900 dark:text-gibelo-areia dark:hover:text-gibelo-offwhite"
            aria-label="Limpar todos os filtros"
          >
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}
