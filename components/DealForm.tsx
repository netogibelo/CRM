"use client";

import { useState } from "react";
import type { Deal, DealInput } from "@/lib/types";
import { useClients, useOrigins, useStages } from "@/lib/crm-store";
import { formatBRL } from "@/lib/format";
import { btnGhost, btnPrimary, inputCls, labelCls } from "@/lib/ui";
import { Modal } from "./Modal";
import { ClienteForm } from "./ClienteForm";

interface DealFormProps {
  deal: Deal | null;
  onSalvar: (input: DealInput) => void | Promise<void>;
  onClose: () => void;
  onExcluir?: (id: string) => void;
  onGanho?: (id: string) => void;
  onPerdido?: (id: string, motivo: string) => void;
  onReabrir?: (id: string) => void;
}

function digitosParaValor(raw: string): number {
  const digitos = raw.replace(/\D/g, "");
  if (!digitos) return 0;
  return Number(digitos) / 100;
}

export function DealForm({
  deal,
  onSalvar,
  onClose,
  onExcluir,
  onGanho,
  onPerdido,
  onReabrir,
}: DealFormProps) {
  const { clientes, criar: criarCliente } = useClients();
  const { origens } = useOrigins();
  const { ativas: etapasAtivas } = useStages();

  const editando = deal !== null;
  const aberto = !editando || deal.status === "aberto";

  const [projeto, setProjeto] = useState(deal?.projeto ?? "");
  const [clienteId, setClienteId] = useState(deal?.clienteId ?? "");
  const [valor, setValor] = useState<number>(deal?.valor ?? 0);
  const [origemId, setOrigemId] = useState(
    deal?.origemId ?? origens[0]?.id ?? "",
  );
  const [previsao, setPrevisao] = useState(
    deal?.previsaoFechamento?.slice(0, 10) ?? "",
  );
  const [etapaId, setEtapaId] = useState(
    deal?.etapaId ?? etapasAtivas[0]?.id ?? "",
  );
  const [notas, setNotas] = useState(deal?.notas ?? "");

  const [modoPerda, setModoPerda] = useState(false);
  const [motivoPerda, setMotivoPerda] = useState("");
  const [novoClienteAberto, setNovoClienteAberto] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  const etapaSelecionada = etapasAtivas.some((s) => s.id === etapaId)
    ? etapaId
    : etapasAtivas[0]?.id ?? "";

  function validar(): boolean {
    const e: Record<string, string> = {};
    if (!projeto.trim()) e.projeto = "Informe o projeto/serviço.";
    if (!clienteId) e.cliente = "Selecione um cliente.";
    if (!valor || valor <= 0) e.valor = "Informe um valor maior que zero.";
    if (!previsao) e.previsao = "Informe a previsão de fechamento.";
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validar()) return;
    const input: DealInput = {
      projeto: projeto.trim(),
      clienteId,
      valor,
      origemId: origemId || origens[0]?.id || "",
      previsaoFechamento: previsao,
      etapaId: etapaSelecionada,
      status: deal?.status ?? "aberto",
      motivoPerda: deal?.motivoPerda ?? null,
      notas: notas.trim(),
      exemplo: deal?.exemplo,
    };
    await onSalvar(input);
  }

  function confirmarPerda() {
    if (!motivoPerda.trim()) {
      setErros({ motivo: "Descreva o motivo da perda." });
      return;
    }
    if (deal && onPerdido) onPerdido(deal.id, motivoPerda.trim());
  }

  return (
    <Modal
      titulo={editando ? "Editar oportunidade" : "Nova oportunidade"}
      descricao={
        editando
          ? "Atualize os dados ou registre o desfecho do negócio."
          : "Cadastre uma nova oportunidade no funil."
      }
      onClose={onClose}
    >
      {modoPerda ? (
        <div>
          <p className="text-sm text-navy-600">
            Marcar <strong>{deal?.projeto}</strong> como perdido. Registre o
            motivo da perda para análise futura.
          </p>
          <label htmlFor="motivo" className={`${labelCls} mt-4`}>
            Motivo da perda
          </label>
          <textarea
            id="motivo"
            rows={3}
            value={motivoPerda}
            onChange={(e) => setMotivoPerda(e.target.value)}
            className={inputCls}
            placeholder="Ex.: cliente optou por outro fornecedor, orçamento acima do previsto…"
            aria-invalid={Boolean(erros.motivo)}
            aria-describedby={erros.motivo ? "erro-motivo" : undefined}
          />
          {erros.motivo && (
            <p id="erro-motivo" className="mt-1 text-sm text-red-600">
              {erros.motivo}
            </p>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setModoPerda(false);
                setErros({});
              }}
              className={btnGhost}
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={confirmarPerda}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              Confirmar perda
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="projeto" className={labelCls}>
                Projeto/Serviço
              </label>
              <input
                id="projeto"
                type="text"
                value={projeto}
                onChange={(e) => setProjeto(e.target.value)}
                className={inputCls}
                placeholder="Ex.: Residência Alphaville — projeto completo"
                aria-invalid={Boolean(erros.projeto)}
                aria-describedby={erros.projeto ? "erro-projeto" : undefined}
              />
              {erros.projeto && (
                <p id="erro-projeto" className="mt-1 text-sm text-red-600">
                  {erros.projeto}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="cliente" className={labelCls}>
                Cliente
              </label>
              <div className="mt-1 flex gap-2">
                <select
                  id="cliente"
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className={`${inputCls} mt-0 flex-1`}
                  aria-invalid={Boolean(erros.cliente)}
                  aria-describedby={erros.cliente ? "erro-cliente" : undefined}
                >
                  <option value="">Selecione um cliente…</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setNovoClienteAberto(true)}
                  className="shrink-0 rounded-lg border border-navy-200 px-3 py-2 text-sm font-semibold text-navy-700 transition-colors hover:bg-navy-50"
                  aria-label="Cadastrar novo cliente"
                >
                  + Novo
                </button>
              </div>
              {erros.cliente && (
                <p id="erro-cliente" className="mt-1 text-sm text-red-600">
                  {erros.cliente}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="valor" className={labelCls}>
                Valor (R$)
              </label>
              <input
                id="valor"
                type="text"
                inputMode="numeric"
                value={valor > 0 ? formatBRL(valor) : ""}
                onChange={(e) => setValor(digitosParaValor(e.target.value))}
                className={inputCls}
                placeholder="R$ 0,00"
                aria-invalid={Boolean(erros.valor)}
                aria-describedby={erros.valor ? "erro-valor" : undefined}
              />
              {erros.valor && (
                <p id="erro-valor" className="mt-1 text-sm text-red-600">
                  {erros.valor}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="origem" className={labelCls}>
                Origem
              </label>
              <select
                id="origem"
                value={origemId}
                onChange={(e) => setOrigemId(e.target.value)}
                className={inputCls}
              >
                {origens.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="previsao" className={labelCls}>
                Previsão de fechamento
              </label>
              <input
                id="previsao"
                type="date"
                value={previsao}
                onChange={(e) => setPrevisao(e.target.value)}
                className={inputCls}
                aria-invalid={Boolean(erros.previsao)}
                aria-describedby={erros.previsao ? "erro-previsao" : undefined}
              />
              {erros.previsao && (
                <p id="erro-previsao" className="mt-1 text-sm text-red-600">
                  {erros.previsao}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="etapa" className={labelCls}>
                Etapa do funil
              </label>
              <select
                id="etapa"
                value={etapaSelecionada}
                onChange={(e) => setEtapaId(e.target.value)}
                className={inputCls}
                disabled={!aberto}
              >
                {etapasAtivas.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
              {!aberto && (
                <p className="mt-1 text-xs text-navy-400">
                  Reabra a oportunidade para mudar de etapa.
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="notas" className={labelCls}>
                Notas
              </label>
              <textarea
                id="notas"
                rows={3}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className={inputCls}
                placeholder="Anotações sobre o andamento da negociação…"
              />
            </div>
          </div>

          {editando && aberto && (
            <div className="mt-5 flex flex-wrap gap-2 rounded-lg bg-navy-50 p-3">
              <span className="w-full text-xs font-semibold uppercase tracking-wide text-navy-400">
                Desfecho
              </span>
              <button
                type="button"
                onClick={() => deal && onGanho?.(deal.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M3 8.5l3.5 3.5L13 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Marcar como ganho
              </button>
              <button
                type="button"
                onClick={() => setModoPerda(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                Marcar como perdido
              </button>
            </div>
          )}

          {editando && !aberto && (
            <div className="mt-5 flex flex-wrap items-center gap-2 rounded-lg bg-navy-50 p-3">
              <span className="w-full text-xs font-semibold uppercase tracking-wide text-navy-400">
                {deal.status === "ganho" ? "Negócio ganho" : "Negócio perdido"}
              </span>
              {deal.status === "perdido" && deal.motivoPerda && (
                <p className="w-full text-sm text-navy-600">
                  Motivo: {deal.motivoPerda}
                </p>
              )}
              <button
                type="button"
                onClick={() => deal && onReabrir?.(deal.id)}
                className="rounded-lg border border-navy-200 bg-white px-3 py-1.5 text-sm font-semibold text-navy-700 transition-colors hover:bg-navy-100"
              >
                Reabrir oportunidade
              </button>
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {editando && (
                <button
                  type="button"
                  onClick={() => deal && onExcluir?.(deal.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  Excluir
                </button>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" onClick={onClose} className={btnGhost}>
                Cancelar
              </button>
              <button type="submit" className={btnPrimary}>
                {editando ? "Salvar alterações" : "Criar oportunidade"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Popup de cadastro rápido de cliente — não fecha o modal da oportunidade */}
      {novoClienteAberto && (
        <ClienteForm
          cliente={null}
          rapido
          onClose={() => setNovoClienteAberto(false)}
          onSalvar={async (input) => {
            const c = await criarCliente(input);
            setClienteId(c.id);
            setErros((e) => ({ ...e, cliente: "" }));
            setNovoClienteAberto(false);
          }}
        />
      )}
    </Modal>
  );
}
