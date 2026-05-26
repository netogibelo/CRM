"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDeals, useStages } from "@/lib/crm-store";
import {
  calcularNotificacoes,
  filtrarNaoVistas,
  lerVistas,
  marcarComoVisto,
  type Notificacao,
} from "@/lib/notificacoes";

interface NotificacoesSinoProps {
  /** Chamado quando o usuário clica numa notificação (ex.: troca de aba pro Funil). */
  onIrParaDeal?: (dealId: string) => void;
}

export function NotificacoesSino({ onIrParaDeal }: NotificacoesSinoProps) {
  const { deals } = useDeals();
  const { etapas } = useStages();
  const [aberto, setAberto] = useState(false);
  const [vistas, setVistas] = useState<Record<string, string>>({});
  const refContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVistas(lerVistas());
  }, []);

  useEffect(() => {
    if (!aberto) return;
    function clickFora(e: MouseEvent) {
      if (
        refContainer.current &&
        !refContainer.current.contains(e.target as Node)
      ) {
        setAberto(false);
      }
    }
    function escFecha(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", clickFora);
    document.addEventListener("keydown", escFecha);
    return () => {
      document.removeEventListener("mousedown", clickFora);
      document.removeEventListener("keydown", escFecha);
    };
  }, [aberto]);

  const todas = useMemo(
    () => calcularNotificacoes(deals, etapas),
    [deals, etapas],
  );
  const ativas = useMemo(
    () => filtrarNaoVistas(todas, vistas),
    [todas, vistas],
  );

  function handleMarcar(n: Notificacao) {
    marcarComoVisto(n.dealId, n.atualizadoEm);
    setVistas((prev) => ({ ...prev, [n.dealId]: n.atualizadoEm }));
  }

  function handleClicarDeal(n: Notificacao) {
    handleMarcar(n);
    setAberto(false);
    onIrParaDeal?.(n.dealId);
  }

  return (
    <div ref={refContainer} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="relative rounded-lg border border-navy-200 p-1.5 text-navy-700 transition-colors hover:bg-navy-50"
        aria-label={
          ativas.length > 0
            ? `Notificações (${ativas.length} pendente${ativas.length === 1 ? "" : "s"})`
            : "Notificações"
        }
        aria-expanded={aberto}
        aria-haspopup="true"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 3a6 6 0 016 6v3.5l1.5 3.5h-15L6 12.5V9a6 6 0 016-6z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 19a2 2 0 004 0"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
        {ativas.length > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white"
            aria-hidden="true"
          >
            {ativas.length > 9 ? "9+" : ativas.length}
          </span>
        )}
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label="Centro de notificações"
          className="absolute right-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-navy-100 bg-white shadow-card-hover"
        >
          <div className="flex items-baseline justify-between border-b border-navy-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-navy-900">
              Deals parados
            </h2>
            <span className="text-xs text-navy-400">
              {ativas.length} pendente{ativas.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {ativas.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-navy-400">
                Nenhum deal parado no momento. Bom trabalho.
              </p>
            ) : (
              <ul className="divide-y divide-navy-100">
                {ativas.map((n) => (
                  <li
                    key={n.dealId}
                    className="flex items-start gap-2 px-4 py-3"
                  >
                    <button
                      type="button"
                      onClick={() => handleClicarDeal(n)}
                      className="flex-1 text-left"
                      aria-label={`Abrir oportunidade ${n.projeto}`}
                    >
                      <p className="text-sm font-medium text-navy-900">
                        {n.projeto}
                      </p>
                      <p className="mt-0.5 text-xs text-navy-500">
                        {n.etapaNome} · parado há {n.diasParado}d
                        <span className="text-navy-300"> (limite {n.limite}d)</span>
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarcar(n)}
                      className="shrink-0 rounded p-1 text-navy-400 transition-colors hover:bg-navy-50 hover:text-navy-700"
                      aria-label={`Marcar notificação de ${n.projeto} como vista`}
                      title="Marcar como vista"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M3 8.5l3.5 3.5L13 5"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
