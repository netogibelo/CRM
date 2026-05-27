"use client";

import type { Deal } from "@/lib/types";
import { useResolvers, useTarefas } from "@/lib/crm-store";
import { activationProps, dragProps } from "@/lib/dnd";
import { formatBRL, formatDateBR, diasDesde, estaParado } from "@/lib/format";
import { iniciaisOuFallback, nomeOuEmail } from "@/lib/equipe";
import { abrevTipoObra } from "@/lib/tipo-obra";
import { ExemploBadge } from "./ExemploBadge";

interface DealCardProps {
  deal: Deal;
  onAbrir: (deal: Deal) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  arrastando: boolean;
}

// Cores semânticas para as origens padrão; origens criadas pelo usuário recebem
// uma cor estável derivada do id (não se perde ao renomear).
const origemCorPorNome: Record<string, string> = {
  "Indicação de cliente": "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "Arquiteto parceiro": "bg-violet-50 text-violet-700 ring-violet-600/20",
  "Vizinho / condomínio": "bg-sky-50 text-sky-700 ring-sky-600/20",
  "Site / Instagram": "bg-amber-50 text-amber-700 ring-amber-600/20",
};
const origemPaleta = [
  "bg-rose-50 text-rose-700 ring-rose-600/20",
  "bg-teal-50 text-teal-700 ring-teal-600/20",
  "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  "bg-navy-100 text-navy-600 ring-navy-600/20",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function origemClasse(nome: string, id: string): string {
  return origemCorPorNome[nome] ?? origemPaleta[hash(id) % origemPaleta.length];
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DealCard({
  deal,
  onAbrir,
  onDragStart,
  onDragEnd,
  arrastando,
}: DealCardProps) {
  const { clienteNome, origemNome } = useResolvers();
  const { tarefas } = useTarefas();
  const parado = deal.status === "aberto" && estaParado(deal.atualizadoEm);
  const diasParado = diasDesde(deal.atualizadoEm);
  const nomeOrigem = origemNome(deal.origemId);

  const tarefasDoDeal = tarefas.filter((t) => t.dealId === deal.id);
  const tarefasVencidas = tarefasDoDeal.filter(
    (t) => !t.concluida && t.dataVencimento < hojeISO(),
  ).length;
  const tarefasAbertas = tarefasDoDeal.filter((t) => !t.concluida).length;

  const tipoObraAbrev = abrevTipoObra(deal.tipoObra);
  const localExibir = deal.cidadeObra || deal.condominio || "";

  return (
    <div
      {...activationProps(() => onAbrir(deal))}
      {...dragProps(deal.id, onDragStart, onDragEnd)}
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
        {deal.exemplo && <ExemploBadge />}
      </div>

      <p className="mt-0.5 text-xs text-navy-500">{clienteNome(deal.clienteId)}</p>

      <p className="mt-2 text-base font-semibold text-navy-900">
        {formatBRL(deal.valor)}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${origemClasse(
            nomeOrigem,
            deal.origemId,
          )}`}
        >
          {nomeOrigem}
        </span>
        {tipoObraAbrev && (
          <span className="inline-flex items-center rounded-full bg-navy-50 px-2 py-0.5 text-[11px] font-medium text-navy-600 ring-1 ring-inset ring-navy-200">
            {tipoObraAbrev}
          </span>
        )}
        {localExibir && (
          <span className="text-[11px] text-navy-400" title={localExibir}>
            · {localExibir}
          </span>
        )}
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

        <div className="flex items-center gap-1.5">
          {tarefasVencidas > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700"
              title={`${tarefasVencidas} tarefa(s) vencida(s)`}
              aria-label={`${tarefasVencidas} tarefas vencidas`}
            >
              ⚠ {tarefasVencidas}
            </span>
          )}
          {tarefasVencidas === 0 && tarefasAbertas > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700"
              title={`${tarefasAbertas} tarefa(s) aberta(s)`}
              aria-label={`${tarefasAbertas} tarefas abertas`}
            >
              ☐ {tarefasAbertas}
            </span>
          )}
          {parado && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
              title={`Sem atualização há ${diasParado} dias`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-amber-500"
                aria-hidden="true"
              />
              Parado {diasParado}d
            </span>
          )}
          {deal.responsavelEmail && (
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-900 text-[9px] font-bold text-white"
              title={nomeOuEmail(deal.responsavelEmail)}
              aria-label={`Responsável: ${nomeOuEmail(deal.responsavelEmail)}`}
            >
              {iniciaisOuFallback(deal.responsavelEmail)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
