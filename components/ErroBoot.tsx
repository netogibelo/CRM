"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { btnPrimary } from "@/lib/ui";

/** Tela exibida quando o carregamento inicial do CRM falha (Supabase fora). */
export function ErroBoot({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
        <AlertCircle size={24} aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold text-navy-900 dark:text-gibelo-offwhite">
        Não foi possível carregar os dados
      </h2>
      <p className="text-sm text-navy-700 dark:text-gibelo-areia">
        Verifique sua conexão com a internet e tente novamente. Se o problema
        persistir, aguarde alguns instantes.
      </p>
      <button
        type="button"
        onClick={onRetry}
        aria-label="Tentar carregar novamente"
        className={btnPrimary}
      >
        <RefreshCw size={16} aria-hidden="true" />
        Tentar novamente
      </button>
    </div>
  );
}
