// Utilitários compartilhados entre os repositórios Supabase.
// Interno à camada de repositórios — componentes não importam daqui.

import { supabase } from "../supabase";

export type Row = Record<string, any>;

/** Reordena em lote: lê as linhas atuais, aplica `ordem` pelo índice no array
 * e grava tudo num único upsert — uma transação: ou aplica tudo, ou nada.
 * (Upsert parcial só com {id, ordem} violaria NOT NULL das demais colunas;
 * por isso as linhas completas são reenviadas.) Lança em caso de falha para o
 * chamador reverter o estado otimista. */
export async function reorderBatch(
  tabela: string,
  idsOrdenados: string[],
): Promise<void> {
  if (idsOrdenados.length === 0) return;
  const { data, error } = await supabase
    .from(tabela)
    .select("*")
    .in("id", idsOrdenados);
  if (error) throw error;
  const porId = new Map((data ?? []).map((r: Row) => [r.id as string, r]));
  const rows = idsOrdenados.flatMap((id, i) => {
    const row = porId.get(id);
    return row ? [{ ...row, ordem: i }] : [];
  });
  if (rows.length === 0) return;
  const { error: upsertError } = await supabase
    .from(tabela)
    .upsert(rows, { onConflict: "id" });
  if (upsertError) throw upsertError;
}
