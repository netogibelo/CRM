"use client";

import { useState } from "react";
import type { AtividadeCard, CardCor, AtividadeLista } from "@/lib/types";
import { CARD_CORES } from "@/lib/atividade-cores";
import { btnGhost, btnPrimary, inputCls, labelCls } from "@/lib/ui";
import { Modal } from "./Modal";
import { AtividadeChecklistSection } from "./AtividadeChecklistSection";
import { AtividadeEtiquetasSection } from "./AtividadeEtiquetasSection";

export interface CardFormData {
  listaId: string;
  titulo: string;
  descricao: string;
  cor: CardCor | null;
  data: string | null;
  valorEstimado: number | null;
  fornecedor: string;
  numeroNF: string;
  metragem: number | null;
}

interface AtividadeCardFormProps {
  card: AtividadeCard | null;
  listaIdInicial: string;
  listas: AtividadeLista[];
  onSalvar: (data: CardFormData) => void | Promise<void>;
  onClose: () => void;
  onExcluir?: (id: string) => void;
}

export function AtividadeCardForm({
  card,
  listaIdInicial,
  listas,
  onSalvar,
  onClose,
  onExcluir,
}: AtividadeCardFormProps) {
  const editando = card !== null;
  const [titulo, setTitulo] = useState(card?.titulo ?? "");
  const [descricao, setDescricao] = useState(card?.descricao ?? "");
  const [cor, setCor] = useState<CardCor | null>(card?.cor ?? null);
  const [data, setData] = useState(card?.data ?? "");
  const [listaId, setListaId] = useState(card?.listaId ?? listaIdInicial);
  const [erro, setErro] = useState("");
  // Campos personalizados (F3) — armazenados como strings no form, convertidos no submit.
  const [valorEstimado, setValorEstimado] = useState(
    card?.valorEstimado !== null && card?.valorEstimado !== undefined
      ? String(card.valorEstimado)
      : "",
  );
  const [fornecedor, setFornecedor] = useState(card?.fornecedor ?? "");
  const [numeroNF, setNumeroNF] = useState(card?.numeroNF ?? "");
  const [metragem, setMetragem] = useState(
    card?.metragem !== null && card?.metragem !== undefined
      ? String(card.metragem)
      : "",
  );
  const temCamposPreenchidos = Boolean(
    card?.valorEstimado || card?.fornecedor || card?.numeroNF || card?.metragem,
  );
  const [dadosAbertos, setDadosAbertos] = useState(temCamposPreenchidos);

  function parseNumero(v: string): number | null {
    const t = v.trim().replace(",", ".");
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!titulo.trim()) {
      setErro("Informe o título do card.");
      return;
    }
    await onSalvar({
      listaId,
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      cor,
      data: data || null,
      valorEstimado: parseNumero(valorEstimado),
      fornecedor: fornecedor.trim(),
      numeroNF: numeroNF.trim(),
      metragem: parseNumero(metragem),
    });
  }

  return (
    <Modal
      titulo={editando ? "Editar card" : "Novo card"}
      onClose={onClose}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          <div>
            <label htmlFor="card-titulo" className={labelCls}>
              Título
            </label>
            <input
              id="card-titulo"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className={inputCls}
              placeholder="O que precisa ser feito?"
              aria-invalid={Boolean(erro)}
              aria-describedby={erro ? "erro-card-titulo" : undefined}
            />
            {erro && (
              <p id="erro-card-titulo" className="mt-1 text-sm text-red-600">
                {erro}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="card-desc" className={labelCls}>
              Descrição <span className="text-navy-500 dark:text-gibelo-areia">(opcional)</span>
            </label>
            <textarea
              id="card-desc"
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className={inputCls}
              placeholder="Detalhes da tarefa…"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="card-data" className={labelCls}>
                Data <span className="text-navy-500 dark:text-gibelo-areia">(opcional)</span>
              </label>
              <input
                id="card-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="card-lista" className={labelCls}>
                Lista
              </label>
              <select
                id="card-lista"
                value={listaId}
                onChange={(e) => setListaId(e.target.value)}
                className={inputCls}
              >
                {listas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {card && (
            <div className="rounded-lg border border-navy-100 bg-navy-50/40 p-3 dark:border-dark-border dark:bg-dark-elevated/30">
              <AtividadeEtiquetasSection cardId={card.id} />
            </div>
          )}

          {card && (
            <div className="rounded-lg border border-navy-100 bg-navy-50/40 p-3 dark:border-dark-border dark:bg-dark-elevated/30">
              <AtividadeChecklistSection cardId={card.id} />
            </div>
          )}

          <div className="rounded-lg border border-navy-100 bg-navy-50/40 dark:border-dark-border dark:bg-dark-elevated/30">
            <button
              type="button"
              onClick={() => setDadosAbertos((v) => !v)}
              aria-expanded={dadosAbertos}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-white/60 dark:hover:bg-dark-surface/40"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-navy-700 dark:text-gibelo-areia">
                Dados adicionais
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                aria-hidden="true"
                className={`transition-transform ${dadosAbertos ? "rotate-180" : ""} text-navy-700 dark:text-gibelo-areia`}
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {dadosAbertos && (
              <div className="grid grid-cols-2 gap-3 px-3 pb-3">
                <div>
                  <label htmlFor="card-valor" className={labelCls}>
                    Valor estimado (R$)
                  </label>
                  <input
                    id="card-valor"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={valorEstimado}
                    onChange={(e) => setValorEstimado(e.target.value)}
                    className={inputCls}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label htmlFor="card-metragem" className={labelCls}>
                    Metragem (m²)
                  </label>
                  <input
                    id="card-metragem"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={metragem}
                    onChange={(e) => setMetragem(e.target.value)}
                    className={inputCls}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label htmlFor="card-fornec" className={labelCls}>
                    Fornecedor
                  </label>
                  <input
                    id="card-fornec"
                    type="text"
                    value={fornecedor}
                    onChange={(e) => setFornecedor(e.target.value)}
                    className={inputCls}
                    placeholder="Empresa ou pessoa"
                  />
                </div>
                <div>
                  <label htmlFor="card-nf" className={labelCls}>
                    Número da NF
                  </label>
                  <input
                    id="card-nf"
                    type="text"
                    value={numeroNF}
                    onChange={(e) => setNumeroNF(e.target.value)}
                    className={inputCls}
                    placeholder="000123"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <span className={labelCls}>Etiqueta de cor</span>
            <div className="mt-2 flex flex-row flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCor(null)}
                aria-label="Sem cor"
                aria-pressed={cor === null}
                className={`h-7 w-7 shrink-0 rounded-full border-2 border-dashed border-navy-300 transition ${
                  cor === null ? "ring-2 ring-navy-500 ring-offset-2" : ""
                }`}
              />
              {CARD_CORES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCor(c.id)}
                  aria-label={c.nome}
                  aria-pressed={cor === c.id}
                  className={`h-7 w-7 shrink-0 rounded-full ${c.swatch} transition ${
                    cor === c.id ? "ring-2 ring-navy-500 ring-offset-2" : ""
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {editando && onExcluir && (
              <button
                type="button"
                onClick={() => card && onExcluir(card.id)}
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
              {editando ? "Salvar" : "Criar card"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
