// Regras de notificação:
//   1. Deals parados (sem atividade por mais que o limite da etapa)
//   2. Próximo retorno vencido (data passou e deal continua aberto)
//   3. Tarefas vencidas (data_vencimento < hoje e ainda não concluída)
//
// "Última atividade" prefere o evento mais recente no histórico (incluindo a
// auto-registrada mudança de etapa); fallback para deal.atualizadoEm.

import type {
  AtividadeChecklistItem,
  CardAlerta,
  Deal,
  Etapa,
  HistoricoItem,
  Meta,
  Perfil,
  Tarefa,
} from "./types";
import { diasDesde } from "./format";
import { nomeOuEmail } from "./equipe";
import { mesAtual, metaEmRisco, resumoMetaMes } from "./metas";

const VISTAS_KEY = "gibelo-crm-notificacoes-vistas";

export type TipoNotificacao =
  | "parado"
  | "retorno_vencido"
  | "tarefa_vencida"
  | "meta_risco"
  | "atividade_vencida"
  | "atividade_vencendo_hoje";

export interface Notificacao {
  /** id estável: tipo + dealId/tarefaId/cardId, pra persistir "visto" sem colidir. */
  id: string;
  tipo: TipoNotificacao;
  dealId: string;
  /** Populado para atividade_vencida / atividade_vencendo_hoje. */
  cardId?: string;
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
  /** Para resolver nome de exibição do responsável. */
  perfis?: Perfil[];
  /** Metas mensais — usado para o alerta "Meta em risco". */
  metas?: Meta[];
  /** Cards do quadro de atividades — gera alertas de vencimento. */
  cards?: CardAlerta[];
  /** Itens de checklist (flat) — enriquece o detalhe dos cards vencidos. */
  checklistItems?: AtividadeChecklistItem[];
}

export function calcularNotificacoes(input: CalcularInput): Notificacao[] {
  const {
    deals,
    etapas,
    historicoPorDeal,
    tarefas,
    perfis = [],
    metas = [],
    cards = [],
    checklistItems = [],
  } = input;
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
    const resp = nomeOuEmail(t.responsavelEmail, perfis);
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

  // 4. Meta do mês em risco (segunda quinzena + <50% atingido)
  const mes = mesAtual();
  const resumo = resumoMetaMes(metas, deals, mes);
  if (metaEmRisco(resumo)) {
    out.push({
      id: `meta-risco:${mes}`,
      tipo: "meta_risco",
      dealId: "",
      projeto: "Meta do mês",
      detalhe: `${Math.round(resumo.percentual)}% atingido na segunda quinzena`,
      severidade: "alerta",
      marcadorTempo: mes,
    });
  }

  // 5. Atividades vencidas / vencendo hoje
  if (cards.length > 0) {
    const chkMap = new Map<string, AtividadeChecklistItem[]>();
    for (const item of checklistItems) {
      const arr = chkMap.get(item.cardId);
      if (arr) arr.push(item);
      else chkMap.set(item.cardId, [item]);
    }
    for (const c of cards) {
      if (c.concluidaEm) continue;
      if (!c.dataVencimento) continue;
      const itens = chkMap.get(c.id) ?? [];
      const total = itens.length;
      const concluidos = itens.filter((i) => i.concluida).length;
      const checkInfo =
        total > 0 && concluidos < total
          ? ` · ${concluidos}/${total} subtarefas`
          : "";
      if (c.dataVencimento < hoje) {
        const dias = diasDesde(`${c.dataVencimento}T00:00:00`);
        out.push({
          id: `atividade:${c.id}`,
          tipo: "atividade_vencida",
          dealId: "",
          cardId: c.id,
          projeto: c.titulo,
          detalhe: `Venceu há ${dias}d${checkInfo}`,
          severidade: "vencido",
          marcadorTempo: c.dataVencimento,
        });
      } else if (c.dataVencimento === hoje) {
        out.push({
          id: `atividade-hoje:${c.id}`,
          tipo: "atividade_vencendo_hoje",
          dealId: "",
          cardId: c.id,
          projeto: c.titulo,
          detalhe: `Vence hoje${checkInfo}`,
          severidade: "alerta",
          marcadorTempo: c.dataVencimento,
        });
      }
    }
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
