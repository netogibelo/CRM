"use client";

import { useState } from "react";
import type { AtividadeCard, CardCor, AtividadeLista } from "@/lib/types";
import { CARD_CORES } from "@/lib/atividade-cores";
import { btnGhost, btnPrimary, inputCls, labelCls } from "@/lib/ui";
import { Modal } from "./Modal";

export interface CardFormData {
  listaId: string;
  titulo: string;
  descricao: string;
  cor: CardCor | null;
  data: string | null;
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
    });
  }

  return (
    <Modal
      titulo={editando ? "Editar card" : "Novo card"}
      onClose={onClose}
      maxWidth="max-w-md"
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
              Descrição <span className="text-navy-300">(opcional)</span>
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
                Data <span className="text-navy-300">(opcional)</span>
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

          <div>
            <span className={labelCls}>Etiqueta de cor</span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCor(null)}
                aria-label="Sem cor"
                aria-pressed={cor === null}
                className={`h-7 w-7 rounded-full border-2 border-dashed border-navy-300 transition ${
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
                  className={`h-7 w-7 rounded-full ${c.swatch} transition ${
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
