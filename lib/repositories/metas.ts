// Repositório de metas mensais de vendas.

import type { Meta, MetaInput } from "../types";
import { agoraISO, novoId } from "../id";
import { supabase } from "../supabase";
import type { Row } from "./shared";

export interface MetaRepository {
  listAll(): Promise<Meta[]>;
  getByMes(mes: string): Promise<Meta | null>;
  upsert(input: MetaInput): Promise<Meta>;
  remove(mes: string): Promise<void>;
}

function metaFromRow(row: Row): Meta {
  return {
    id: row.id,
    mes: row.mes,
    valorMeta: Number(row.valor_meta),
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  };
}

class SupabaseMetaRepository implements MetaRepository {
  async listAll(): Promise<Meta[]> {
    const { data, error } = await supabase
      .from("metas")
      .select("*")
      .order("mes", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(metaFromRow);
  }
  async getByMes(mes: string): Promise<Meta | null> {
    const { data, error } = await supabase
      .from("metas")
      .select("*")
      .eq("mes", mes)
      .maybeSingle();
    if (error) throw error;
    return data ? metaFromRow(data) : null;
  }
  async upsert(input: MetaInput): Promise<Meta> {
    const ts = agoraISO();
    const existente = await this.getByMes(input.mes);
    if (existente) {
      const { data, error } = await supabase
        .from("metas")
        .update({ valor_meta: input.valorMeta, atualizado_em: ts })
        .eq("mes", input.mes)
        .select()
        .single();
      if (error) throw error;
      return metaFromRow(data);
    }
    const id = novoId("meta");
    const { data, error } = await supabase
      .from("metas")
      .insert({
        id,
        mes: input.mes,
        valor_meta: input.valorMeta,
        criado_em: ts,
        atualizado_em: ts,
      })
      .select()
      .single();
    if (error) throw error;
    return metaFromRow(data);
  }
  async remove(mes: string): Promise<void> {
    const { error } = await supabase.from("metas").delete().eq("mes", mes);
    if (error) throw error;
  }
}

export const metaRepository: MetaRepository = new SupabaseMetaRepository();
