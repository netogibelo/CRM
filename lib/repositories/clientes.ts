// Repositório de clientes (empresa ou pessoa).

import type { Cliente, ClienteInput } from "../types";
import { agoraISO, novoId } from "../id";
import { supabase } from "../supabase";
import type { Row } from "./shared";

export interface ClientRepository {
  listAll(): Promise<Cliente[]>;
  create(input: ClienteInput): Promise<Cliente>;
  update(id: string, patch: Partial<ClienteInput>): Promise<Cliente>;
  remove(id: string): Promise<void>;
}

function clienteFromRow(row: Row): Cliente {
  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone ?? "",
    email: row.email ?? "",
    observacoes: row.observacoes ?? "",
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    exemplo: row.exemplo ?? false,
  };
}
function clienteToRow(c: Cliente): Row {
  return {
    id: c.id,
    nome: c.nome,
    telefone: c.telefone,
    email: c.email,
    observacoes: c.observacoes,
    exemplo: c.exemplo ?? false,
    criado_em: c.criadoEm,
    atualizado_em: c.atualizadoEm,
  };
}
function clientePatchToRow(p: Partial<ClienteInput>): Row {
  const r: Row = {};
  if (p.nome !== undefined) r.nome = p.nome;
  if (p.telefone !== undefined) r.telefone = p.telefone;
  if (p.email !== undefined) r.email = p.email;
  if (p.observacoes !== undefined) r.observacoes = p.observacoes;
  if (p.exemplo !== undefined) r.exemplo = p.exemplo;
  return r;
}

class SupabaseClientRepository implements ClientRepository {
  async listAll(): Promise<Cliente[]> {
    const { data, error } = await supabase.from("clientes").select("*");
    if (error) throw error;
    return (data ?? []).map(clienteFromRow);
  }
  async create(input: ClienteInput): Promise<Cliente> {
    const ts = agoraISO();
    const cli: Cliente = { ...input, id: novoId("cli"), criadoEm: ts, atualizadoEm: ts };
    const { error } = await supabase.from("clientes").insert(clienteToRow(cli));
    if (error) throw error;
    return cli;
  }
  async update(id: string, patch: Partial<ClienteInput>): Promise<Cliente> {
    const { data, error } = await supabase
      .from("clientes")
      .update({ ...clientePatchToRow(patch), atualizado_em: agoraISO() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return clienteFromRow(data);
  }
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) throw error;
  }
}

export const clientRepository: ClientRepository = new SupabaseClientRepository();
