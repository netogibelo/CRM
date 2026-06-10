// Repositório do histórico/timeline dos deals.

import type { HistoricoInput, HistoricoItem, HistoricoTipo } from "../types";
import { novoId } from "../id";
import { supabase } from "../supabase";
import type { Row } from "./shared";

export interface HistoricoRepository {
  list(dealId: string): Promise<HistoricoItem[]>;
  create(input: HistoricoInput): Promise<HistoricoItem>;
}

function historicoFromRow(row: Row): HistoricoItem {
  return {
    id: row.id,
    dealId: row.deal_id,
    tipo: row.tipo as HistoricoTipo,
    descricao: row.descricao,
    autorEmail: row.autor_email ?? null,
    criadoEm: row.criado_em,
  };
}

class SupabaseHistoricoRepository implements HistoricoRepository {
  async list(dealId: string): Promise<HistoricoItem[]> {
    const { data, error } = await supabase
      .from("deal_historico")
      .select("*")
      .eq("deal_id", dealId)
      .order("criado_em", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(historicoFromRow);
  }
  async create(input: HistoricoInput): Promise<HistoricoItem> {
    const id = novoId("hist");
    const { data, error } = await supabase
      .from("deal_historico")
      .insert({
        id,
        deal_id: input.dealId,
        tipo: input.tipo,
        descricao: input.descricao,
        autor_email: input.autorEmail,
      })
      .select()
      .single();
    if (error) throw error;
    return historicoFromRow(data);
  }
}

export const historicoRepository: HistoricoRepository =
  new SupabaseHistoricoRepository();
