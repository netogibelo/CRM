"use client";

import { useMemo, useState } from "react";
import { useTarefas } from "@/lib/crm-store";
import { EQUIPE, nomeOuEmail } from "@/lib/equipe";
import { formatDateBR } from "@/lib/format";
import { inputCls, labelCls, btnGhost } from "@/lib/ui";
import type { Tarefa } from "@/lib/types";

interface DealTarefasProps {
  dealId: string;
  responsavelDoDeal: string | null;
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function vencida(t: Tarefa): boolean {
  return !t.concluida && t.dataVencimento < hojeISO();
}

export function DealTarefas({ dealId, responsavelDoDeal }: DealTarefasProps) {
  const { tarefas, criar, atualizar, remover } = useTarefas();
  const tarefasDoDeal = useMemo(
    () =>
      tarefas
        .filter((t) => t.dealId === dealId)
        .sort((a, b) => {
          if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
          return a.dataVencimento.localeCompare(b.dataVencimento);
        }),
    [tarefas, dealId],
  );

  const [titulo, setTitulo] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [responsavel, setResponsavel] = useState(responsavelDoDeal ?? "");
  const [salvando, setSalvando] = useState(false);

  async function adicionar() {
    const t = titulo.trim();
    if (!t || !vencimento || salvando) return;
    setSalvando(true);
    try {
      await criar({
        dealId,
        titulo: t,
        descricao: "",
        responsavelEmail: responsavel || null,
        dataVencimento: vencimento,
        concluida: false,
        concluidaEm: null,
      });
      setTitulo("");
      setVencimento("");
    } finally {
      setSalvando(false);
    }
  }

  async function toggle(t: Tarefa) {
    await atualizar(t.id, { concluida: !t.concluida });
  }

  return (
    <section
      aria-label="Tarefas da oportunidade"
      className="mt-4 rounded-xl border border-navy-100 bg-navy-50 p-4"
    >
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-navy-900">Tarefas</h3>
        <span className="text-xs text-navy-400">
          {tarefasDoDeal.filter((t) => !t.concluida).length} abertas
        </span>
      </header>

      {/* Importante: NÃO usar <form> aqui (está dentro do form do DealForm). */}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_160px_auto]">
        <div>
          <label htmlFor="tarefa-titulo" className={`${labelCls} sr-only`}>
            Título
          </label>
          <input
            id="tarefa-titulo"
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Nova tarefa (ex.: ligar para o cliente)"
            className={inputCls}
            aria-label="Título da tarefa"
            disabled={salvando}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                adicionar();
              }
            }}
          />
        </div>
        <div>
          <label htmlFor="tarefa-vencimento" className={`${labelCls} sr-only`}>
            Vencimento
          </label>
          <input
            id="tarefa-vencimento"
            type="date"
            value={vencimento}
            onChange={(e) => setVencimento(e.target.value)}
            className={inputCls}
            aria-label="Data de vencimento"
            disabled={salvando}
          />
        </div>
        <div>
          <label htmlFor="tarefa-resp" className={`${labelCls} sr-only`}>
            Responsável
          </label>
          <select
            id="tarefa-resp"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            className={inputCls}
            aria-label="Responsável pela tarefa"
            disabled={salvando}
          >
            <option value="">Sem responsável</option>
            {EQUIPE.map((m) => (
              <option key={m.email} value={m.email}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={adicionar}
          disabled={!titulo.trim() || !vencimento || salvando}
          className={`${btnGhost} disabled:opacity-50`}
          aria-label="Adicionar tarefa"
        >
          {salvando ? "Salvando…" : "Adicionar"}
        </button>
      </div>

      <ul className="mt-3 space-y-2">
        {tarefasDoDeal.length === 0 ? (
          <li className="py-3 text-center text-xs text-navy-400">
            Nenhuma tarefa ainda.
          </li>
        ) : (
          tarefasDoDeal.map((t) => {
            const venc = vencida(t);
            return (
              <li
                key={t.id}
                className={`flex items-center gap-3 rounded-lg border bg-white px-3 py-2 ${
                  venc
                    ? "border-red-200 bg-red-50/30"
                    : "border-navy-100"
                }`}
              >
                <input
                  type="checkbox"
                  checked={t.concluida}
                  onChange={() => toggle(t)}
                  className="h-4 w-4 rounded border-navy-300 text-navy-900 focus:ring-navy-500"
                  aria-label={`Marcar tarefa "${t.titulo}" como ${t.concluida ? "pendente" : "concluída"}`}
                />
                <div className="flex-1">
                  <p
                    className={`text-sm ${
                      t.concluida
                        ? "text-navy-400 line-through"
                        : "text-navy-900"
                    }`}
                  >
                    {t.titulo}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-navy-500">
                    <span
                      className={
                        venc ? "font-semibold text-red-600" : undefined
                      }
                    >
                      {venc ? "Vencida " : "Vence "}
                      {formatDateBR(t.dataVencimento)}
                    </span>
                    {t.responsavelEmail && (
                      <span>· {nomeOuEmail(t.responsavelEmail)}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remover(t.id)}
                  className="text-xs text-navy-400 transition-colors hover:text-red-600"
                  aria-label={`Remover tarefa "${t.titulo}"`}
                >
                  Remover
                </button>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
