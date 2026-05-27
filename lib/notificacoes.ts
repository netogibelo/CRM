// Regras de notificação:
//   1. Deals parados (sem atividade por mais que o limite da etapa)
//   2. Próximo retorno vencido (data passou e deal continua aberto)
//   3. Tarefas vencidas (data_vencimento < hoje e ainda não concluída)
//
// "Última atividade" prefere o evento mais recente no histórico (incluindo a
// auto-registrada mudança de etapa); fallback para deal.atualizadoEm.

import type { Deal, Etapa, HistoricoItem, Tarefa } from "./types";
import { diasDesde } from "./format";
import { nomeOuEmail } from "./equipe";

const VISTAS_KEY = "gibelo-crm-notificacoes-vistas";

export type TipoNotificacao = "parado" | "retorno_vencido" | "tarefa_vencida";

export interface Notificacao {
  /** id estável: tipo + dealId/tarefaId, pra persistir "visto" sem colidir. */
  id: string;
  tipo: TipoNotificacao;
  dealId: string;
  projeto: string;
  /** Texto detalhe (etapa, vencimento). */
  detalhe: string;
  /** Severidade — "alerta" (atenção) ou "vencido" (urgente). */
  severidade: "alerta" | "vencido";
  /** Carimbo de tempo usado para "expirar" a marcação de visto. */
  marcadorTempo: string;
}

export function limitePorEtapa(etapa: Etapa | undefined): number {
  if (!etapa) return 14;
  if (etapa.probabilidade >= 0.6) return 7;
  if (etapa.probabilidade < 0.2) return 7;
  return 14;
}

/**
 * Calcula a "última atividade" de um deal:
 * - se houver entrada no histórico (incluindo auto-mudança de etapa), pega a
 *   mais recente
 * - fallback: deal.atualizadoEm
 * - fallback do fallback: deal.criadoEm (evita NaN se atualizadoEm vier ruim)
 */
function ultimaAtividade(
  deal: Deal,
  historicoPorDeal: Map<string, HistoricoItem[]>,
): string {
  const hist = historicoPorDeal.get(deal.id);
  if (hist && hist.length > 0) {
    return hist[0].criadoEm;
  }
  return deal.atualizadoEm || deal.criadoEm;
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface CalcularInput {
  deals: Deal[];
  etapas: Etapa[];
  /** Mapa dealId → histórico ordenado por criadoEm desc (já filtrado). */
  historicoPorDeal: Map<string, HistoricoItem[]>;
  tarefas: Tarefa[];
}

export function calcularNotificacoes(input: CalcularInput): Notificacao[] {
  const { deals, etapas, historicoPorDeal, tarefas } = input;
  const mapaEtapa = new Map(etapas.map((e) => [e.id, e]));
  const hoje = hojeISO();
  const out: Notificacao[] = [];

  // 1. Deals parados
  for (const d of deals) {
    if (d.status !== "aberto") continue;
    const etapa = mapaEtapa.get(d.etapaId);
    if (etapa?.final) continue;
    const limite = limitePorEtapa(etapa);
    const ultima = ultimaAtividade(d, historicoPorDeal);
    const dias = diasDesde(ultima);
    if (dias > limite) {
      out.push({
        id: `parado:${d.id}`,
        tipo: "parado",
        dealId: d.id,
        projeto: d.projeto,
        detalhe: `${etapa?.nome ?? "—"} · parado há ${dias}d (limite ${limite}d)`,
        severidade: "alerta",
        marcadorTempo: ultima,
      });
    }
  }

  // 2. Próximo retorno vencido
  for (const d of deals) {
    if (d.status !== "aberto") continue;
    if (!d.previsaoFechamento) continue;
    if (d.previsaoFechamento < hoje) {
      const dias = diasDesde(`${d.previsaoFechamento}T00:00:00`);
      out.push({
        id: `retorno:${d.id}`,
        tipo: "retorno_vencido",
        dealId: d.id,
        projeto: d.projeto,
        detalhe: `Retorno previsto venceu há ${dias}d`,
        severidade: "vencido",
        marcadorTempo: d.previsaoFechamento,
      });
    }
  }

  // 3. Tarefas vencidas (não concluídas)
  for (const t of tarefas) {
    if (t.concluida) continue;
    if (t.dataVencimento >= hoje) continue;
    const dias = diasDesde(`${t.dataVencimento}T00:00:00`);
    const deal = deals.find((d) => d.id === t.dealId);
    if (!deal) continue;
    const resp = nomeOuEmail(t.responsavelEmail);
    out.push({
      id: `tarefa:${t.id}`,
      tipo: "tarefa_vencida",
      dealId: t.dealId,
      projeto: deal.projeto,
      detalhe: `Tarefa "${t.titulo}" venceu há ${dias}d${
        t.responsavelEmail ? ` · ${resp}` : ""
      }`,
      severidade: "vencido",
      marcadorTempo: t.dataVencimento,
    });
  }

  // Ordenação: vencidos antes, depois mais antigos primeiro.
  return out.sort((a, b) => {
    if (a.severidade !== b.severidade) {
      return a.severidade === "vencido" ? -1 : 1;
    }
    return a.marcadorTempo.localeCompare(b.marcadorTempo);
  });
}

/** Lê o mapa de notificações já vistas: { notificacaoId: marcadorTempo_quando_visto }. */
export function lerVistas(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(VISTAS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Marca uma notificação como vista — expira se o marcadorTempo for renovado. */
export function marcarComoVisto(
  notificacaoId: string,
  marcadorTempo: string,
): void {
  if (typeof window === "undefined") return;
  const atual = lerVistas();
  atual[notificacaoId] = marcadorTempo;
  window.localStorage.setItem(VISTAS_KEY, JSON.stringify(atual));
}

export function filtrarNaoVistas(
  todas: Notificacao[],
  vistas: Record<string, string>,
): Notificacao[] {
  return todas.filter((n) => {
    const tsVisto = vistas[n.id];
    if (!tsVisto) return true;
    return n.marcadorTempo > tsVisto;
  });
}
