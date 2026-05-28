"use client";

import { useEffect, useMemo, useState } from "react";
import type { Deal, Origem, TipoObra } from "@/lib/types";
import { EQUIPE, nomeOuEmail } from "@/lib/equipe";
import { usePerfis } from "@/lib/crm-store";
import { TIPOS_OBRA } from "@/lib/tipo-obra";
import { parseValorBRL, formatBRL } from "@/lib/format";
import { btnGhost } from "@/lib/ui";

const STORAGE_KEY = "gibelo-crm-filtros-funil";

export interface FiltrosFunilState {
  responsavel: string;
  origemId: string;
  tipoObra: string;
  cidade: string;
  valorMin: number;
  valorMax: number;
}

const FILTROS_VAZIOS: FiltrosFunilState = {
  responsavel: "",
  origemId: "",
  tipoObra: "",
  cidade: "",
  valorMin: 0,
  valorMax: 0,
};

function lerFiltros(): FiltrosFunilState {
  if (typeof window === "undefined") return FILTROS_VAZIOS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return FILTROS_VAZIOS;
    return { ...FILTROS_VAZIOS, ...JSON.parse(raw) };
  } catch {
    return FILTROS_VAZIOS;
  }
}

function salvarFiltros(f: FiltrosFunilState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
}

export function aplicarFiltros(
  deals: Deal[],
  f: FiltrosFunilState,
): Deal[] {
  const cidadeNorm = f.cidade.trim().toLowerCase();
  return deals.filter((d) => {
    if (f.responsavel && d.responsavelEmail !== f.responsavel) return false;
    if (f.origemId && d.origemId !== f.origemId) return false;
    if (f.tipoObra && d.tipoObra !== f.tipoObra) return false;
    if (cidadeNorm) {
      const c = (d.cidadeObra || "").toLowerCase();
      if (!c.includes(cidadeNorm)) return false;
    }
    if (f.valorMin > 0 && d.valor < f.valorMin) return false;
    if (f.valorMax > 0 && d.valor > f.valorMax) return false;
    return true;
  });
}

export function useFiltrosFunil() {
  const [filtros, setFiltros] = useState<FiltrosFunilState>(FILTROS_VAZIOS);
  useEffect(() => {
    setFiltros(lerFiltros());
  }, []);
  useEffect(() => {
    salvarFiltros(filtros);
  }, [filtros]);
  return [filtros, setFiltros] as const;
}

interface FiltrosFunilProps {
  filtros: FiltrosFunilState;
  onChange: (f: FiltrosFunilState) => void;
  origens: Origem[];
  totalDeals: number;
  filtradosCount: number;
}

const labelInline = "block text-[11px] font-semibold uppercase tracking-wide text-navy-700 dark:text-gibelo-areia";
const inputInline =
  "w-full rounded-md border border-navy-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2.5 py-1.5 text-sm text-navy-900 dark:text-gibelo-offwhite placeholder:text-navy-500 dark:placeholder:text-gibelo-areia focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/30";

export function FiltrosFunil({
  filtros,
  onChange,
  origens,
  totalDeals,
  filtradosCount,
}: FiltrosFunilProps) {
  const { perfis } = usePerfis();

  const algumAtivo = useMemo(() => {
    return (
      filtros.responsavel !== "" ||
      filtros.origemId !== "" ||
      filtros.tipoObra !== "" ||
      filtros.cidade !== "" ||
      filtros.valorMin > 0 ||
      filtros.valorMax > 0
    );
  }, [filtros]);

  function patch<K extends keyof FiltrosFunilState>(
    k: K,
    v: FiltrosFunilState[K],
  ) {
    onChange({ ...filtros, [k]: v });
  }

  return (
    <section
      aria-label="Filtros do funil"
      className="rounded-xl border border-navy-100 dark:border-dark-border bg-white dark:bg-dark-surface p-3"
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <label htmlFor="filtro-resp" className={labelInline}>
            Responsável
          </label>
          <select
            id="filtro-resp"
            value={filtros.responsavel}
            onChange={(e) => patch("responsavel", e.target.value)}
            className={inputInline}
            aria-label="Filtrar por responsável"
          >
            <option value="">Todos</option>
            {EQUIPE.map((m) => (
              <option key={m.email} value={m.email}>
                {nomeOuEmail(m.email, perfis)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filtro-origem" className={labelInline}>
            Origem
          </label>
          <select
            id="filtro-origem"
            value={filtros.origemId}
            onChange={(e) => patch("origemId", e.target.value)}
            className={inputInline}
            aria-label="Filtrar por origem"
          >
            <option value="">Todas</option>
            {origens.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filtro-tipo" className={labelInline}>
            Tipo de obra
          </label>
          <select
            id="filtro-tipo"
            value={filtros.tipoObra}
            onChange={(e) =>
              patch("tipoObra", e.target.value as TipoObra | "")
            }
            className={inputInline}
            aria-label="Filtrar por tipo de obra"
          >
            <option value="">Todos</option>
            {TIPOS_OBRA.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filtro-cidade" className={labelInline}>
            Cidade
          </label>
          <input
            id="filtro-cidade"
            type="text"
            value={filtros.cidade}
            onChange={(e) => patch("cidade", e.target.value)}
            placeholder="Buscar…"
            className={inputInline}
            aria-label="Filtrar por cidade da obra"
          />
        </div>
        <div>
          <label htmlFor="filtro-min" className={labelInline}>
            Valor mín
          </label>
          <input
            id="filtro-min"
            type="text"
            inputMode="numeric"
            value={filtros.valorMin > 0 ? formatBRL(filtros.valorMin) : ""}
            onChange={(e) => patch("valorMin", parseValorBRL(e.target.value))}
            placeholder="R$ 0,00"
            className={inputInline}
            aria-label="Valor mínimo"
          />
        </div>
        <div>
          <label htmlFor="filtro-max" className={labelInline}>
            Valor máx
          </label>
          <input
            id="filtro-max"
            type="text"
            inputMode="numeric"
            value={filtros.valorMax > 0 ? formatBRL(filtros.valorMax) : ""}
            onChange={(e) => patch("valorMax", parseValorBRL(e.target.value))}
            placeholder="R$ 0,00"
            className={inputInline}
            aria-label="Valor máximo"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-navy-50 pt-2">
        <span className="text-xs text-navy-700 dark:text-gibelo-areia">
          Mostrando{" "}
          <strong className="text-navy-900 dark:text-gibelo-offwhite">{filtradosCount}</strong> de{" "}
          <strong className="text-navy-900 dark:text-gibelo-offwhite">{totalDeals}</strong>{" "}
          oportunidade{totalDeals === 1 ? "" : "s"}
        </span>
        {algumAtivo && (
          <button
            type="button"
            onClick={() => onChange(FILTROS_VAZIOS)}
            className={btnGhost}
            aria-label="Limpar todos os filtros"
          >
            Limpar filtros
          </button>
        )}
      </div>
    </section>
  );
}
