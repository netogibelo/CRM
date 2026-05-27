"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { btnPrimary } from "@/lib/ui";

type Estado = "ok" | "erro" | null;

export function AlertasSection() {
  const [ativo, setAtivo] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState<{ estado: Estado; msg: string } | null>(
    null,
  );

  useEffect(() => {
    let ativoMounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("alertas_config")
        .select("ativo")
        .eq("id", 1)
        .maybeSingle();
      if (ativoMounted) {
        if (!error && data) setAtivo(Boolean(data.ativo));
        setCarregando(false);
      }
    })();
    return () => {
      ativoMounted = false;
    };
  }, []);

  async function toggle() {
    const novo = !ativo;
    setSalvando(true);
    setAtivo(novo); // otimista
    const { error } = await supabase
      .from("alertas_config")
      .update({ ativo: novo, atualizado_em: new Date().toISOString() })
      .eq("id", 1);
    if (error) {
      setAtivo(!novo); // reverte
      setResultado({ estado: "erro", msg: `Falha ao salvar: ${error.message}` });
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
      className="rounded-2xl border border-navy-100 bg-navy-50/40 p-4 sm:p-5 lg:col-span-2"
    >
      <h2 className="text-sm font-semibold text-navy-900">Alertas por email</h2>
      <p className="mt-0.5 text-xs text-navy-400">
        Resumo diário enviado às 07h00 (horário de Brasília) com deals parados,
        retornos vencidos e tarefas vencidas — agrupado por responsável.
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
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              ativo ? "translate-x-6" : "translate-x-1"
            }`}
            aria-hidden="true"
          />
        </button>
        <span className="text-sm text-navy-700">
          {carregando
            ? "Carregando…"
            : ativo
              ? "Alertas diários ativados"
              : "Alertas diários desativados"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-navy-100 pt-4">
        <div className="flex-1 min-w-[12rem]">
          <p className="text-xs font-medium text-navy-700">Testar agora</p>
          <p className="mt-0.5 text-xs text-navy-400">
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

      <p className="mt-4 text-[11px] text-navy-400">
        Horário fixo no Supabase (cron <code>0 10 * * *</code> UTC). Para alterar,
        edite a função <code>alertas-diarios</code> e o agendamento pg_cron.
      </p>
    </section>
  );
}
