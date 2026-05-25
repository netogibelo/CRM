"use client";

import { useState } from "react";
import type { Cliente, ClienteInput } from "@/lib/types";
import { Modal } from "./Modal";
import { btnGhost, btnPrimary, inputCls, labelCls } from "@/lib/ui";

interface ClienteFormProps {
  cliente: Cliente | null;
  onSalvar: (input: ClienteInput) => void | Promise<void>;
  onClose: () => void;
  onExcluir?: (id: string) => void;
  /** Modo cadastro rápido (apenas nome + telefone). */
  rapido?: boolean;
}

export function ClienteForm({
  cliente,
  onSalvar,
  onClose,
  onExcluir,
  rapido = false,
}: ClienteFormProps) {
  const editando = cliente !== null;
  const [nome, setNome] = useState(cliente?.nome ?? "");
  const [telefone, setTelefone] = useState(cliente?.telefone ?? "");
  const [email, setEmail] = useState(cliente?.email ?? "");
  const [observacoes, setObservacoes] = useState(cliente?.observacoes ?? "");
  const [erro, setErro] = useState("");

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!nome.trim()) {
      setErro("Informe o nome do cliente.");
      return;
    }
    await onSalvar({
      nome: nome.trim(),
      telefone: telefone.trim(),
      email: email.trim(),
      observacoes: observacoes.trim(),
      exemplo: cliente?.exemplo,
    });
  }

  return (
    <Modal
      titulo={rapido ? "Novo cliente" : editando ? "Editar cliente" : "Novo cliente"}
      descricao={
        rapido
          ? "Cadastro rápido — você pode completar os dados depois na aba Clientes."
          : undefined
      }
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          <div>
            <label htmlFor="cli-nome" className={labelCls}>
              Nome
            </label>
            <input
              id="cli-nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={inputCls}
              placeholder="Nome do cliente"
              aria-invalid={Boolean(erro)}
              aria-describedby={erro ? "erro-cli-nome" : undefined}
            />
            {erro && (
              <p id="erro-cli-nome" className="mt-1 text-sm text-red-600">
                {erro}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="cli-tel" className={labelCls}>
              Telefone {!rapido && <span className="text-navy-300">(opcional)</span>}
            </label>
            <input
              id="cli-tel"
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className={inputCls}
              placeholder="(11) 90000-0000"
            />
          </div>

          {!rapido && (
            <>
              <div>
                <label htmlFor="cli-email" className={labelCls}>
                  E-mail <span className="text-navy-300">(opcional)</span>
                </label>
                <input
                  id="cli-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  placeholder="cliente@email.com"
                />
              </div>
              <div>
                <label htmlFor="cli-obs" className={labelCls}>
                  Observações <span className="text-navy-300">(opcional)</span>
                </label>
                <textarea
                  id="cli-obs"
                  rows={3}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className={inputCls}
                  placeholder="Anotações sobre o cliente…"
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {editando && !rapido && onExcluir && (
              <button
                type="button"
                onClick={() => cliente && onExcluir(cliente.id)}
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
              {editando ? "Salvar" : "Criar cliente"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
