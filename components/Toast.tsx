"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";
import {
  dispensarToast,
  getToasts,
  subscribeToasts,
  type Toast,
  type ToastTipo,
} from "@/lib/toast-store";

// Acento lateral e cor do ícone por variante. `dark:border-l-*` é explícito
// porque `dark:border-*` genérico venceria `border-l-*` por especificidade.
const VARIANTES: Record<ToastTipo, { borda: string; icone: string }> = {
  erro: {
    borda: "border-l-red-500 dark:border-l-red-400",
    icone: "text-red-600 dark:text-red-400",
  },
  sucesso: {
    borda: "border-l-emerald-500 dark:border-l-emerald-400",
    icone: "text-emerald-600 dark:text-emerald-400",
  },
  aviso: {
    borda: "border-l-amber-500 dark:border-l-amber-400",
    icone: "text-amber-600 dark:text-amber-400",
  },
  info: {
    borda: "border-l-navy-500 dark:border-l-gibelo-areia",
    icone: "text-navy-700 dark:text-gibelo-areia",
  },
};

const ICONES: Record<ToastTipo, typeof Info> = {
  erro: AlertCircle,
  sucesso: CheckCircle2,
  aviso: AlertTriangle,
  info: Info,
};

function ToastItem({ toast }: { toast: Toast }) {
  const { borda, icone } = VARIANTES[toast.tipo];
  const Icone = ICONES[toast.tipo];

  useEffect(() => {
    const timer = setTimeout(() => dispensarToast(toast.id), toast.duracao);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duracao]);

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex items-start gap-3 rounded-lg border border-navy-100 ${borda} border-l-4 bg-white px-4 py-3 shadow-card-hover dark:border-dark-border dark:bg-dark-surface`}
    >
      <Icone size={18} aria-hidden="true" className={`mt-0.5 shrink-0 ${icone}`} />
      <p className="min-w-0 flex-1 text-sm text-navy-900 dark:text-gibelo-offwhite">
        {toast.mensagem}
      </p>
      <button
        type="button"
        onClick={() => dispensarToast(toast.id)}
        aria-label="Fechar notificação"
        className="-mr-1 shrink-0 rounded-md p-1 text-navy-600 transition-colors hover:bg-navy-50 hover:text-navy-900 dark:text-gibelo-areia dark:hover:bg-dark-elevated dark:hover:text-gibelo-offwhite"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

const NENHUM: Toast[] = [];

export function ToastContainer() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, () => NENHUM);

  return (
    <div
      aria-live="polite"
      aria-label="Notificações"
      className="pointer-events-none fixed bottom-4 left-4 right-4 z-[60] flex flex-col gap-2 sm:left-auto sm:w-full sm:max-w-sm"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
