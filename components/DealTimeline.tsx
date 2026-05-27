"use client";

import { useCallback, useEffect, useState } from "react";
import type { HistoricoItem, HistoricoTipo } from "@/lib/types";
import { historicoRepository } from "@/lib/repository";
import { supabase } from "@/lib/supabase";
import { btnGhost, inputCls, labelCls } from "@/lib/ui";

interface DealTimelineProps {
  dealId: string;
  /** Incrementar este número força recarregar o histórico (após registro externo). */
  reloadKey?: number;
}

const TIPOS: { value: HistoricoTipo; label: string; cor: string }[] = [
  { value: "nota", label: "Nota", cor: "bg-navy-100 text-navy-700" },
  { value: "contato", label: "Contato", cor: "bg-sky-100 text-sky-700" },
  { value: "follow_up", label: "Follow-up", cor: "bg-amber-100 text-amber-700" },
  {
    value: "mudanca_etapa",
    label: "Mudança de etapa",
    cor: "bg-emerald-100 text-emerald-700",
  },
];

function corDoTipo(tipo: HistoricoTipo): string {
  return TIPOS.find((t) => t.value === tipo)?.cor ?? "bg-navy-100 text-navy-700";
}

function labelDoTipo(tipo: HistoricoTipo): string {
  return TIPOS.find((t) => t.value === tipo)?.label ?? tipo;
}

function formatDataHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DealTimeline({ dealId, reloadKey = 0 }: DealTimelineProps) {
  const [itens, setItens] = useState<HistoricoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [tipo, setTipo] = useState<HistoricoTipo>("nota");
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const lista = await historicoRepository.list(dealId);
      setItens(lista);
    } finally {
      setCarregando(false);
    }
  }, [dealId]);

  useEffect(() => {
    carregar();
  }, [carregar, reloadKey]);

  async function adicionar() {
    const desc = descricao.trim();
    if (!desc || salvando) return;
    setSalvando(true);
    try {
      const { data } = await supabase.auth.getUser();
      const novo = await historicoRepository.create({
        dealId,
        tipo,
        descricao: desc,
        autorEmail: data.user?.email ?? null,
      });
      setItens((prev) => [novo, ...prev]);
      setDescricao("");
      setTipo("nota");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section
      aria-label="Histórico da oportunidade"
      className="mt-6 rounded-xl border border-navy-100 bg-navy-50 p-4"
    >
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-navy-900">Histórico</h3>
        <span className="text-xs text-navy-400">
          {itens.length} {itens.length === 1 ? "registro" : "registros"}
        </span>
      </header>

      {/* Importante: NÃO usar <form> aqui — esse componente é renderizado
          dentro do <form> do DealForm. Form aninhado é HTML inválido e o
          submit propaga, fechando o modal sem salvar o histórico. */}
      <div className="mt-3 space-y-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[140px_1fr]">
          <div>
            <label htmlFor="hist-tipo" className={`${labelCls} sr-only`}>
              Tipo
            </label>
            <select
              id="hist-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as HistoricoTipo)}
              className={inputCls}
              aria-label="Tipo de registro"
            >
              {TIPOS.filter((t) => t.value !== "mudanca_etapa").map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="hist-desc" className={`${labelCls} sr-only`}>
              Descrição
            </label>
            <input
              id="hist-desc"
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  adicionar();
                }
              }}
              placeholder="O que aconteceu?"
              className={inputCls}
              aria-label="Descrição do registro"
              disabled={salvando}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={adicionar}
            disabled={!descricao.trim() || salvando}
            className={`${btnGhost} disabled:opacity-50`}
            aria-label="Adicionar registro ao histórico"
          >
            {salvando ? "Adicionando…" : "Adicionar"}
          </button>
        </div>
      </div>

      <div className="mt-4">
        {carregando ? (
          <p
            className="py-6 text-center text-xs text-navy-400"
            role="status"
            aria-live="polite"
          >
            Carregando histórico…
          </p>
        ) : itens.length === 0 ? (
          <p className="py-6 text-center text-xs text-navy-400">
            Sem registros ainda. Adicione notas, contatos ou follow-ups.
          </p>
        ) : (
          <ol className="space-y-2.5">
            {itens.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-navy-100 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${corDoTipo(
                      item.tipo,
                    )}`}
                  >
                    {labelDoTipo(item.tipo)}
                  </span>
                  <time
                    className="shrink-0 text-[11px] text-navy-400"
                    dateTime={item.criadoEm}
                  >
                    {formatDataHora(item.criadoEm)}
                  </time>
                </div>
                <p className="mt-2 text-sm text-navy-800">{item.descricao}</p>
                {item.autorEmail && (
                  <p className="mt-1 text-[11px] text-navy-400">
                    por {item.autorEmail}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
