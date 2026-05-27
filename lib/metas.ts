// Helpers de meta mensal de vendas.

import type { Deal, Meta } from "./types";

/** Retorna o mês atual no formato YYYY-MM (timezone local). */
export function mesAtual(date: Date = new Date()): string {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
}

/** Soma o valor de deals ganhos cujo atualizadoEm cai dentro do mês YYYY-MM. */
export function valorGanhoNoMes(deals: Deal[], mes: string): number {
  return deals
    .filter((d) => d.status === "ganho")
    .filter((d) => (d.atualizadoEm ?? "").slice(0, 7) === mes)
    .reduce((acc, d) => acc + d.valor, 0);
}

export interface ResumoMeta {
  /** Mês no formato YYYY-MM. */
  mes: string;
  /** Meta configurada (0 se não houver). */
  valorMeta: number;
  /** Valor já fechado no mês. */
  valorAtual: number;
  /** Quanto falta (nunca negativo). */
  faltante: number;
  /** Percentual atingido (0..∞). 0 se não houver meta. */
  percentual: number;
}

export function resumoMetaMes(
  metas: Meta[],
  deals: Deal[],
  mes: string = mesAtual(),
): ResumoMeta {
  const meta = metas.find((m) => m.mes === mes);
  const valorMeta = meta?.valorMeta ?? 0;
  const valorAtual = valorGanhoNoMes(deals, mes);
  const faltante = Math.max(0, valorMeta - valorAtual);
  const percentual = valorMeta > 0 ? (valorAtual / valorMeta) * 100 : 0;
  return { mes, valorMeta, valorAtual, faltante, percentual };
}

/** Indica se a data atual está na segunda quinzena (dia >= 16) do mês corrente. */
export function ehSegundaQuinzena(date: Date = new Date()): boolean {
  return date.getDate() >= 16;
}

/** Risco de meta: segunda quinzena E meta configurada E <50% atingido. */
export function metaEmRisco(resumo: ResumoMeta, date: Date = new Date()): boolean {
  if (resumo.valorMeta <= 0) return false;
  if (!ehSegundaQuinzena(date)) return false;
  return resumo.percentual < 50;
}
