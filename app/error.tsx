"use client";

// Error boundary do App Router: captura erros de runtime nas rotas abaixo do
// root layout (que segue renderizando — fontes e tema continuam ativos).

import { useEffect } from "react";
import { btnGhost, btnPrimary } from "@/lib/ui";
import { GibeloLogo } from "@/components/GibeloLogo";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gibelo-offwhite px-4 py-10 dark:bg-dark-bg">
      <div className="w-full max-w-sm rounded-2xl border border-navy-100 bg-white p-8 text-center shadow-sm dark:border-dark-border dark:bg-dark-surface">
        <header className="flex flex-col items-center gap-3">
          <GibeloLogo width={160} />
        </header>

        <h1 className="mt-8 text-xl font-bold text-navy-900 dark:text-gibelo-offwhite">
          Algo deu errado
        </h1>
        <p className="mt-2 text-sm text-navy-700 dark:text-gibelo-areia">
          Ocorreu um erro inesperado. Tente novamente — se o problema
          persistir, recarregue a página ou volte ao início.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={reset}
            className={`${btnPrimary} w-full`}
            aria-label="Tentar novamente"
          >
            Tentar novamente
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className={`${btnGhost} w-full`}
            aria-label="Voltar ao início"
          >
            Voltar ao início
          </button>
        </div>

        <p className="mt-6 text-xs text-navy-500 dark:text-gibelo-areia">
          Gibelo Construtora
        </p>
      </div>
    </main>
  );
}
