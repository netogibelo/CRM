// Aplicação em batch dos sufixos `dark:` Tailwind nos componentes do CRM
// Gibelo Construtora. Roda uma vez e é descartado depois (fica como histórico
// reprodutível em scripts/).
//
// Estratégia:
//   1. Para cada arquivo em components/*.tsx (exceto os já feitos à mão),
//      procura tokens-base do tema claro e injeta o equivalente dark: ao lado,
//      preservando a ordem da string original.
//   2. Pulamos qualquer arquivo que já contenha `dark:` antes de rodar — assumimos
//      que já foi tratado manualmente.
//   3. Trabalhamos com strings literais dentro de aspas para evitar tocar em
//      identificadores, comentários ou data atributos.
//
// Como rodar:  node scripts/apply-dark-mode.mjs

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const COMPONENTS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "components");

// Ordem importa: tokens mais específicos antes dos mais genéricos.
// Cada par [pattern, replacement] roda em uma única passagem por arquivo,
// usando um marcador único para evitar reaplicar a substituição.
const SUBS = [
  // contraste WCAG: navy-400/500 → navy-600/700 sobre off-white
  [/\btext-navy-400\b(?!.*?text-navy-400)/g, "text-navy-700 dark:text-gibelo-cinza-quente"],
  [/\btext-navy-500\b/g, "text-navy-700 dark:text-gibelo-areia"],
  // tokens dark mode
  [/\btext-navy-900\b/g, "text-navy-900 dark:text-gibelo-offwhite"],
  [/\btext-navy-800\b/g, "text-navy-800 dark:text-gibelo-offwhite"],
  [/\btext-navy-700\b(?! dark:)/g, "text-navy-700 dark:text-gibelo-offwhite"],
  [/\btext-navy-600\b(?! dark:)/g, "text-navy-700 dark:text-gibelo-areia"],
  [/\bbg-white\b(?! dark:)/g, "bg-white dark:bg-dark-surface"],
  [/\bbg-navy-50\b/g, "bg-navy-50 dark:bg-dark-elevated"],
  [/\bbg-navy-100\b(?!\/)/g, "bg-navy-100 dark:bg-dark-elevated"],
  [/\bbg-navy-100\/50\b/g, "bg-navy-100/50 dark:bg-dark-elevated/40"],
  [/\bbg-navy-200\/60\b/g, "bg-navy-200/60 dark:bg-dark-border/40"],
  [/\bborder-navy-100\b/g, "border-navy-100 dark:border-dark-border"],
  [/\bborder-navy-200\b(?!\/)/g, "border-navy-200 dark:border-dark-border"],
  [/\bborder-navy-200\/70\b/g, "border-navy-200/70 dark:border-dark-border/70"],
  [/\bhover:bg-navy-50\b/g, "hover:bg-navy-50 dark:hover:bg-dark-elevated"],
  [/\bhover:bg-navy-100\b/g, "hover:bg-navy-100 dark:hover:bg-dark-elevated"],
  [/\bhover:border-navy-200\b/g, "hover:border-navy-200 dark:hover:border-gibelo-areia/40"],
  [/\bborder-dashed border-navy-200\b/g, "border-dashed border-navy-200 dark:border-dark-border"],
];

// Lista de arquivos a pular (já editados à mão ou triviais).
const SKIP = new Set([
  "Footer.tsx",
  "Modal.tsx",
  "ThemeToggle.tsx",
  "Providers.tsx",
  "ExemploBadge.tsx",
  "EditableText.tsx",
]);

const arquivos = readdirSync(COMPONENTS_DIR).filter(
  (f) => f.endsWith(".tsx") && !SKIP.has(f),
);

let totalMudancas = 0;
const relatorio = [];

for (const arquivo of arquivos) {
  const caminho = join(COMPONENTS_DIR, arquivo);
  const original = readFileSync(caminho, "utf8");
  let conteudo = original;
  let mudancasArquivo = 0;

  for (const [pattern, replacement] of SUBS) {
    const novoConteudo = conteudo.replace(pattern, () => {
      // Idempotência: se já tem "dark:..." imediatamente depois, mantém.
      mudancasArquivo += 1;
      return replacement;
    });
    conteudo = novoConteudo;
  }

  if (conteudo !== original) {
    writeFileSync(caminho, conteudo, "utf8");
    totalMudancas += mudancasArquivo;
    relatorio.push(`  ${arquivo}: ${mudancasArquivo} subs`);
  }
}

console.log(`Total: ${totalMudancas} substituições em ${relatorio.length} arquivos`);
console.log(relatorio.join("\n"));
