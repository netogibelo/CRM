"use client";

import type { Deal } from "@/lib/types";
import { useResolvers } from "@/lib/crm-store";
import { formatBRL, formatDateBR, diasDesde, estaParado } from "@/lib/format";

interface DealCardProps {
  deal: Deal;
  onAbrir: (deal: Deal) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  arrastando: boolean;
}

const origemCor: Record<string, string> = {
  "Indicação de cliente": "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "Arquiteto parceiro": "bg-violet-50 text-violet-700 ring-violet-600/20",
  "Vizinho / condomínio": "bg-sky-50 text-sky-700 ring-sky-600/20",
  "Site / Instagram": "bg-amber-50 text-amber-700 ring-amber-600/20",
};
const origemCorPadrao = "bg-navy-100 text-navy-600 ring-navy-600/20";

export function DealCard({
  deal,
  onAbrir,
  onDragStart,
  onDragEnd,
  arrastando,
}: DealCardProps) {
  const { clienteNome, origemNome } = useResolvers();
  const parado = deal.status === "aberto" && estaParado(deal.atualizadoEm);
  const diasParado = diasDesde(deal.atualizadoEm);
  const nomeOrigem = origemNome(deal.origemId);

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onClick={() => onAbrir(deal)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAbrir(deal);
        }
      }}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", deal.id);
        onDragStart(deal.id);
      }}
      onDragEnd={onDragEnd}
      aria-label={`Oportunidade ${deal.projeto}, cliente ${clienteNome(
        deal.clienteId,
      )}, valor ${formatBRL(deal.valor)}. Abrir para editar.`}
      className={`group cursor-grab rounded-xl border border-navy-100 bg-white p-3.5 shadow-card transition-all hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-card-hover active:cursor-grabbing ${
        arrastando ? "opacity-40" : "opacity-100"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold leading-snug text-navy-900">
          {deal.projeto}
        </h4>
        {deal.exemplo && (
          <span
            className="shrink-0 rounded bg-navy-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-navy-400"
            title="Registro de exemplo — pode ser apagado"
          >
            exemplo
          </span>
        )}
      </div>

      <p className="mt-0.5 text-xs text-navy-500">{clienteNome(deal.clienteId)}</p>

      <p className="mt-2 text-base font-semibold text-navy-900">
        {formatBRL(deal.valor)}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
            origemCor[nomeOrigem] ?? origemCorPadrao
          }`}
        >
          {nomeOrigem}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-navy-50 pt-2.5">
        <span className="inline-flex items-center gap-1 text-xs text-navy-400">
          <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M5 1v2M11 1v2M2.5 6.5h11M3 3h10a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z"
              stroke="currentColor"
              strokeWidth="1.1"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
          {formatDateBR(deal.previsaoFechamento)}
        </span>

        {parado && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
            title={`Sem atualização há ${diasParado} dias`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
            Parado {diasParado}d
          </span>
        )}
      </div>
    </div>
  );
}
