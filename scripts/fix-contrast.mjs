// Ajuste de contraste WCAG AA pós-rebrand Gibelo Construtora.
// `text-navy-300` (#95B0C9) e `text-navy-200` (#C2D2E1) sobre o off-white
// (#F4F1EB) ou branco caem abaixo de 3:1. Bumpamos para `text-navy-500`
// (#3F6A8E → 5.2:1) que passa AA pra texto normal e UI components.
//
// Exceção: ternárias `destaque ? "text-navy-200/300" : ...` aplicam essas
// cores APENAS sobre o card escuro `bg-navy-900` — alto contraste lá. O
// script não toca em strings dentro de uma ternária com `destaque`.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const COMPONENTS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "components");

const arquivos = readdirSync(COMPONENTS_DIR).filter((f) => f.endsWith(".tsx"));

let totalLinhas = 0;
const relatorio = [];

for (const arquivo of arquivos) {
  const caminho = join(COMPONENTS_DIR, arquivo);
  const original = readFileSync(caminho, "utf8");

  // Substitui só em linhas que NÃO mencionam "destaque" (preserva ternárias
  // de cards escuros). Aplica `dark:text-gibelo-cinza-quente` em conjunto.
  const linhas = original.split("\n");
  let mudancas = 0;
  const novas = linhas.map((linha) => {
    if (linha.includes("destaque")) return linha;
    let nova = linha;
    if (nova.includes("text-navy-300") || nova.includes("text-navy-200")) {
      nova = nova
        .replace(/\btext-navy-300\b/g, "text-navy-500 dark:text-gibelo-cinza-quente")
        .replace(/\btext-navy-200\b/g, "text-navy-500 dark:text-gibelo-cinza-quente")
        .replace(/\bplaceholder:text-navy-500 dark:text-gibelo-cinza-quente\b/g, "placeholder:text-navy-500 dark:placeholder:text-gibelo-cinza-quente");
      if (nova !== linha) mudancas += 1;
    }
    return nova;
  });

  if (mudancas > 0) {
    writeFileSync(caminho, novas.join("\n"), "utf8");
    totalLinhas += mudancas;
    relatorio.push(`  ${arquivo}: ${mudancas} linhas`);
  }
}

console.log(`Total: ${totalLinhas} linhas em ${relatorio.length} arquivos`);
console.log(relatorio.join("\n"));
