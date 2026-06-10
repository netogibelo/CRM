// Repositório de contatos (pessoas vinculadas a um cliente).

import type { Contato, ContatoInput } from "../types";
import { novoId } from "../id";
import { supabase } from "../supabase";
import type { Row } from "./shared";

export interface ContatoRepository {
  listAll(): Promise<Contato[]>;
  create(input: ContatoInput): Promise<Contato>;
  update(id: string, patch: Partial<ContatoInput>): Promise<Contato>;
  remove(id: string): Promise<void>;
}

function contatoFromRow(row: Row): Contato {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    nome: row.nome,
    cargo: row.cargo ?? "",
    telefone: row.telefone ?? "",
    email: row.email ?? "",
    principal: Boolean(row.principal),
    criadoEm: row.criado_em,
  };
}

function contatoPatchToRow(p: Partial<ContatoInput>): Row {
  const r: Row = {};
  if (p.clienteId !== undefined) r.cliente_id = p.clienteId;
  if (p.nome !== undefined) r.nome = p.nome;
  if (p.cargo !== undefined) r.cargo = p.cargo || null;
  if (p.telefone !== undefined) r.telefone = p.telefone || null;
  if (p.email !== undefined) r.email = p.email || null;
  if (p.principal !== undefined) r.principal = p.principal;
  return r;
}

class SupabaseContatoRepository implements ContatoRepository {
  async listAll(): Promise<Contato[]> {
    const { data, error } = await supabase
      .from("contatos")
      .select("*")
      .order("criado_em", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(contatoFromRow);
  }
  async create(input: ContatoInput): Promise<Contato> {
    const id = novoId("ctt");
    const { data, error } = await supabase
      .from("contatos")
      .insert({
        id,
        cliente_id: input.clienteId,
        nome: input.nome,
        cargo: input.cargo || null,
        telefone: input.telefone || null,
        email: input.email || null,
        principal: input.principal,
      })
      .select()
      .single();
    if (error) throw error;
    return contatoFromRow(data);
  }
  async update(id: string, patch: Partial<ContatoInput>): Promise<Contato> {
    const { data, error } = await supabase
      .from("contatos")
      .update(contatoPatchToRow(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return contatoFromRow(data);
  }
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("contatos").delete().eq("id", id);
    if (error) throw error;
  }
}

export const contatoRepository: ContatoRepository = new SupabaseContatoRepository();
