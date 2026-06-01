"use client";

import { Footer } from "@/components/Footer";
import { useNav } from "@/lib/nav-store";
import { ABA_LABEL } from "@/lib/nav";
import { Rail } from "./Rail";
import { MobileNav } from "./MobileNav";

/**
 * Shell fluido de viewport inteiro: rail fixo à esquerda (desktop) + coluna de
 * conteúdo que ocupa o resto. Altura travada em 100dvh com overflow-hidden no
 * shell; SOMENTE a área de conteúdo (<main>) rola. No mobile o rail vira o
 * drawer dentro de <MobileNav> (top bar + overlay). O footer institucional
 * rola no fim do conteúdo (não fica preso no viewport).
 */
export function RailShell({ children }: { children: React.ReactNode }) {
  const { aba } = useNav();

  // Kanban (Funil/Atividades) e Dashboard preenchem 100% da largura; views de
  // leitura (Clientes/Configurações/Histórico) mantêm um cap legível centrado.
  const fluido =
    aba === "dashboard" || aba === "funil" || aba === "atividades";

  return (
    <div className="flex h-dvh overflow-hidden bg-gibelo-offwhite text-navy-900 transition-colors dark:bg-dark-bg dark:text-gibelo-offwhite">
      <Rail />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <main
          aria-label={ABA_LABEL[aba]}
          className="flex-1 overflow-y-auto overflow-x-hidden"
        >
          <div
            className={`@container/canvas w-full px-4 py-5 sm:px-6 sm:py-7 ${
              fluido ? "" : "mx-auto max-w-[1400px]"
            }`}
          >
            {children}
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}
