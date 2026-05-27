"use client";

import { useState } from "react";
import type { Deal, DealInput, TipoObra } from "@/lib/types";
import {
  useClients,
  useContatos,
  useOrigins,
  usePerfis,
  useStages,
} from "@/lib/crm-store";
import { formatBRL, parseValorBRL } from "@/lib/format";
import { btnGhost, btnPrimary, inputCls, labelCls } from "@/lib/ui";
import { EQUIPE, nomeOuEmail } from "@/lib/equipe";
import { TIPOS_OBRA } from "@/lib/tipo-obra";
import { Modal } from "./Modal";
import { ClienteForm } from "./ClienteForm";
import { DealTimeline } from "./DealTimeline";
import { DealTarefas } from "./DealTarefas";
import { ComunicacaoRapida } from "./ComunicacaoRapida";
import { DealServicos } from "./DealServicos";

interface DealFormProps {
  deal: Deal | null;
  onSalvar: (input: DealInput) => void | Promise<void>;
  onClose: () => void;
  onExcluir?: (id: string) => void;
  onGanho?: (id: string) => void;
  onPerdido?: (id: string, motivo: string) => void;
  onReabrir?: (id: string) => void;
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
  const { byCliente: contatosDoCliente } = useContatos();
  const { origens } = useOrigins();
  const { ativas: etapasAtivas } = useStages();
  const { perfis } = usePerfis();

  const editando = deal !== null;
  const aberto = !editando || deal.status === "aberto";

  const [projeto, setProjeto] = useState(deal?.projeto ?? "");
  const [clienteId, setClienteId] = useState(deal?.clienteId ?? "");
  const [contatoId, setContatoId] = useState<string>(deal?.contatoId ?? "");
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
  const [responsavelEmail, setResponsavelEmail] = useState(
    deal?.responsavelEmail ?? "",
  );
  const [tipoObra, setTipoObra] = useState<TipoObra | "">(
    deal?.tipoObra ?? "",
  );
  const [areaProjeto, setAreaProjeto] = useState<string>(
    deal?.areaProjeto?.toString() ?? "",
  );
  const [cidadeObra, setCidadeObra] = useState(deal?.cidadeObra ?? "");
  const [condominio, setCondominio] = useState(deal?.condominio ?? "");

  const [modoPerda, setModoPerda] = useState(false);
  const [motivoPerda, setMotivoPerda] = useState("");
  const [novoClienteAberto, setNovoClienteAberto] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  // Quando o deal tem itens em deal_servicos, o valor é a soma deles (readonly).
  // Inicializa em 0 e o componente DealServicos reporta total + quantidade.
  const [valorServicos, setValorServicos] = useState(0);
  const [qtdServicos, setQtdServicos] = useState(0);
  const temServicos = qtdServicos > 0;
  const valorEfetivo = temServicos ? valorServicos : valor;

  // Força recarregar a timeline quando a comunicação rápida registra algo.
  const [timelineReload, setTimelineReload] = useState(0);

  const etapaSelecionada = etapasAtivas.some((s) => s.id === etapaId)
    ? etapaId
    : etapasAtivas[0]?.id ?? "";

  function validar(): boolean {
    const e: Record<string, string> = {};
    if (!projeto.trim()) e.projeto = "Informe o projeto/serviço.";
    if (!clienteId) e.cliente = "Selecione um cliente.";
    if (!valorEfetivo || valorEfetivo <= 0)
      e.valor = temServicos
        ? "Informe ao menos um serviço com valor."
        : "Informe um valor maior que zero.";
    if (!previsao) e.previsao = "Informe a data do próximo retorno.";
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validar()) return;
    const areaNum = areaProjeto.trim() ? Number(areaProjeto) : null;
    const input: DealInput = {
      projeto: projeto.trim(),
      clienteId,
      contatoId: contatoId || null,
      valor: valorEfetivo,
      origemId: origemId || origens[0]?.id || "",
      previsaoFechamento: previsao,
      etapaId: etapaSelecionada,
      status: deal?.status ?? "aberto",
      motivoPerda: deal?.motivoPerda ?? null,
      notas: notas.trim(),
      responsavelEmail: responsavelEmail || null,
      areaProjeto: areaNum && !Number.isNaN(areaNum) ? areaNum : null,
      tipoObra: tipoObra || null,
      cidadeObra: cidadeObra.trim(),
      condominio: condominio.trim(),
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
      maxWidth="max-w-3xl"
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
                  onChange={(e) => {
                    setClienteId(e.target.value);
                    setContatoId("");
                  }}
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

            {clienteId && contatosDoCliente(clienteId).length > 0 && (
              <div className="sm:col-span-2">
                <label htmlFor="contato" className={labelCls}>
                  Contato <span className="text-navy-300">(opcional)</span>
                </label>
                <select
                  id="contato"
                  value={contatoId}
                  onChange={(e) => setContatoId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Sem contato vinculado</option>
                  {contatosDoCliente(clienteId).map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.nome}
                      {ct.cargo ? ` — ${ct.cargo}` : ""}
                      {ct.principal ? " (principal)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="valor" className={labelCls}>
                Valor (R$)
              </label>
              <input
                id="valor"
                type="text"
                inputMode="numeric"
                value={valorEfetivo > 0 ? formatBRL(valorEfetivo) : ""}
                onChange={(e) => setValor(parseValorBRL(e.target.value))}
                className={`${inputCls} ${temServicos ? "bg-navy-50 text-navy-500" : ""}`}
                placeholder="R$ 0,00"
                readOnly={temServicos}
                aria-invalid={Boolean(erros.valor)}
                aria-describedby={
                  erros.valor
                    ? "erro-valor"
                    : temServicos
                      ? "hint-valor"
                      : undefined
                }
              />
              {temServicos && (
                <p id="hint-valor" className="mt-1 text-xs text-navy-400">
                  Soma de {qtdServicos} {qtdServicos === 1 ? "serviço" : "serviços"}.
                </p>
              )}
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
                Próximo retorno
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

            <div>
              <label htmlFor="responsavel" className={labelCls}>
                Responsável
              </label>
              <select
                id="responsavel"
                value={responsavelEmail}
                onChange={(e) => setResponsavelEmail(e.target.value)}
                className={inputCls}
              >
                <option value="">Sem responsável atribuído</option>
                {EQUIPE.map((m) => (
                  <option key={m.email} value={m.email}>
                    {nomeOuEmail(m.email, perfis)}
                  </option>
                ))}
              </select>
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

          {/* Dados do projeto — específico engenharia civil (Gibelo) */}
          <fieldset className="mt-5 rounded-xl border border-navy-100 p-4">
            <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-navy-500">
              Dados do projeto
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="tipoObra" className={labelCls}>
                  Tipo de obra
                </label>
                <select
                  id="tipoObra"
                  value={tipoObra}
                  onChange={(e) =>
                    setTipoObra(e.target.value as TipoObra | "")
                  }
                  className={inputCls}
                >
                  <option value="">Não especificado</option>
                  {TIPOS_OBRA.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="areaProjeto" className={labelCls}>
                  Área do projeto (m²)
                </label>
                <input
                  id="areaProjeto"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={areaProjeto}
                  onChange={(e) => setAreaProjeto(e.target.value)}
                  className={inputCls}
                  placeholder="Ex.: 250"
                />
              </div>
              <div>
                <label htmlFor="cidadeObra" className={labelCls}>
                  Cidade da obra
                </label>
                <input
                  id="cidadeObra"
                  type="text"
                  value={cidadeObra}
                  onChange={(e) => setCidadeObra(e.target.value)}
                  className={inputCls}
                  placeholder="Ex.: São Paulo - SP"
                />
              </div>
              <div>
                <label htmlFor="condominio" className={labelCls}>
                  Condomínio / Loteamento
                </label>
                <input
                  id="condominio"
                  type="text"
                  value={condominio}
                  onChange={(e) => setCondominio(e.target.value)}
                  className={inputCls}
                  placeholder="Opcional"
                />
              </div>
            </div>
          </fieldset>

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

          {editando && deal && (
            <>
              <DealServicos
                dealId={deal.id}
                onTotalChange={(total, qtd) => {
                  setValorServicos(total);
                  setQtdServicos(qtd);
                }}
              />
              <DealTarefas
                dealId={deal.id}
                responsavelDoDeal={responsavelEmail || null}
              />
              <ComunicacaoRapida
                dealId={deal.id}
                onRegistrado={() => setTimelineReload((v) => v + 1)}
              />
              <DealTimeline dealId={deal.id} reloadKey={timelineReload} />
            </>
          )}
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
