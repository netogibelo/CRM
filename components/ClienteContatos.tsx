"use client";

import { useState } from "react";
import type { Contato, ContatoInput } from "@/lib/types";
import { useContatos } from "@/lib/crm-store";
import { btnGhost, inputCls, labelCls } from "@/lib/ui";

interface Props {
  clienteId: string;
}

export function ClienteContatos({ clienteId }: Props) {
  const { byCliente, criar, atualizar, remover } = useContatos();
  const contatos = byCliente(clienteId);

  const [adicionando, setAdicionando] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Contato | null>(null);

  async function excluir(c: Contato) {
    if (!window.confirm(`Excluir o contato "${c.nome}"?`)) return;
    const r = await remover(c.id);
    if (!r.ok) window.alert(r.erro);
  }

  return (
    <section className="mt-5 rounded-xl border border-navy-100 dark:border-dark-border p-4">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-navy-700 dark:text-gibelo-areia">
          Contatos
          <span className="ml-2 rounded-full bg-navy-100 dark:bg-dark-elevated px-2 py-0.5 text-[11px] font-medium text-navy-700 dark:text-gibelo-areia">
            {contatos.length}
          </span>
        </h3>
        {!adicionando && !emEdicao && (
          <button
            type="button"
            onClick={() => setAdicionando(true)}
            className="rounded-lg border border-navy-200 dark:border-dark-border px-3 py-1.5 text-xs font-semibold text-navy-700 dark:text-gibelo-offwhite transition-colors hover:bg-navy-50 dark:hover:bg-dark-elevated dark:bg-dark-elevated"
            aria-label="Adicionar novo contato"
          >
            + Adicionar
          </button>
        )}
      </header>

      {contatos.length === 0 && !adicionando && (
        <p className="rounded-lg border border-dashed border-navy-200 dark:border-dark-border dark:border-dark-border bg-navy-50 dark:bg-dark-elevated/50 px-3 py-4 text-center text-xs text-navy-700 dark:text-gibelo-cinza-quente">
          Nenhum contato cadastrado.
        </p>
      )}

      <ul className="space-y-2">
        {contatos.map((c) =>
          emEdicao?.id === c.id ? (
            <li key={c.id}>
              <ContatoForm
                clienteId={clienteId}
                contato={c}
                onSalvar={async (input) => {
                  await atualizar(c.id, input);
                  setEmEdicao(null);
                }}
                onCancelar={() => setEmEdicao(null)}
              />
            </li>
          ) : (
            <li
              key={c.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-navy-100 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-navy-900 dark:text-gibelo-offwhite">
                    {c.nome}
                  </span>
                  {c.principal && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      Principal
                    </span>
                  )}
                  {c.cargo && (
                    <span className="text-xs text-navy-700 dark:text-gibelo-areia">— {c.cargo}</span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-navy-700 dark:text-gibelo-areia">
                  {c.telefone && <span>{c.telefone}</span>}
                  {c.email && <span className="truncate">{c.email}</span>}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setEmEdicao(c)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-navy-700 dark:text-gibelo-areia transition-colors hover:bg-navy-50 dark:hover:bg-dark-elevated dark:bg-dark-elevated"
                  aria-label={`Editar contato ${c.nome}`}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => excluir(c)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                  aria-label={`Excluir contato ${c.nome}`}
                >
                  Excluir
                </button>
              </div>
            </li>
          ),
        )}
      </ul>

      {adicionando && (
        <div className="mt-3">
          <ContatoForm
            clienteId={clienteId}
            contato={null}
            onSalvar={async (input) => {
              await criar(input);
              setAdicionando(false);
            }}
            onCancelar={() => setAdicionando(false)}
          />
        </div>
      )}
    </section>
  );
}

interface ContatoFormProps {
  clienteId: string;
  contato: Contato | null;
  onSalvar: (input: ContatoInput) => void | Promise<void>;
  onCancelar: () => void;
}

function ContatoForm({
  clienteId,
  contato,
  onSalvar,
  onCancelar,
}: ContatoFormProps) {
  const [nome, setNome] = useState(contato?.nome ?? "");
  const [cargo, setCargo] = useState(contato?.cargo ?? "");
  const [telefone, setTelefone] = useState(contato?.telefone ?? "");
  const [email, setEmail] = useState(contato?.email ?? "");
  const [principal, setPrincipal] = useState(contato?.principal ?? false);
  const [erro, setErro] = useState("");

  async function submit() {
    if (!nome.trim()) {
      setErro("Informe o nome do contato.");
      return;
    }
    await onSalvar({
      clienteId,
      nome: nome.trim(),
      cargo: cargo.trim(),
      telefone: telefone.trim(),
      email: email.trim(),
      principal,
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-navy-200 dark:border-dark-border bg-navy-50 dark:bg-dark-elevated/50 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`ct-nome-${contato?.id ?? "novo"}`} className={labelCls}>
            Nome
          </label>
          <input
            id={`ct-nome-${contato?.id ?? "novo"}`}
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={inputCls}
            placeholder="Nome do contato"
          />
          {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
        </div>
        <div>
          <label htmlFor={`ct-cargo-${contato?.id ?? "novo"}`} className={labelCls}>
            Cargo <span className="text-navy-500 dark:text-gibelo-cinza-quente">(opcional)</span>
          </label>
          <input
            id={`ct-cargo-${contato?.id ?? "novo"}`}
            type="text"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            className={inputCls}
            placeholder="Ex.: Arquiteto, Sócio"
          />
        </div>
        <div>
          <label htmlFor={`ct-tel-${contato?.id ?? "novo"}`} className={labelCls}>
            Telefone <span className="text-navy-500 dark:text-gibelo-cinza-quente">(opcional)</span>
          </label>
          <input
            id={`ct-tel-${contato?.id ?? "novo"}`}
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className={inputCls}
            placeholder="(11) 90000-0000"
          />
        </div>
        <div>
          <label htmlFor={`ct-email-${contato?.id ?? "novo"}`} className={labelCls}>
            E-mail <span className="text-navy-500 dark:text-gibelo-cinza-quente">(opcional)</span>
          </label>
          <input
            id={`ct-email-${contato?.id ?? "novo"}`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="contato@email.com"
          />
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-navy-700 dark:text-gibelo-offwhite">
        <input
          type="checkbox"
          checked={principal}
          onChange={(e) => setPrincipal(e.target.checked)}
          className="h-4 w-4 rounded border-navy-300 text-navy-900 dark:text-gibelo-offwhite focus:ring-navy-500"
          aria-label="Marcar como contato principal"
        />
        Contato principal
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancelar} className={btnGhost}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-800"
        >
          {contato ? "Salvar" : "Adicionar"}
        </button>
      </div>
    </div>
  );
}
