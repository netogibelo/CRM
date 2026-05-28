// Bump dark-mode contrast — cinza-quente (#908475) sobre dark.surface/elevated
// fica em ~4.0:1 (falha WCAG AA). Trocamos por areia (#C8B89D) que dá ~7.5:1.
// Mantém hierarquia: offwhite (primary) > areia (secondary).

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIRS = ["components", "app", "lib"];

let totalSubs = 0;
const relatorio = [];

function walk(dir) {
  const arquivos = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, entry.name);
    if (entry.isDirectory()) arquivos.push(...walk(caminho));
    else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))
      arquivos.push(caminho);
  }
  return arquivos;
}

for (const subdir of DIRS) {
  const arquivos = walk(join(ROOT, subdir));
  for (const caminho of arquivos) {
    const original = readFileSync(caminho, "utf8");
    let conteudo = original;
    let subs = 0;
    conteudo = conteudo.replace(
      /\bdark:text-gibelo-cinza-quente\b/g,
      () => {
        subs += 1;
        return "dark:text-gibelo-areia";
      },
    );
    conteudo = conteudo.replace(
      /\bdark:placeholder:text-gibelo-cinza-quente\b/g,
      () => {
        subs += 1;
        return "dark:placeholder:text-gibelo-areia";
      },
    );
    if (subs > 0) {
      writeFileSync(caminho, conteudo, "utf8");
      totalSubs += subs;
      relatorio.push(`  ${caminho.replace(ROOT + "\\", "").replace(/\\/g, "/")}: ${subs}`);
    }
  }
}

console.log(`Total: ${totalSubs} substituições em ${relatorio.length} arquivos`);
console.log(relatorio.join("\n"));
