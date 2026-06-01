"use client";

import { EQUIPE, iniciaisOuFallback, nomeOuEmail } from "@/lib/equipe";
import { usePerfis } from "@/lib/crm-store";

/**
 * Seção "Equipe" de Configurações (read-only). Lista os usuários autorizados
 * (fonte canônica em lib/equipe.ts, sincronizada com o Supabase Auth) e o
 * nome de exibição resolvido via tabela `perfis`. A gestão de acesso e a
 * edição do próprio nome continuam no dashboard Supabase / menu de perfil —
 * esta seção apenas dá visibilidade de quem tem acesso ao CRM.
 */
export function EquipeSection() {
  const { perfis } = usePerfis();

  return (
    <section
      aria-label="Equipe"
      className="rounded-2xl border border-navy-100 bg-navy-50 p-4 dark:border-dark-border dark:bg-dark-elevated/40 sm:p-5"
    >
      <h2 className="text-sm font-semibold text-navy-900 dark:text-gibelo-offwhite">
        Equipe
      </h2>
      <p className="mt-0.5 text-xs text-navy-700 dark:text-gibelo-areia">
        Usuários com acesso ao CRM. O nome de exibição é editável no menu de
        perfil; a criação/remoção de acessos é feita no Supabase.
      </p>

      <ul className="mt-4 space-y-2">
        {EQUIPE.map((m) => (
          <li
            key={m.email}
            className="flex items-center gap-3 rounded-lg border border-navy-100 bg-white p-2 dark:border-dark-border dark:bg-dark-surface"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white"
              aria-hidden="true"
            >
              {iniciaisOuFallback(m.email, perfis)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-navy-900 dark:text-gibelo-offwhite">
                {nomeOuEmail(m.email, perfis)}
              </p>
              <p className="truncate text-xs text-navy-700 dark:text-gibelo-areia">
                {m.email}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
