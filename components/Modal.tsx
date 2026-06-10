"use client";

import { useEffect, useId, useRef } from "react";

interface ModalProps {
  titulo: string;
  descricao?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  /** "alertdialog" para confirmações que exigem resposta (ConfirmDialog). */
  role?: "dialog" | "alertdialog";
}

const FOCO_SELETOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

// Pilha de modais abertos: só o topo responde a Escape / aprisiona o Tab.
const modalStack: string[] = [];

export function Modal({
  titulo,
  descricao,
  onClose,
  children,
  maxWidth = "max-w-lg",
  role = "dialog",
}: ModalProps) {
  const painelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const tituloId = `modal-titulo-${id}`;

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const painel = painelRef.current;
    modalStack.push(id);

    const focaveis = painel?.querySelectorAll<HTMLElement>(FOCO_SELETOR);
    focaveis?.[0]?.focus();

    function noTopo() {
      return modalStack[modalStack.length - 1] === id;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!noTopo()) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && painel) {
        const itens = Array.from(
          painel.querySelectorAll<HTMLElement>(FOCO_SELETOR),
        ).filter((el) => el.offsetParent !== null);
        if (itens.length === 0) return;
        const primeiro = itens[0];
        const ultimo = itens[itens.length - 1];
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primeiro.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const i = modalStack.lastIndexOf(id);
      if (i !== -1) modalStack.splice(i, 1);
      if (modalStack.length === 0) {
        document.body.style.overflow = overflowAnterior;
      }
      anterior?.focus?.();
    };
  }, [id, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4 dark:bg-black/70"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={painelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descricao ? `${tituloId}-desc` : undefined}
        className={`w-full ${maxWidth} max-h-[92vh] overflow-y-auto rounded-t-2xl bg-white shadow-card-hover sm:rounded-2xl dark:bg-dark-surface`}
      >
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-navy-100 bg-white px-5 py-4 sm:px-6 dark:border-dark-border dark:bg-dark-surface">
          <div>
            <h2 id={tituloId} className="text-lg font-semibold text-navy-900 dark:text-gibelo-offwhite">
              {titulo}
            </h2>
            {descricao && (
              <p id={`${tituloId}-desc`} className="mt-0.5 text-sm text-navy-600 dark:text-gibelo-areia">
                {descricao}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-1 rounded-lg p-1.5 text-navy-600 transition-colors hover:bg-navy-50 hover:text-navy-900 dark:text-gibelo-areia dark:hover:bg-dark-elevated dark:hover:text-gibelo-offwhite"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
