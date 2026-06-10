// Repositório de perfis (nome de exibição por usuário Supabase Auth).

import type { Perfil, PerfilInput } from "../types";
import { agoraISO } from "../id";
import { supabase } from "../supabase";
import type { Row } from "./shared";

export interface PerfilRepository {
  listAll(): Promise<Perfil[]>;
  getByEmail(email: string): Promise<Perfil | null>;
  upsert(input: PerfilInput): Promise<Perfil>;
}

function perfilFromRow(row: Row): Perfil {
  return {
    id: row.id,
    nomeExibicao: row.nome_exibicao,
    email: row.email ?? "",
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  };
}

class SupabasePerfilRepository implements PerfilRepository {
  async listAll(): Promise<Perfil[]> {
    const { data, error } = await supabase.from("perfis").select("*");
    if (error) throw error;
    return (data ?? []).map(perfilFromRow);
  }
  async getByEmail(email: string): Promise<Perfil | null> {
    const { data, error } = await supabase
      .from("perfis")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (error) throw error;
    return data ? perfilFromRow(data) : null;
  }
  async upsert(input: PerfilInput): Promise<Perfil> {
    const { data, error } = await supabase
      .from("perfis")
      .upsert(
        {
          id: input.id,
          nome_exibicao: input.nomeExibicao,
          email: input.email,
          atualizado_em: agoraISO(),
        },
        { onConflict: "id" },
      )
      .select()
      .single();
    if (error) throw error;
    return perfilFromRow(data);
  }
}

export const perfilRepository: PerfilRepository = new SupabasePerfilRepository();
