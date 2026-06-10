"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { alertasConfigRepository } from "@/lib/repository";
import { btnPrimary } from "@/lib/ui";

type Estado = "ok" | "erro" | null;

export function AlertasSection() {
  const [ativo, setAtivo] = useState(true);
  const [incluirAtividades, setIncluirAtividades] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState<{ estado: Estado; msg: string } | null>(
    null,
  );

  useEffect(() => {
    let ativoMounted = true;
    (async () => {
      try {
        const cfg = await alertasConfigRepository.get();
        if (ativoMounted) {
          setAtivo(cfg.ativo);
          setIncluirAtividades(cfg.incluirAtividades);
        }
      } catch {
        /* mantém defaults */
      }
      if (ativoMounted) setCarregando(false);
    })();
    return () => {
      ativoMounted = false;
    };
  }, []);

  async function toggle() {
    const novo = !ativo;
    setSalvando(true);
    setAtivo(novo); // otimista
    try {
      await alertasConfigRepository.update({ ativo: novo });
    } catch (e) {
      setAtivo(!novo); // reverte
      const msg = e instanceof Error ? e.message : String(e);
      setResultado({ estado: "erro", msg: `Falha ao salvar: ${msg}` });
    }
    setSalvando(false);
  }

  async function toggleAtividades() {
    const novo = !incluirAtividades;
    setSalvando(true);
    setIncluirAtividades(novo); // otimista
    try {
      await alertasConfigRepository.update({ incluirAtividades: novo });
    } catch (e) {
      setIncluirAtividades(!novo); // reverte
      const msg = e instanceof Error ? e.message : String(e);
      setResultado({ estado: "erro", msg: `Falha ao salvar: ${msg}` });
    }
    setSalvando(false);
  }

  async function testarAgora() {
    setTestando(true);
    setResultado(null);
    try {
      const { data, error } = await supabase.functions.invoke("alertas-diarios", {
        body: { forcar: true },
      });
      if (error) throw error;
      const detalhes = (data?.detalhes ?? []) as Array<{
        destinatario: string;
        totalAlertas: number;
        ok: boolean;
      }>;
      if (detalhes.length === 0) {
        setResultado({
          estado: "ok",
          msg: "Função executou — nenhum alerta para enviar agora.",
        });
      } else {
        const resumo = detalhes
          .map((d) => `${d.destinatario} (${d.totalAlertas})`)
          .join(", ");
        setResultado({
          estado: "ok",
          msg: `Emails enviados para: ${resumo}`,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setResultado({ estado: "erro", msg: `Falhou: ${msg}` });
    } finally {
      setTestando(false);
    }
  }

  return (
    <section
      aria-label="Alertas por email"
      className="rounded-2xl border border-navy-100 dark:border-dark-border bg-navy-50 dark:bg-dark-elevated/40 p-4 sm:p-5"
    >
      <h2 className="text-sm font-semibold text-navy-900 dark:text-gibelo-offwhite">Alertas por email</h2>
      <p className="mt-0.5 text-xs text-navy-700 dark:text-gibelo-areia">
        Resumo diário enviado às 07h00 (horário de Brasília) com deals parados,
        retornos vencidos, tarefas vencidas e atividades do quadro — agrupado
        por responsável.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={ativo}
          aria-label="Ativar alertas diários por email"
          disabled={carregando || salvando}
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-navy-500/30 disabled:opacity-50 ${
            ativo ? "bg-navy-900" : "bg-navy-200"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-dark-surface shadow transition-transform ${
              ativo ? "translate-x-6" : "translate-x-1"
            }`}
            aria-hidden="true"
          />
        </button>
        <span className="text-sm text-navy-700 dark:text-gibelo-offwhite">
          {carregando
            ? "Carregando…"
            : ativo
              ? "Alertas diários ativados"
              : "Alertas diários desativados"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={incluirAtividades}
          aria-label="Incluir alertas de atividades no email diário"
          disabled={carregando || salvando}
          onClick={toggleAtividades}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-navy-500/30 disabled:opacity-50 ${
            incluirAtividades ? "bg-navy-900" : "bg-navy-200"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-dark-surface shadow transition-transform ${
              incluirAtividades ? "translate-x-6" : "translate-x-1"
            }`}
            aria-hidden="true"
          />
        </button>
        <span className="text-sm text-navy-700 dark:text-gibelo-offwhite">
          Incluir alertas de atividades
          <span className="block text-xs text-navy-700 dark:text-gibelo-areia">
            Cards do quadro vencendo hoje ou vencidos, com checklist pendente.
          </span>
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-navy-100 dark:border-dark-border pt-4">
        <div className="flex-1 min-w-[12rem]">
          <p className="text-xs font-medium text-navy-700 dark:text-gibelo-offwhite">Testar agora</p>
          <p className="mt-0.5 text-xs text-navy-700 dark:text-gibelo-areia">
            Dispara a função imediatamente, ignorando o toggle, e envia emails
            reais.
          </p>
        </div>
        <button
          type="button"
          onClick={testarAgora}
          disabled={testando}
          className={btnPrimary}
        >
          {testando ? "Enviando…" : "Disparar"}
        </button>
      </div>

      {resultado && (
        <div
          role="status"
          className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
            resultado.estado === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {resultado.msg}
        </div>
      )}

      <p className="mt-4 text-[11px] text-navy-700 dark:text-gibelo-areia">
        Horário fixo no Supabase (cron <code>0 10 * * *</code> UTC). Para alterar,
        edite a função <code>alertas-diarios</code> e o agendamento pg_cron.
      </p>
    </section>
  );
}
