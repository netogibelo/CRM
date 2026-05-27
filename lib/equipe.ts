// Equipe Gibelo — fonte canônica dos usuários do CRM.
//
// Esses são os emails autorizados no Supabase Auth e usados em campos como
// "responsável por deal" e "responsável pela tarefa". Manter sincronizado
// com Authentication → Users no dashboard Supabase.

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

export function nomeOuEmail(email: string | null | undefined): string {
  return membroPorEmail(email)?.nome ?? email ?? "—";
}

export function iniciaisOuFallback(email: string | null | undefined): string {
  const m = membroPorEmail(email);
  if (m) return m.iniciais;
  if (!email) return "?";
  return email.slice(0, 2).toUpperCase();
}
