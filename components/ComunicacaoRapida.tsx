"use client";

import { useState } from "react";
import { historicoRepository } from "@/lib/repository";
import { supabase } from "@/lib/supabase";
import type { HistoricoItem } from "@/lib/types";

interface ComunicacaoRapidaProps {
  dealId: string;
  onRegistrado?: (item: HistoricoItem) => void;
}

interface Template {
  emoji: string;
  texto: string;
  aria: string;
}

const TEMPLATES: Template[] = [
  { emoji: "📞", texto: "Liguei — não atendeu", aria: "Registrar ligação não atendida" },
  { emoji: "📞", texto: "Liguei — atendeu", aria: "Registrar ligação atendida" },
  { emoji: "💬", texto: "WhatsApp enviado", aria: "Registrar WhatsApp enviado" },
  { emoji: "💬", texto: "WhatsApp respondido", aria: "Registrar WhatsApp respondido" },
  { emoji: "📧", texto: "Email enviado", aria: "Registrar email enviado" },
  { emoji: "📅", texto: "Reunião agendada", aria: "Registrar reunião agendada" },
  { emoji: "✅", texto: "Reunião realizada", aria: "Registrar reunião realizada" },
];

export function ComunicacaoRapida({ dealId, onRegistrado }: ComunicacaoRapidaProps) {
  const [registrando, setRegistrando] = useState<string | null>(null);
  const [ultimoOk, setUltimoOk] = useState<string | null>(null);

  async function registrar(template: Template) {
    if (registrando) return;
    setRegistrando(template.texto);
    setUltimoOk(null);
    try {
      const { data } = await supabase.auth.getUser();
      const item = await historicoRepository.create({
        dealId,
        tipo: "contato",
        descricao: `${template.emoji} ${template.texto}`,
        autorEmail: data.user?.email ?? null,
      });
      onRegistrado?.(item);
      setUltimoOk(template.texto);
      setTimeout(() => setUltimoOk((v) => (v === template.texto ? null : v)), 1800);
    } finally {
      setRegistrando(null);
    }
  }

  return (
    <section
      aria-label="Comunicação rápida"
      className="mt-6 rounded-xl border border-navy-100 dark:border-dark-border bg-white dark:bg-dark-surface p-4"
    >
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-navy-900 dark:text-gibelo-offwhite">Comunicação rápida</h3>
        {ultimoOk && (
          <span
            className="text-[11px] font-medium text-emerald-700"
            role="status"
            aria-live="polite"
          >
            ✓ {ultimoOk}
          </span>
        )}
      </header>
      <p className="mt-1 text-xs text-navy-700 dark:text-gibelo-areia">
        1 clique registra no histórico.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {TEMPLATES.map((t) => {
          const ocupado = registrando === t.texto;
          return (
            <button
              key={t.texto}
              type="button"
              onClick={() => registrar(t)}
              disabled={Boolean(registrando)}
              aria-label={t.aria}
              className="inline-flex items-center gap-2 rounded-lg border border-navy-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-left text-xs font-medium text-navy-700 dark:text-gibelo-offwhite transition-colors hover:border-navy-900 dark:hover:border-gibelo-areia/40 hover:bg-navy-50 dark:hover:bg-dark-elevated disabled:opacity-50 disabled:hover:border-navy-200 dark:disabled:hover:border-dark-border disabled:hover:bg-white dark:disabled:hover:bg-dark-surface"
            >
              <span aria-hidden="true" className="text-base leading-none">
                {t.emoji}
              </span>
              <span className="leading-tight">
                {ocupado ? "Registrando…" : t.texto}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
