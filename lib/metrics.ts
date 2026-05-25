// Cálculo das métricas do dashboard a partir das oportunidades, das etapas
// (com probabilidade editável) e das origens cadastradas. Funções puras.

import type { Deal, Etapa, Origem } from "./types";
import { ordenarEtapas, getProbabilidade } from "./stages";
import { estaParado } from "./format";

export interface ConversaoEtapa {
  deOrigemId: string;
  deNome: string;
  paraNome: string;
  base: number;
  avancaram: number;
  taxa: number;
}

export interface OrigemResumo {
  origemId: string;
  nome: string;
  totalLeads: number;
  ganhos: number;
  valorGanho: number;
  taxa: number;
}

export interface Metrics {
  totalNaMesa: number;
  valorPonderado: number;
  abertas: number;
  ganhosQtd: number;
  ganhosValor: number;
  perdidosQtd: number;
  taxaFechamento: number;
  valorMedio: number;
  paradas: number;
  conversoes: ConversaoEtapa[];
  origens: OrigemResumo[];
}

export function calcularMetrics(
  deals: Deal[],
  etapas: Etapa[],
  origens: Origem[],
): Metrics {
  const etapasOrd = ordenarEtapas(etapas);

  const abertos = deals.filter((d) => d.status === "aberto");
  const ganhos = deals.filter((d) => d.status === "ganho");
  const perdidos = deals.filter((d) => d.status === "perdido");

  const totalNaMesa = abertos.reduce((acc, d) => acc + d.valor, 0);
  const valorPonderado = abertos.reduce(
    (acc, d) => acc + d.valor * getProbabilidade(etapas, d.etapaId),
    0,
  );
  const ganhosValor = ganhos.reduce((acc, d) => acc + d.valor, 0);

  const decididos = ganhos.length + perdidos.length;
  const taxaFechamento = decididos > 0 ? ganhos.length / decididos : 0;
  const valorMedio = ganhos.length > 0 ? ganhosValor / ganhos.length : 0;
  const paradas = abertos.filter((d) => estaParado(d.atualizadoEm)).length;

  // Profundidade alcançada por cada deal (funil cumulativo, sem histórico).
  const indiceAlcancado = (deal: Deal): number => {
    if (deal.status === "ganho") return etapasOrd.length - 1;
    const idx = etapasOrd.findIndex((e) => e.id === deal.etapaId);
    return idx === -1 ? 0 : idx;
  };
  const alcancaram = etapasOrd.map(
    (_, i) => deals.filter((d) => indiceAlcancado(d) >= i).length,
  );

  const conversoes: ConversaoEtapa[] = [];
  for (let i = 0; i < etapasOrd.length - 1; i++) {
    const base = alcancaram[i];
    const avancaram = alcancaram[i + 1];
    conversoes.push({
      deOrigemId: etapasOrd[i].id,
      deNome: etapasOrd[i].nome,
      paraNome: etapasOrd[i + 1].nome,
      base,
      avancaram,
      taxa: base > 0 ? avancaram / base : 0,
    });
  }

  const origensResumo: OrigemResumo[] = origens
    .map((o) => {
      const daOrigem = deals.filter((d) => d.origemId === o.id);
      const ganhosOrigem = daOrigem.filter((d) => d.status === "ganho");
      const valorGanho = ganhosOrigem.reduce((acc, d) => acc + d.valor, 0);
      return {
        origemId: o.id,
        nome: o.nome,
        totalLeads: daOrigem.length,
        ganhos: ganhosOrigem.length,
        valorGanho,
        taxa: daOrigem.length > 0 ? ganhosOrigem.length / daOrigem.length : 0,
      };
    })
    .filter((o) => o.totalLeads > 0)
    .sort((a, b) => b.valorGanho - a.valorGanho || b.ganhos - a.ganhos);

  return {
    totalNaMesa,
    valorPonderado,
    abertas: abertos.length,
    ganhosQtd: ganhos.length,
    ganhosValor,
    perdidosQtd: perdidos.length,
    taxaFechamento,
    valorMedio,
    paradas,
    conversoes,
    origens: origensResumo,
  };
}

/** Formata uma taxa 0..1 como percentual pt-BR: 0.25 → "25%". */
export function formatPct(taxa: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(taxa);
}
