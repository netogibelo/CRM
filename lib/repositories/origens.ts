// Repositório de origens (cadastráveis em Configurações).

import type { Origem, OrigemInput } from "../types";
import { novoId } from "../id";
import { supabase } from "../supabase";
import { reorderBatch, type Row } from "./shared";

export interface OriginRepository {
  listAll(): Promise<Origem[]>;
  create(input: OrigemInput): Promise<Origem>;
  update(id: string, patch: Partial<OrigemInput>): Promise<Origem>;
  remove(id: string): Promise<void>;
  /** Persiste a ordem para um array de ids — índice no array = nova ordem. */
  reorder(idsOrdenados: string[]): Promise<void>;
}

function origemFromRow(row: Row): Origem {
  return {
    id: row.id,
    nome: row.nome,
    ordem: Number(row.ordem ?? 0),
  };
}

function origemPatchToRow(p: Partial<OrigemInput>): Row {
  const r: Row = {};
  if (p.nome !== undefined) r.nome = p.nome;
  if (p.ordem !== undefined) r.ordem = p.ordem;
  return r;
}

class SupabaseOriginRepository implements OriginRepository {
  async listAll(): Promise<Origem[]> {
    const { data, error } = await supabase
      .from("origens")
      .select("*")
      .order("ordem", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(origemFromRow);
  }
  async create(input: OrigemInput): Promise<Origem> {
    const o: Origem = { ...input, id: novoId("og") };
    const { error } = await supabase
      .from("origens")
      .insert({ id: o.id, nome: o.nome, ordem: o.ordem });
    if (error) throw error;
    return o;
  }
  async update(id: string, patch: Partial<OrigemInput>): Promise<Origem> {
    const { data, error } = await supabase
      .from("origens")
      .update(origemPatchToRow(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return origemFromRow(data);
  }
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("origens").delete().eq("id", id);
    if (error) throw error;
  }
  async reorder(idsOrdenados: string[]): Promise<void> {
    await reorderBatch("origens", idsOrdenados);
  }
}

export const originRepository: OriginRepository = new SupabaseOriginRepository();
