"use client";

import { useMemo, useState } from "react";
import type { Cliente, ClienteInput } from "@/lib/types";
import { useClients } from "@/lib/crm-store";
import { btnPrimary, inputCls } from "@/lib/ui";
import { ClienteForm } from "./ClienteForm";

export function ClientesView() {
  const { clientes, criar, atualizar, remover, emUso } = useClients();
  const [busca, setBusca] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Cliente | null>(null);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const lista = [...clientes].sort((a, b) => a.nome.localeCompare(b.nome));
    if (!q) return lista;
    return lista.filter((c) =>
      [c.nome, c.email, c.telefone].some((v) => v.toLowerCase().includes(q)),
    );
  }, [clientes, busca]);

  async function salvar(input: ClienteInput) {
    if (emEdicao) await atualizar(emEdicao.id, input);
    else await criar(input);
    setFormAberto(false);
    setEmEdicao(null);
  }

  async function excluir(id: string) {
    const alvo = clientes.find((c) => c.id === id);
    if (!window.confirm(`Excluir o cliente "${alvo?.nome ?? ""}"?`)) return;
    const r = await remover(id);
    if (!r.ok) {
      window.alert(r.erro);
      return;
    }
    setFormAberto(false);
    setEmEdicao(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone…"
          aria-label="Buscar clientes"
          className={`${inputCls} mt-0 sm:max-w-xs`}
        />
        <button
          type="button"
          onClick={() => {
            setEmEdicao(null);
            setFormAberto(true);
          }}
          className={btnPrimary}
        >
          + Novo cliente
        </button>
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-navy-200 bg-white px-6 py-12 text-center text-sm text-navy-400">
          {clientes.length === 0
            ? "Nenhum cliente cadastrado ainda."
            : "Nenhum cliente encontrado para a busca."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((c) => {
            const usos = emUso(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setEmEdicao(c);
                    setFormAberto(true);
                  }}
                  className="flex w-full flex-col rounded-xl border border-navy-100 bg-white p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-card-hover"
                  aria-label={`Editar cliente ${c.nome}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-navy-900">
                      {c.nome}
                    </span>
                    {c.exemplo && (
                      <span className="shrink-0 rounded bg-navy-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-navy-400">
                        exemplo
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-navy-500">
                    {c.telefone && <p>{c.telefone}</p>}
                    {c.email && <p className="truncate">{c.email}</p>}
                    {!c.telefone && !c.email && (
                      <p className="text-navy-300">Sem contato cadastrado</p>
                    )}
                  </div>
                  <span className="mt-3 inline-flex w-fit items-center rounded-full bg-navy-50 px-2 py-0.5 text-[11px] font-medium text-navy-500">
                    {usos} {usos === 1 ? "oportunidade" : "oportunidades"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {formAberto && (
        <ClienteForm
          cliente={emEdicao}
          onSalvar={salvar}
          onClose={() => {
            setFormAberto(false);
            setEmEdicao(null);
          }}
          onExcluir={excluir}
        />
      )}
    </div>
  );
}
