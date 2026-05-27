// Motor de execução das automações — funções puras (sem side effects de UI).
//
// Chamado pelo crm-store nos pontos onde gatilhos podem disparar:
//   - depois de criar um deal (gatilho deal_criado)
//   - depois de atualizar um deal quando a etapa mudou (gatilho deal_entra_etapa)

import type {
  Automacao,
  ConfigCriarTarefa,
  ConfigRegistrarNota,
  Deal,
  HistoricoInput,
  TarefaInput,
} from "./types";
import { historicoRepository, tarefaRepository } from "./repository";

function dataPlusDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Resolve "mesmo_do_deal" pra responsável do deal, ou retorna o email literal. */
function resolverResponsavel(config: string, deal: Deal): string | null {
  if (config === "mesmo_do_deal") return deal.responsavelEmail ?? null;
  return config || null;
}

export async function executarAutomacao(
  automacao: Automacao,
  deal: Deal,
): Promise<void> {
  if (!automacao.ativa) return;

  if (automacao.acao === "criar_tarefa") {
    const cfg = automacao.configuracao as ConfigCriarTarefa;
    const input: TarefaInput = {
      dealId: deal.id,
      titulo: cfg.tituloTarefa,
      descricao: `Criada automaticamente por: ${automacao.nome}`,
      responsavelEmail: resolverResponsavel(cfg.responsavel, deal),
      dataVencimento: dataPlusDias(cfg.prazoEmDias ?? 3),
      concluida: false,
      concluidaEm: null,
    };
    await tarefaRepository.create(input).catch(() => null);
    return;
  }

  if (automacao.acao === "registrar_nota") {
    const cfg = automacao.configuracao as ConfigRegistrarNota;
    const input: HistoricoInput = {
      dealId: deal.id,
      tipo: "nota",
      descricao: cfg.texto,
      autorEmail: null,
    };
    await historicoRepository.create(input).catch(() => null);
  }
}

/**
 * Filtra automações que devem disparar para um evento específico.
 *
 * - deal_criado: dispara para qualquer deal_criado ativa
 * - deal_entra_etapa: dispara só se config.etapaId === etapaAtual
 */
export function selecionarAutomacoes(
  automacoes: Automacao[],
  evento:
    | { tipo: "deal_criado" }
    | { tipo: "deal_entra_etapa"; etapaId: string },
): Automacao[] {
  return automacoes.filter((a) => {
    if (!a.ativa) return false;
    if (evento.tipo === "deal_criado") return a.gatilho === "deal_criado";
    if (evento.tipo === "deal_entra_etapa" && a.gatilho === "deal_entra_etapa") {
      const cfg = a.configuracao as { etapaId?: string };
      return cfg.etapaId === evento.etapaId;
    }
    return false;
  });
}
