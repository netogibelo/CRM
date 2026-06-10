import Link from "next/link";
import { btnPrimary } from "@/lib/ui";
import { GibeloLogo } from "@/components/GibeloLogo";

// 404 do App Router: renderiza dentro do root layout (sem providers nem
// rail), então a página se centraliza sozinha em min-h-screen.

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gibelo-offwhite px-4 py-10 dark:bg-dark-bg">
      <div className="w-full max-w-sm rounded-2xl border border-navy-100 bg-white p-8 text-center shadow-sm dark:border-dark-border dark:bg-dark-surface">
        <header className="flex flex-col items-center gap-3">
          <GibeloLogo width={160} />
        </header>

        <p
          aria-hidden="true"
          className="mt-8 text-5xl font-extrabold tracking-tight text-navy-200 dark:text-dark-border"
        >
          404
        </p>
        <h1 className="mt-2 text-xl font-bold text-navy-900 dark:text-gibelo-offwhite">
          Página não encontrada
        </h1>
        <p className="mt-2 text-sm text-navy-700 dark:text-gibelo-areia">
          A página que você procura não existe ou foi movida.
        </p>

        <div className="mt-8">
          <Link
            href="/"
            className={`${btnPrimary} w-full`}
            aria-label="Voltar ao início"
          >
            Voltar ao início
          </Link>
        </div>

        <p className="mt-6 text-xs text-navy-500 dark:text-gibelo-areia">
          Gibelo Construtora
        </p>
      </div>
    </main>
  );
}
