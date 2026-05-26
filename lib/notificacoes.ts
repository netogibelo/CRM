// Regras de notificação de deals parados.
//
// Modelo: cada etapa tem um threshold (em dias) derivado da sua probabilidade.
// Etapas com alta probabilidade (negociação) precisam de atenção mais rápida
// que etapas iniciais; etapas medianas (qualificação, proposta) toleram mais.
//
// Mapeamento (alinhado ao briefing):
//   probabilidade ≥ 0.6  → 7 dias  (ex.: negociação)
//   probabilidade < 0.2  → 7 dias  (ex.: lead frio precisa ser puxado)
//   0.2 ≤ prob < 0.6     → 14 dias (proposta, qualificação)

import type { Deal, Etapa } from "./types";
import { diasDesde } from "./format";

const VISTAS_KEY = "gibelo-crm-notificacoes-vistas";

export interface Notificacao {
  dealId: string;
  projeto: string;
  etapaNome: string;
  diasParado: number;
  limite: number;
  atualizadoEm: string;
}

export function limitePorEtapa(etapa: Etapa | undefined): number {
  if (!etapa) return 14;
  if (etapa.probabilidade >= 0.6) return 7;
  if (etapa.probabilidade < 0.2) return 7;
  return 14;
}

export function calcularNotificacoes(
  deals: Deal[],
  etapas: Etapa[],
): Notificacao[] {
  const mapaEtapa = new Map(etapas.map((e) => [e.id, e]));
  const lista: Notificacao[] = [];
  for (const d of deals) {
    if (d.status !== "aberto") continue;
    const etapa = mapaEtapa.get(d.etapaId);
    if (etapa?.final) continue;
    const limite = limitePorEtapa(etapa);
    const dias = diasDesde(d.atualizadoEm);
    if (dias > limite) {
      lista.push({
        dealId: d.id,
        projeto: d.projeto,
        etapaNome: etapa?.nome ?? "—",
        diasParado: dias,
        limite,
        atualizadoEm: d.atualizadoEm,
      });
    }
  }
  return lista.sort((a, b) => b.diasParado - a.diasParado);
}

/** Lê o mapa de notificações já vistas: { dealId: timestamp_atualizadoEm_quando_visto }. */
export function lerVistas(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(VISTAS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Marca uma notificação como vista — fica oculta até o deal ser tocado de novo. */
export function marcarComoVisto(dealId: string, atualizadoEm: string): void {
  if (typeof window === "undefined") return;
  const atual = lerVistas();
  atual[dealId] = atualizadoEm;
  window.localStorage.setItem(VISTAS_KEY, JSON.stringify(atual));
}

/** Filtra notificações já vistas. Uma vista expira se o deal foi atualizado depois. */
export function filtrarNaoVistas(
  todas: Notificacao[],
  vistas: Record<string, string>,
): Notificacao[] {
  return todas.filter((n) => {
    const tsVisto = vistas[n.dealId];
    if (!tsVisto) return true;
    return new Date(n.atualizadoEm).getTime() > new Date(tsVisto).getTime();
  });
}
