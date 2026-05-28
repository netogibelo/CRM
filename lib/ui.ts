// Classes utilitárias compartilhadas entre formulários e botões.
// Sufixos `dark:` cobrem o tema escuro Gibelo Construtora.

export const labelCls =
  "block text-sm font-medium text-navy-700 dark:text-gibelo-areia";

export const inputCls =
  "mt-1 w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 shadow-sm transition-colors placeholder:text-navy-300 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/30 dark:border-dark-border dark:bg-dark-elevated dark:text-gibelo-offwhite dark:placeholder:text-gibelo-cinza-quente dark:focus:border-gibelo-areia dark:focus:ring-gibelo-areia/30";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-800 disabled:opacity-50 dark:bg-gibelo-areia dark:text-navy-900 dark:hover:bg-gibelo-areia/90";

export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 transition-colors hover:bg-navy-50 dark:border-dark-border dark:text-gibelo-offwhite dark:hover:bg-dark-elevated";

export const btnDangerGhost =
  "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40";
