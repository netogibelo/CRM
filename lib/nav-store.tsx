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
import { type Aba } from "@/lib/nav";

interface NavContextValue {
  aba: Aba;
  setAba: (a: Aba) => void;
  /**
   * Subpágina ativa dentro de Configurações (id de CONFIG_SECOES) ou `null`
   * para a tela inicial (grade de cards). Lida por ConfiguracoesView.
   */
  subpaginaConfig: string | null;
  setSubpaginaConfig: (id: string | null) => void;
  /**
   * Vai para Configurações. Com `secaoId` abre a subpágina correspondente;
   * sem argumento abre a tela inicial de Configurações.
   */
  irParaConfig: (secaoId?: string) => void;
}

const NavContext = createContext<NavContextValue | null>(null);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [aba, setAbaState] = useState<Aba>("dashboard");
  const [subpaginaConfig, setSubpaginaConfig] = useState<string | null>(null);

  const setAba = useCallback((a: Aba) => setAbaState(a), []);

  const irParaConfig = useCallback((secaoId?: string) => {
    setAbaState("config");
    setSubpaginaConfig(secaoId ?? null);
  }, []);

  const value = useMemo(
    () => ({
      aba,
      setAba,
      subpaginaConfig,
      setSubpaginaConfig,
      irParaConfig,
    }),
    [aba, setAba, subpaginaConfig, irParaConfig],
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
