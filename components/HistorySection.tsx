"use client";

import type { Deal } from "@/lib/types";
import { useResolvers } from "@/lib/crm-store";
import { formatBRL, formatTimestampBR } from "@/lib/format";

interface HistorySectionProps {
  ganhos: Deal[];
  perdidos: Deal[];
  onAbrir: (deal: Deal) => void;
}

function HistoricoItem({
  deal,
  onAbrir,
  tipo,
}: {
  deal: Deal;
  onAbrir: (deal: Deal) => void;
  tipo: "ganho" | "perdido";
}) {
  const { clienteNome, origemNome } = useResolvers();
  return (
    <li>
      <button
        type="button"
        onClick={() => onAbrir(deal)}
        className="w-full rounded-xl border border-navy-100 dark:border-dark-border bg-white dark:bg-dark-surface p-3.5 text-left transition-colors hover:border-navy-200 dark:hover:border-gibelo-areia/40 hover:bg-navy-50 dark:hover:bg-dark-elevated"
        aria-label={`${deal.projeto}, ${formatBRL(deal.valor)}. Abrir detalhes.`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-navy-900 dark:text-gibelo-offwhite">
              {deal.projeto}
            </p>
            <p className="mt-0.5 text-xs text-navy-700 dark:text-gibelo-areia">
              {clienteNome(deal.clienteId)}
            </p>
          </div>
          <p
            className={`shrink-0 text-sm font-bold ${
              tipo === "ganho" ? "text-emerald-600" : "text-navy-700 dark:text-gibelo-areia"
            }`}
          >
            {formatBRL(deal.valor)}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-navy-700 dark:text-gibelo-areia">
          <span>{origemNome(deal.origemId)}</span>
          <span aria-hidden="true">•</span>
          <span>{formatTimestampBR(deal.atualizadoEm)}</span>
        </div>
        {tipo === "perdido" && deal.motivoPerda && (
          <p className="mt-2 rounded-lg bg-navy-50 dark:bg-dark-elevated px-2.5 py-1.5 text-xs text-navy-700 dark:text-gibelo-areia">
            <span className="font-medium">Motivo:</span> {deal.motivoPerda}
          </p>
        )}
      </button>
    </li>
  );
}

export function HistorySection({
  ganhos,
  perdidos,
  onAbrir,
}: HistorySectionProps) {
  const totalGanho = ganhos.reduce((acc, d) => acc + d.valor, 0);
  const totalPerdido = perdidos.reduce((acc, d) => acc + d.valor, 0);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <section aria-label="Negócios ganhos">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900 dark:text-gibelo-offwhite">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
            Ganhos ({ganhos.length})
          </h3>
          <span className="text-sm font-semibold text-emerald-600">
            {formatBRL(totalGanho)}
          </span>
        </div>
        {ganhos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-navy-200 dark:border-dark-border bg-white dark:bg-dark-surface px-4 py-8 text-center text-sm text-navy-700 dark:text-gibelo-areia">
            Nenhum negócio ganho ainda.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {ganhos.map((d) => (
              <HistoricoItem key={d.id} deal={d} onAbrir={onAbrir} tipo="ganho" />
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Negócios perdidos">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900 dark:text-gibelo-offwhite">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" aria-hidden="true" />
            Perdidos ({perdidos.length})
          </h3>
          <span className="text-sm font-semibold text-navy-700 dark:text-gibelo-areia">
            {formatBRL(totalPerdido)}
          </span>
        </div>
        {perdidos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-navy-200 dark:border-dark-border bg-white dark:bg-dark-surface px-4 py-8 text-center text-sm text-navy-700 dark:text-gibelo-areia">
            Nenhum negócio perdido registrado.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {perdidos.map((d) => (
              <HistoricoItem
                key={d.id}
                deal={d}
                onAbrir={onAbrir}
                tipo="perdido"
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
