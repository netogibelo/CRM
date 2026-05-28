"use client";

import type { OrigemResumo } from "@/lib/metrics";
import { formatPct } from "@/lib/metrics";
import { formatBRL } from "@/lib/format";

interface OriginAnalysisProps {
  origens: OrigemResumo[];
}

export function OriginAnalysis({ origens }: OriginAnalysisProps) {
  const maxValor = Math.max(1, ...origens.map((o) => o.valorGanho));
  const algumGanho = origens.some((o) => o.ganhos > 0);

  return (
    <div className="rounded-xl border border-navy-100 dark:border-dark-border bg-white dark:bg-dark-surface p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-navy-900 dark:text-gibelo-offwhite">
        De onde vêm os negócios fechados
      </h3>
      <p className="mt-0.5 text-xs text-navy-700 dark:text-gibelo-cinza-quente">
        Ordenado por valor ganho — qual origem realmente converte em receita.
      </p>

      {origens.length === 0 ? (
        <p className="mt-4 text-sm text-navy-700 dark:text-gibelo-cinza-quente">
          Nenhuma oportunidade cadastrada ainda.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {origens.map((o) => (
            <li key={o.origemId}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-navy-800 dark:text-gibelo-offwhite">
                  {o.nome}
                </span>
                <span className="text-sm font-semibold text-navy-900 dark:text-gibelo-offwhite">
                  {formatBRL(o.valorGanho)}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-navy-50 dark:bg-dark-elevated">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${Math.round((o.valorGanho / maxValor) * 100)}%`,
                  }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-navy-700 dark:text-gibelo-cinza-quente">
                <span>
                  {o.ganhos} de {o.totalLeads}{" "}
                  {o.totalLeads === 1 ? "oportunidade" : "oportunidades"}
                </span>
                <span>conversão {formatPct(o.taxa)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {origens.length > 0 && !algumGanho && (
        <p className="mt-4 rounded-lg bg-navy-50 dark:bg-dark-elevated px-3 py-2 text-xs text-navy-700 dark:text-gibelo-areia">
          Ainda não há negócios fechados. Assim que registrar ganhos, o ranking
          de origens por receita aparece aqui.
        </p>
      )}
    </div>
  );
}
