"use client";

import { useState } from "react";
import { useBoard } from "@/lib/activities-store";
import { labelCls } from "@/lib/ui";

interface Props {
  cardId: string;
}

export function AtividadeEtiquetasSection({ cardId }: Props) {
  const { etiquetas, etiquetasDoCard, toggleEtiquetaNoCard } = useBoard();
  const ativas = etiquetasDoCard(cardId);
  const ativasIds = new Set(ativas.map((e) => e.id));
  const [seletor, setSeletor] = useState(false);

  return (
    <section aria-label="Etiquetas" className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className={labelCls}>Etiquetas</span>
        <button
          type="button"
          onClick={() => setSeletor((v) => !v)}
          aria-expanded={seletor}
          className="text-[11px] font-semibold text-navy-700 transition-colors hover:text-navy-900 dark:text-gibelo-areia dark:hover:text-gibelo-offwhite"
        >
          {seletor ? "Fechar" : "Editar"}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ativas.length === 0 ? (
          <span className="text-xs text-navy-500 dark:text-gibelo-areia">
            Nenhuma etiqueta atribuída.
          </span>
        ) : (
          ativas.map((e) => (
            <span
              key={e.id}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
              style={{ backgroundColor: e.cor }}
            >
              {e.nome}
            </span>
          ))
        )}
      </div>

      {seletor && (
        <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-navy-100 bg-white p-2 dark:border-dark-border dark:bg-dark-surface">
          {etiquetas.length === 0 ? (
            <p className="col-span-2 px-2 py-3 text-center text-xs text-navy-700 dark:text-gibelo-areia">
              Nenhuma etiqueta cadastrada. Crie em Configurações.
            </p>
          ) : (
            etiquetas.map((e) => {
              const ativa = ativasIds.has(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => toggleEtiquetaNoCard(cardId, e.id)}
                  aria-pressed={ativa}
                  aria-label={`${ativa ? "Remover" : "Adicionar"} etiqueta ${e.nome}`}
                  className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs font-medium transition-all ${
                    ativa
                      ? "border-navy-300 bg-navy-50 dark:border-gibelo-areia dark:bg-dark-elevated"
                      : "border-navy-100 hover:bg-navy-50/50 dark:border-dark-border dark:hover:bg-dark-elevated/40"
                  }`}
                >
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: e.cor }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-navy-900 dark:text-gibelo-offwhite">
                    {e.nome}
                  </span>
                  {ativa && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      aria-hidden="true"
                      className="shrink-0 text-navy-700 dark:text-gibelo-offwhite"
                    >
                      <path
                        d="M3 8l3 3 7-7"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
