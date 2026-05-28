"use client";

import { useEffect, useState } from "react";
import type { AtividadeHistoricoItem } from "@/lib/types";
import { atividadeHistoricoRepository } from "@/lib/repository";
import { usePerfis } from "@/lib/crm-store";
import { nomeOuEmail } from "@/lib/equipe";

interface Props {
  cardId: string;
}

const ICONES: Record<AtividadeHistoricoItem["tipo"], string> = {
  criacao: "✨",
  movimentacao: "↔",
  conclusao: "✓",
  reabertura: "↻",
  edicao: "✏",
  comentario: "💬",
  checklist: "☑",
  etiqueta: "🏷",
};

function formatRelativo(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AtividadeHistoricoSection({ cardId }: Props) {
  const { perfis } = usePerfis();
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState<AtividadeHistoricoItem[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setCarregando(true);
    atividadeHistoricoRepository
      .listByCard(cardId)
      .then(setItens)
      .catch(() => setItens([]))
      .finally(() => setCarregando(false));
  }, [aberto, cardId]);

  return (
    <section aria-label="Histórico">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left hover:bg-white/60 dark:hover:bg-dark-surface/40"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-navy-700 dark:text-gibelo-areia">
          Histórico
          {itens.length > 0 && (
            <span className="ml-2 rounded-full bg-navy-100 px-1.5 py-0.5 text-[10px] font-normal text-navy-700 dark:bg-dark-elevated dark:text-gibelo-areia">
              {itens.length}
            </span>
          )}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          aria-hidden="true"
          className={`transition-transform ${aberto ? "rotate-180" : ""} text-navy-700 dark:text-gibelo-areia`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {aberto && (
        <div className="mt-2">
          {carregando ? (
            <p className="text-xs text-navy-700 dark:text-gibelo-areia">Carregando…</p>
          ) : itens.length === 0 ? (
            <p className="text-xs text-navy-500 dark:text-gibelo-areia">
              Sem eventos ainda.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {itens.map((it) => (
                <li
                  key={it.id}
                  className="flex items-start gap-2 rounded-md border border-navy-100 bg-white px-2 py-1.5 dark:border-dark-border dark:bg-dark-surface"
                >
                  <span
                    className="shrink-0 text-base leading-none"
                    aria-hidden="true"
                  >
                    {ICONES[it.tipo] ?? "•"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-snug text-navy-900 dark:text-gibelo-offwhite">
                      {it.descricao}
                    </p>
                    <p className="mt-0.5 text-[10px] text-navy-500 dark:text-gibelo-areia">
                      {it.autorEmail ? nomeOuEmail(it.autorEmail, perfis) : "Sistema"}
                      {" · "}
                      {formatRelativo(it.criadoEm)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
