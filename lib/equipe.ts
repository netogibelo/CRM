// Equipe Gibelo — fonte canônica dos usuários do CRM.
//
// Esses são os emails autorizados no Supabase Auth e usados em campos como
// "responsável por deal" e "responsável pela tarefa". Manter sincronizado
// com Authentication → Users no dashboard Supabase.
//
// Nome de exibição: cada usuário pode customizar via tabela `perfis`. Os
// fallbacks abaixo são usados quando o perfil ainda não foi criado.

import type { Perfil } from "./types";

export interface MembroEquipe {
  email: string;
  nome: string;
  iniciais: string;
}

export const EQUIPE: MembroEquipe[] = [
  { email: "netogibelo@gmail.com", nome: "Neto Gibelo", iniciais: "NG" },
  {
    email: "estagiogibeloengenharia@gmail.com",
    nome: "Estágio Gibelo",
    iniciais: "EG",
  },
  {
    email: "re.oliveiragibelo@gmail.com",
    nome: "Renata Oliveira Gibelo",
    iniciais: "RO",
  },
];

export function membroPorEmail(email: string | null | undefined): MembroEquipe | null {
  if (!email) return null;
  return EQUIPE.find((m) => m.email === email) ?? null;
}

/**
 * Resolve o nome de exibição preferindo, na ordem:
 *   1. perfil.nome_exibicao (custom do usuário)
 *   2. EQUIPE.nome (fallback hardcoded)
 *   3. prefixo do email antes do @
 *   4. literal "—"
 */
export function nomeOuEmail(
  email: string | null | undefined,
  perfis: Perfil[] = [],
): string {
  if (!email) return "—";
  const perfil = perfis.find((p) => p.email === email);
  if (perfil && perfil.nomeExibicao.trim()) return perfil.nomeExibicao;
  const m = membroPorEmail(email);
  if (m) return m.nome;
  const local = email.split("@")[0];
  return local || email;
}

function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function iniciaisOuFallback(
  email: string | null | undefined,
  perfis: Perfil[] = [],
): string {
  if (!email) return "?";
  const perfil = perfis.find((p) => p.email === email);
  if (perfil && perfil.nomeExibicao.trim()) {
    return iniciaisDoNome(perfil.nomeExibicao);
  }
  const m = membroPorEmail(email);
  if (m) return m.iniciais;
  return email.slice(0, 2).toUpperCase();
}
