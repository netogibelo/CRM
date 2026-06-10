// Repositório da configuração de alertas diários por email (tabela singleton
// alertas_config, id fixo = 1). A Edge Function alertas-diarios consome a
// mesma tabela para decidir se envia.

import { agoraISO } from "../id";
import { supabase } from "../supabase";

export interface AlertasConfig {
  ativo: boolean;
  incluirAtividades: boolean;
}

export interface AlertasConfigRepository {
  get(): Promise<AlertasConfig>;
  update(patch: Partial<AlertasConfig>): Promise<void>;
}

class SupabaseAlertasConfigRepository implements AlertasConfigRepository {
  async get(): Promise<AlertasConfig> {
    const { data, error } = await supabase
      .from("alertas_config")
      .select("ativo, incluir_atividades")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return {
      ativo: data ? Boolean(data.ativo) : true,
      incluirAtividades: data ? data.incluir_atividades !== false : true,
    };
  }
  async update(patch: Partial<AlertasConfig>): Promise<void> {
    const row: Record<string, unknown> = { atualizado_em: agoraISO() };
    if (patch.ativo !== undefined) row.ativo = patch.ativo;
    if (patch.incluirAtividades !== undefined) {
      row.incluir_atividades = patch.incluirAtividades;
    }
    const { error } = await supabase
      .from("alertas_config")
      .update(row)
      .eq("id", 1);
    if (error) throw error;
  }
}

export const alertasConfigRepository: AlertasConfigRepository =
  new SupabaseAlertasConfigRepository();
