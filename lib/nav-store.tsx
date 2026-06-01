"use client";

/**
 * Estado de navegação in-page do CRM, içado de app/(app)/page.tsx para que o
 * rail lateral (montado em app/(app)/layout.tsx, acima do page) possa dirigir
 * a troca de seção. Um layout não consegue ler o useState de um page filho —
 * por isso o estado vive aqui, num provider compartilhado dentro de
 * <Providers>.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { type Aba, configAnchorId } from "@/lib/nav";

interface NavContextValue {
  aba: Aba;
  setAba: (a: Aba) => void;
  /** Vai para Configurações e rola até a seção `secaoId` (âncora cfg-<id>). */
  irParaConfig: (secaoId?: string) => void;
}

const NavContext = createContext<NavContextValue | null>(null);

function prefereMovimentoReduzido(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [aba, setAbaState] = useState<Aba>("dashboard");

  const setAba = useCallback((a: Aba) => setAbaState(a), []);

  const irParaConfig = useCallback((secaoId?: string) => {
    setAbaState("config");
    if (!secaoId) return;
    // ConfiguracoesView é import estático (renderiza no mesmo tick). Dois rAF
    // garantem que o DOM da seção já existe antes de rolar.
    const rolar = () => {
      const el = document.getElementById(configAnchorId(secaoId));
      el?.scrollIntoView({
        behavior: prefereMovimentoReduzido() ? "auto" : "smooth",
        block: "start",
      });
      el?.focus?.({ preventScroll: true });
    };
    requestAnimationFrame(() => requestAnimationFrame(rolar));
  }, []);

  const value = useMemo(
    () => ({ aba, setAba, irParaConfig }),
    [aba, setAba, irParaConfig],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext);
  if (!ctx) {
    throw new Error("useNav deve ser usado dentro de <NavProvider>.");
  }
  return ctx;
}
