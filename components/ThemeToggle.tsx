"use client";

import { useTheme } from "@/lib/theme";

/**
 * Botão de alternância de tema (lua/sol). Aria-label dinâmico anuncia
 * a ação que será executada, não o estado atual — convenção de A11y
 * para toggles assimétricos.
 */
export function ThemeToggle() {
  const { tema, alternar } = useTheme();
  const isDark = tema === "dark";

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      title={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-navy-200 bg-white text-navy-700 transition-colors hover:bg-navy-50 dark:border-dark-border dark:bg-dark-surface dark:text-gibelo-offwhite dark:hover:bg-dark-elevated"
    >
      {isDark ? (
        // Sol (modo claro vai ser ativado ao clicar)
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        // Lua (modo escuro vai ser ativado ao clicar)
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}
