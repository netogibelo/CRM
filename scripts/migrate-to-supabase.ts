// Script one-shot de migração localStorage → Supabase. INATIVO até o Supabase existir.
//
// IMPORTANTE: este script roda no Node (via `npx tsx`), que NÃO tem
// `window.localStorage`. Por isso ele lê um dump JSON exportado do navegador, e
// não o localStorage diretamente. Passo de exportação (rodar no console do
// navegador, na aba onde o CRM está aberto):
//
//   const dump = {
//     crm: JSON.parse(localStorage.getItem("gibelo-crm-state") || "null"),
//     atividades: JSON.parse(localStorage.getItem("gibelo-atividades-state") || "null"),
//   };
//   console.log(JSON.stringify(dump, null, 2));
//
// Copie a saída e salve como `crm-export.json` na raiz do projeto.
//
// Para ATIVAR:
//   1. npm install @supabase/supabase-js   (e instalar tsx: npm i -D tsx)
//   2. .env.local com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
//   3. Descomentar lib/supabase.ts
//   4. Gerar crm-export.json (passo acima)
//   5. Descomentar este bloco (remover o `export {}` final) e rodar:
//        npx tsx scripts/migrate-to-supabase.ts
//
// Usa upsert (idempotente): pode rodar de novo sem duplicar. A ordem respeita as
// FKs — clientes/origens/etapas antes de deals; listas antes de cards.

/*
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { supabase } from "../lib/supabase";
import type { AtividadesState, CrmState } from "../lib/types";

type Dump = { crm: CrmState | null; atividades: AtividadesState | null };

const EXPORT_PATH = resolve(process.cwd(), "crm-export.json");

function lerDump(): Dump {
  let raw: string;
  try {
    raw = readFileSync(EXPORT_PATH, "utf8");
  } catch {
    throw new Error(
      `Arquivo não encontrado: ${EXPORT_PATH}. Exporte o localStorage do navegador primeiro (ver topo do script).`,
    );
  }
  return JSON.parse(raw) as Dump;
}

async function upsert(table: string, rows: Record<string, unknown>[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { error } = await supabase.from(table).upsert(rows);
  if (error) throw new Error(`Falha ao gravar "${table}": ${error.message}`);
  return rows.length;
}

async function main(): Promise<void> {
  const { crm, atividades } = lerDump();

  const clientes = (crm?.clientes ?? []).map((c) => ({
    id: c.id,
    nome: c.nome,
    telefone: c.telefone,
    email: c.email,
    observacoes: c.observacoes,
    exemplo: c.exemplo ?? false,
    criado_em: c.criadoEm,
    atualizado_em: c.atualizadoEm,
  }));

  const origens = (crm?.origens ?? []).map((o) => ({ id: o.id, nome: o.nome }));

  const etapas = (crm?.etapas ?? []).map((e) => ({
    id: e.id,
    nome: e.nome,
    probabilidade: e.probabilidade,
    ordem: e.ordem,
    final: e.final ?? false,
  }));

  const deals = (crm?.deals ?? []).map((d) => ({
    id: d.id,
    projeto: d.projeto,
    cliente_id: d.clienteId,
    valor: d.valor,
    origem_id: d.origemId,
    previsao_fechamento: d.previsaoFechamento || null,
    etapa_id: d.etapaId,
    status: d.status,
    motivo_perda: d.motivoPerda,
    notas: d.notas,
    exemplo: d.exemplo ?? false,
    criado_em: d.criadoEm,
    atualizado_em: d.atualizadoEm,
  }));

  const listas = (atividades?.listas ?? []).map((l) => ({
    id: l.id,
    nome: l.nome,
    ordem: l.ordem,
    cor: l.cor,
  }));

  const cards = (atividades?.cards ?? []).map((c) => ({
    id: c.id,
    lista_id: c.listaId,
    titulo: c.titulo,
    descricao: c.descricao,
    cor: c.cor,
    data: c.data,
    ordem: c.ordem,
    criado_em: c.criadoEm,
    atualizado_em: c.atualizadoEm,
  }));

  // Ordem importa por causa das foreign keys.
  const nClientes = await upsert("clientes", clientes);
  const nOrigens = await upsert("origens", origens);
  const nEtapas = await upsert("etapas", etapas);
  const nDeals = await upsert("deals", deals);
  const nListas = await upsert("atividades_listas", listas);
  const nCards = await upsert("atividades_cards", cards);

  console.log("Migração concluída:");
  console.log(`  ${nDeals} deals`);
  console.log(`  ${nClientes} clientes`);
  console.log(`  ${nOrigens} origens`);
  console.log(`  ${nEtapas} etapas`);
  console.log(`  ${nListas} listas de atividades`);
  console.log(`  ${nCards} cards de atividades`);
}

main().catch((err) => {
  console.error("Erro na migração:", err);
  process.exit(1);
});
*/

export {};
