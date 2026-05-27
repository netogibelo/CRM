"use client";

import { useState } from "react";
import { useAutomacoes, useStages } from "@/lib/crm-store";
import { EQUIPE } from "@/lib/equipe";
import { btnGhost, btnPrimary, inputCls, labelCls } from "@/lib/ui";
import type {
  Automacao,
  AutomacaoAcao,
  AutomacaoGatilho,
  ConfigCriarTarefa,
  ConfigRegistrarNota,
} from "@/lib/types";

interface NovaAutomacao {
  nome: string;
  gatilho: AutomacaoGatilho;
  etapaId: string;
  acao: AutomacaoAcao;
  tituloTarefa: string;
  prazoEmDias: number;
  responsavel: string;
  textoNota: string;
}

const VAZIA: NovaAutomacao = {
  nome: "",
  gatilho: "deal_entra_etapa",
  etapaId: "",
  acao: "criar_tarefa",
  tituloTarefa: "",
  prazoEmDias: 3,
  responsavel: "mesmo_do_deal",
  textoNota: "",
};

function descrever(a: Automacao, nomeEtapa: (id: string) => string): string {
  const gat =
    a.gatilho === "deal_criado"
      ? "Quando um deal é criado"
      : `Quando deal entra em "${nomeEtapa(
          (a.configuracao as { etapaId?: string }).etapaId ?? "",
        )}"`;
  if (a.acao === "criar_tarefa") {
    const c = a.configuracao as ConfigCriarTarefa;
    return `${gat} → criar tarefa "${c.tituloTarefa}" (prazo ${c.prazoEmDias}d, responsável: ${
      c.responsavel === "mesmo_do_deal" ? "mesmo do deal" : c.responsavel
    })`;
  }
  const c = a.configuracao as ConfigRegistrarNota;
  return `${gat} → registrar nota: "${c.texto}"`;
}

export function AutomacoesSection() {
  const { automacoes, criar, atualizar, remover } = useAutomacoes();
  const { etapas } = useStages();
  const [novo, setNovo] = useState<NovaAutomacao>(VAZIA);
  const [salvando, setSalvando] = useState(false);

  function nomeEtapa(id: string): string {
    return etapas.find((e) => e.id === id)?.nome ?? "—";
  }

  async function adicionar() {
    if (!novo.nome.trim() || salvando) return;
    if (novo.gatilho === "deal_entra_etapa" && !novo.etapaId) return;
    if (novo.acao === "criar_tarefa" && !novo.tituloTarefa.trim()) return;
    if (novo.acao === "registrar_nota" && !novo.textoNota.trim()) return;

    setSalvando(true);
    try {
      const configuracao =
        novo.acao === "criar_tarefa"
          ? ({
              etapaId:
                novo.gatilho === "deal_entra_etapa" ? novo.etapaId : undefined,
              tituloTarefa: novo.tituloTarefa.trim(),
              prazoEmDias: novo.prazoEmDias || 1,
              responsavel: novo.responsavel || "mesmo_do_deal",
            } satisfies ConfigCriarTarefa)
          : ({
              etapaId:
                novo.gatilho === "deal_entra_etapa" ? novo.etapaId : undefined,
              texto: novo.textoNota.trim(),
            } satisfies ConfigRegistrarNota);

      await criar({
        nome: novo.nome.trim(),
        gatilho: novo.gatilho,
        acao: novo.acao,
        configuracao,
        ativa: true,
      });
      setNovo(VAZIA);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section
      aria-label="Automações"
      className="rounded-2xl border border-navy-100 bg-navy-50/40 p-4 sm:p-5"
    >
      <h2 className="text-sm font-semibold text-navy-900">Automações</h2>
      <p className="mt-0.5 text-xs text-navy-400">
        Regras que disparam ações quando algo acontece com um deal. Executadas
        quando você arrasta um deal entre colunas ou cria um novo.
      </p>

      {/* Lista existentes */}
      <ul className="mt-4 space-y-2">
        {automacoes.length === 0 ? (
          <li className="py-3 text-center text-xs text-navy-400">
            Nenhuma automação cadastrada.
          </li>
        ) : (
          automacoes.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-lg border border-navy-100 bg-white p-3"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-navy-900">{a.nome}</p>
                <p className="mt-0.5 text-xs text-navy-500">
                  {descrever(a, nomeEtapa)}
                </p>
              </div>
              <label className="flex shrink-0 items-center gap-1.5 text-xs text-navy-600">
                <input
                  type="checkbox"
                  checked={a.ativa}
                  onChange={() => atualizar(a.id, { ativa: !a.ativa })}
                  className="h-4 w-4 rounded border-navy-300 text-navy-900 focus:ring-navy-500"
                  aria-label={`${a.ativa ? "Desativar" : "Ativar"} automação ${a.nome}`}
                />
                Ativa
              </label>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Excluir automação "${a.nome}"?`)) remover(a.id);
                }}
                className="text-xs text-navy-400 transition-colors hover:text-red-600"
                aria-label={`Excluir automação ${a.nome}`}
              >
                Excluir
              </button>
            </li>
          ))
        )}
      </ul>

      {/* Form nova automação */}
      <div className="mt-4 rounded-lg border border-dashed border-navy-200 bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">
          Nova automação
        </p>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="auto-nome" className={labelCls}>
              Nome
            </label>
            <input
              id="auto-nome"
              type="text"
              value={novo.nome}
              onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
              className={inputCls}
              placeholder="Ex.: Follow-up automático após proposta"
            />
          </div>

          <div>
            <label htmlFor="auto-gatilho" className={labelCls}>
              Gatilho
            </label>
            <select
              id="auto-gatilho"
              value={novo.gatilho}
              onChange={(e) =>
                setNovo({
                  ...novo,
                  gatilho: e.target.value as AutomacaoGatilho,
                })
              }
              className={inputCls}
            >
              <option value="deal_entra_etapa">Deal entra em uma etapa</option>
              <option value="deal_criado">Deal é criado</option>
            </select>
          </div>

          {novo.gatilho === "deal_entra_etapa" && (
            <div>
              <label htmlFor="auto-etapa" className={labelCls}>
                Etapa
              </label>
              <select
                id="auto-etapa"
                value={novo.etapaId}
                onChange={(e) => setNovo({ ...novo, etapaId: e.target.value })}
                className={inputCls}
              >
                <option value="">Selecione…</option>
                {etapas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="auto-acao" className={labelCls}>
              Ação
            </label>
            <select
              id="auto-acao"
              value={novo.acao}
              onChange={(e) =>
                setNovo({ ...novo, acao: e.target.value as AutomacaoAcao })
              }
              className={inputCls}
            >
              <option value="criar_tarefa">Criar tarefa</option>
              <option value="registrar_nota">Registrar nota</option>
            </select>
          </div>

          {novo.acao === "criar_tarefa" && (
            <>
              <div>
                <label htmlFor="auto-titulo" className={labelCls}>
                  Título da tarefa
                </label>
                <input
                  id="auto-titulo"
                  type="text"
                  value={novo.tituloTarefa}
                  onChange={(e) =>
                    setNovo({ ...novo, tituloTarefa: e.target.value })
                  }
                  className={inputCls}
                  placeholder="Ex.: Follow-up da proposta"
                />
              </div>
              <div>
                <label htmlFor="auto-prazo" className={labelCls}>
                  Prazo (dias)
                </label>
                <input
                  id="auto-prazo"
                  type="number"
                  min={1}
                  value={novo.prazoEmDias}
                  onChange={(e) =>
                    setNovo({
                      ...novo,
                      prazoEmDias: Number(e.target.value) || 1,
                    })
                  }
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="auto-resp" className={labelCls}>
                  Responsável da tarefa
                </label>
                <select
                  id="auto-resp"
                  value={novo.responsavel}
                  onChange={(e) =>
                    setNovo({ ...novo, responsavel: e.target.value })
                  }
                  className={inputCls}
                >
                  <option value="mesmo_do_deal">Mesmo do deal</option>
                  {EQUIPE.map((m) => (
                    <option key={m.email} value={m.email}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {novo.acao === "registrar_nota" && (
            <div className="sm:col-span-2">
              <label htmlFor="auto-nota" className={labelCls}>
                Texto da nota
              </label>
              <input
                id="auto-nota"
                type="text"
                value={novo.textoNota}
                onChange={(e) => setNovo({ ...novo, textoNota: e.target.value })}
                className={inputCls}
                placeholder="Ex.: Cliente entrou em fase de negociação"
              />
            </div>
          )}
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setNovo(VAZIA)}
            className={btnGhost}
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={adicionar}
            disabled={salvando || !novo.nome.trim()}
            className={`${btnPrimary} disabled:opacity-50`}
          >
            {salvando ? "Criando…" : "Criar automação"}
          </button>
        </div>
      </div>
    </section>
  );
}
