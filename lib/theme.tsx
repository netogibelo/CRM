"use client";

/**
 * Gerenciamento de tema claro/escuro para o CRM Gibelo Construtora.
 *
 * Estratégia:
 *   1. Script inline (em ThemeScript) roda antes do React montar — lê o
 *      tema salvo em localStorage ou cai pra `prefers-color-scheme`, e já
 *      aplica `class="dark"` no <html>. Isso evita flash branco no boot.
 *   2. ThemeProvider expõe `useTheme()` para componentes (toggle no header).
 *   3. Persistência em `gibelo-crm-tema` ("dark" | "light"). Quando o usuário
 *      ainda não escolheu manualmente, seguimos o sistema dinamicamente.
 *
 * O PDF de export abre uma window nova fora deste contexto, então não é
 * afetado pelo tema dark — sempre imprime claro.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Tema = "light" | "dark";

const STORAGE_KEY = "gibelo-crm-tema";

interface ThemeContextValue {
  tema: Tema;
  alternar: () => void;
  definir: (t: Tema) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function aplicarClasse(t: Tema) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.classList.toggle("dark", t === "dark");
  html.dataset.theme = t;
  html.style.colorScheme = t;
}

function lerInicial(): Tema {
  if (typeof window === "undefined") return "light";
  const salvo = window.localStorage.getItem(STORAGE_KEY);
  if (salvo === "dark" || salvo === "light") return salvo;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // SSR safe: começamos com "light" e ajustamos no efeito; o script inline
  // já garantiu a classe correta no <html>, então não há flash.
  const [tema, setTema] = useState<Tema>("light");

  useEffect(() => {
    const inicial = lerInicial();
    setTema(inicial);
    aplicarClasse(inicial);
  }, []);

  // Seguir o sistema quando o usuário ainda não escolheu manualmente.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const salvo = window.localStorage.getItem(STORAGE_KEY);
      if (salvo === "dark" || salvo === "light") return; // escolha manual vence
      const novo: Tema = e.matches ? "dark" : "light";
      setTema(novo);
      aplicarClasse(novo);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const definir = useCallback((t: Tema) => {
    setTema(t);
    aplicarClasse(t);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, t);
    }
  }, []);

  const alternar = useCallback(() => {
    definir(tema === "dark" ? "light" : "dark");
  }, [tema, definir]);

  const value = useMemo(
    () => ({ tema, alternar, definir }),
    [tema, alternar, definir],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme deve ser usado dentro de <ThemeProvider>.");
  }
  return ctx;
}

/**
 * Script inline injetado no <head> via dangerouslySetInnerHTML — roda
 * antes do React e antes do paint pra evitar flash branco quando o tema
 * salvo é dark.
 */
export const THEME_BOOT_SCRIPT = `
(function () {
  try {
    var k = '${STORAGE_KEY}';
    var salvo = localStorage.getItem(k);
    var dark =
      salvo === 'dark' ||
      (salvo !== 'light' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    var html = document.documentElement;
    if (dark) {
      html.classList.add('dark');
      html.dataset.theme = 'dark';
      html.style.colorScheme = 'dark';
    } else {
      html.dataset.theme = 'light';
      html.style.colorScheme = 'light';
    }
  } catch (e) {}
})();
`;
