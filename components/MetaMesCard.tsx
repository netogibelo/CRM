"use client";

import { useEffect, useMemo, useState } from "react";
import { useDeals, useMetas } from "@/lib/crm-store";
import { formatBRL, parseValorBRL } from "@/lib/format";
import { mesAtual, resumoMetaMes } from "@/lib/metas";

function nomeMes(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  const d = new Date(ano, (m ?? 1) - 1, 1);
  return d
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());
}

function formatInput(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export function MetaMesCard() {
  const { deals } = useDeals();
  const { metas, salvar } = useMetas();
  const mes = mesAtual();
  const resumo = useMemo(
    () => resumoMetaMes(metas, deals, mes),
    [metas, deals, mes],
  );

  const [editando, setEditando] = useState(false);
  const [valorRaw, setValorRaw] = useState(formatInput(resumo.valorMeta));
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!editando) setValorRaw(formatInput(resumo.valorMeta));
  }, [resumo.valorMeta, editando]);

  // Cores conforme % atingido
  const cor = (() => {
    if (resumo.valorMeta <= 0) return "navy";
    if (resumo.percentual >= 100) return "emerald";
    if (resumo.percentual >= 50) return "amber";
    return "red";
  })();

  const corBar: Record<typeof cor, string> = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    navy: "bg-navy-300",
  } as const;
  const corTexto: Record<typeof cor, string> = {
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    red: "text-red-700",
    navy: "text-navy-700 dark:text-gibelo-areia",
  } as const;

  const pctClamp = Math.min(100, Math.max(0, resumo.percentual));

  async function handleSalvar() {
    const valor = parseValorBRL(valorRaw);
    setSalvando(true);
    try {
      await salvar({ mes, valorMeta: valor });
      setEditando(false);
    } finally {
      setSalvando(false);
    }
  }

  function handleCancelar() {
    setValorRaw(formatInput(resumo.valorMeta));
    setEditando(false);
  }

  return (
    <section
      aria-label="Meta do mês"
      className="rounded-xl border border-navy-100 dark:border-dark-border bg-white dark:bg-dark-surface p-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-navy-900 dark:text-gibelo-offwhite">Meta do mês</h3>
          <p className="text-xs text-navy-700 dark:text-gibelo-cinza-quente">{nomeMes(mes)}</p>
        </div>
        {!editando && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="rounded-md px-2 py-1 text-xs font-medium text-navy-700 dark:text-gibelo-areia transition-colors hover:bg-navy-50 dark:hover:bg-dark-elevated dark:bg-dark-elevated hover:text-navy-900 dark:text-gibelo-offwhite"
            aria-label="Editar meta do mês"
          >
            {resumo.valorMeta > 0 ? "Editar" : "Definir meta"}
          </button>
        )}
      </div>

      {editando ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="meta-input">
            Valor da meta em reais
          </label>
          <input
            id="meta-input"
            type="text"
            inputMode="numeric"
            value={valorRaw}
            onChange={(e) => {
              const v = parseValorBRL(e.target.value);
              setValorRaw(formatInput(v));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSalvar();
              if (e.key === "Escape") handleCancelar();
            }}
            autoFocus
            className="w-44 rounded-md border border-navy-200 dark:border-dark-border px-2 py-1.5 text-sm text-navy-900 dark:text-gibelo-offwhite focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/30"
          />
          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvando}
            className="rounded-md bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-navy-700 disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Salvar"}
          </button>
          <button
            type="button"
            onClick={handleCancelar}
            disabled={salvando}
            className="rounded-md border border-navy-200 dark:border-dark-border px-3 py-1.5 text-xs font-medium text-navy-700 dark:text-gibelo-offwhite transition-colors hover:bg-navy-50 dark:hover:bg-dark-elevated dark:bg-dark-elevated"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-navy-900 dark:text-gibelo-offwhite">
              {formatBRL(resumo.valorAtual)}
            </span>
            <span className="text-xs text-navy-700 dark:text-gibelo-cinza-quente">
              de {formatBRL(resumo.valorMeta)}
            </span>
          </div>

          <div
            className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-navy-100 dark:bg-dark-elevated"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pctClamp)}
            aria-label={`Meta atingida em ${Math.round(pctClamp)} por cento`}
          >
            <div
              className={`h-full rounded-full transition-all ${corBar[cor]}`}
              style={{ width: `${pctClamp}%` }}
            />
          </div>

          <div className="mt-2 flex items-baseline justify-between text-xs">
            <span className={`font-semibold ${corTexto[cor]}`}>
              {resumo.valorMeta > 0
                ? `${Math.round(resumo.percentual)}% atingido`
                : "Defina a meta deste mês"}
            </span>
            {resumo.valorMeta > 0 && resumo.faltante > 0 && (
              <span className="text-navy-700 dark:text-gibelo-cinza-quente">
                Falta {formatBRL(resumo.faltante)}
              </span>
            )}
            {resumo.valorMeta > 0 && resumo.faltante === 0 && (
              <span className="text-emerald-600">Meta atingida</span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
