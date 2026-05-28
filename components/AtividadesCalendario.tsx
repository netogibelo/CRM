"use client";

import { useMemo, useState } from "react";
import type { AtividadeCard } from "@/lib/types";
import { useBoard } from "@/lib/activities-store";

interface Props {
  cards: AtividadeCard[];
  onAbrir: (card: AtividadeCard) => void;
}

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function vencDe(c: AtividadeCard): string | null {
  return c.dataVencimento ?? c.data ?? null;
}

export function AtividadesCalendario({ cards, onAbrir }: Props) {
  const { etiquetasDoCard } = useBoard();
  const hoje = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [cursor, setCursor] = useState(
    () => new Date(hoje.getFullYear(), hoje.getMonth(), 1),
  );

  const ano = cursor.getFullYear();
  const mes = cursor.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const diasNoMes = ultimoDia.getDate();
  const padInicio = primeiroDia.getDay(); // 0..6 dom..sab
  const totalCelulas = Math.ceil((padInicio + diasNoMes) / 7) * 7;

  const cardsPorDia = useMemo(() => {
    const map = new Map<string, AtividadeCard[]>();
    for (const c of cards) {
      const v = vencDe(c);
      if (!v) continue;
      const arr = map.get(v);
      if (arr) arr.push(c);
      else map.set(v, [c]);
    }
    return map;
  }, [cards]);

  const semData = useMemo(() => cards.filter((c) => !vencDe(c)), [cards]);

  function corPrincipalDoCard(c: AtividadeCard): string {
    const etqs = etiquetasDoCard(c.id);
    return etqs[0]?.cor ?? "#7B8794"; // cinza neutro
  }

  function navegar(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  function irPraHoje() {
    setCursor(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  }

  function fmtData(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-navy-100 bg-white p-3 dark:border-dark-border dark:bg-dark-surface">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navegar(-1)}
            aria-label="Mês anterior"
            className="rounded-md border border-navy-200 px-2 py-1 text-sm text-navy-700 hover:bg-navy-50 dark:border-dark-border dark:text-gibelo-offwhite dark:hover:bg-dark-elevated"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={irPraHoje}
            className="rounded-md border border-navy-200 px-2 py-1 text-xs font-medium text-navy-700 hover:bg-navy-50 dark:border-dark-border dark:text-gibelo-offwhite dark:hover:bg-dark-elevated"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => navegar(1)}
            aria-label="Próximo mês"
            className="rounded-md border border-navy-200 px-2 py-1 text-sm text-navy-700 hover:bg-navy-50 dark:border-dark-border dark:text-gibelo-offwhite dark:hover:bg-dark-elevated"
          >
            ›
          </button>
        </div>
        <h3 className="text-base font-semibold text-navy-900 dark:text-gibelo-offwhite">
          {MESES[mes]} de {ano}
        </h3>
        <span className="text-xs text-navy-700 dark:text-gibelo-areia">
          {cards.length} card{cards.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white dark:border-dark-border dark:bg-dark-surface">
        <div className="grid grid-cols-7 border-b border-navy-100 bg-navy-50 dark:border-dark-border dark:bg-dark-elevated">
          {DIAS_SEMANA.map((d) => (
            <div
              key={d}
              className="px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-navy-700 dark:text-gibelo-areia"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: totalCelulas }).map((_, idx) => {
            const dia = idx - padInicio + 1;
            const dentro = dia >= 1 && dia <= diasNoMes;
            const dataObj = dentro ? new Date(ano, mes, dia) : null;
            const dataStr = dataObj ? fmtData(dataObj) : "";
            const dosCards = dataStr ? cardsPorDia.get(dataStr) ?? [] : [];
            const ehHoje =
              dataObj !== null &&
              dataObj.getTime() === hoje.getTime();
            return (
              <div
                key={idx}
                className={`min-h-[88px] border-b border-r border-navy-100 p-1 last:border-r-0 dark:border-dark-border ${
                  !dentro
                    ? "bg-navy-50/30 dark:bg-dark-elevated/20"
                    : ehHoje
                      ? "bg-amber-50/40 dark:bg-amber-950/20"
                      : ""
                }`}
              >
                {dentro && (
                  <>
                    <div
                      className={`mb-1 text-right text-[11px] font-medium ${
                        ehHoje
                          ? "text-amber-700 dark:text-amber-200"
                          : "text-navy-700 dark:text-gibelo-areia"
                      }`}
                    >
                      {dia}
                    </div>
                    <ul className="space-y-0.5">
                      {dosCards.slice(0, 3).map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => onAbrir(c)}
                            className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-white transition-opacity hover:opacity-80 ${c.concluidaEm ? "opacity-50 line-through" : ""}`}
                            style={{
                              backgroundColor: corPrincipalDoCard(c),
                            }}
                            title={c.titulo}
                          >
                            {c.titulo}
                          </button>
                        </li>
                      ))}
                      {dosCards.length > 3 && (
                        <li className="px-1 text-[10px] font-medium text-navy-500 dark:text-gibelo-areia">
                          + {dosCards.length - 3} mais
                        </li>
                      )}
                    </ul>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {semData.length > 0 && (
        <details className="rounded-2xl border border-navy-100 bg-white dark:border-dark-border dark:bg-dark-surface">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-navy-900 hover:bg-navy-50 dark:text-gibelo-offwhite dark:hover:bg-dark-elevated">
            Sem data ({semData.length})
          </summary>
          <ul className="space-y-1 p-3 pt-0">
            {semData.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onAbrir(c)}
                  className={`block w-full truncate rounded-md border border-navy-100 px-2 py-1 text-left text-xs font-medium text-navy-900 hover:bg-navy-50 dark:border-dark-border dark:text-gibelo-offwhite dark:hover:bg-dark-elevated ${c.concluidaEm ? "line-through opacity-60" : ""}`}
                  style={{
                    borderLeftColor: corPrincipalDoCard(c),
                    borderLeftWidth: 3,
                  }}
                >
                  {c.titulo}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
