"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DealServico } from "@/lib/types";
import { useServicos } from "@/lib/crm-store";
import { formatBRL, parseValorBRL } from "@/lib/format";
import { inputCls, labelCls } from "@/lib/ui";

interface DealServicosProps {
  dealId: string;
  /** Recebe a soma sempre que os itens mudam. Usado pelo DealForm para
   *  espelhar no campo "Valor (R$)" e travar a entrada manual quando há itens. */
  onTotalChange: (total: number, qtd: number) => void;
}

const SUGESTOES = [
  "Projeto estrutural",
  "Projeto de fundações",
  "Laudo técnico",
  "Acompanhamento de obra",
  "Memorial de cálculo",
  "Consultoria técnica",
];

const SUGESTOES_LIST_ID = "deal-servicos-sugestoes";

export function DealServicos({ dealId, onTotalChange }: DealServicosProps) {
  const { servicos, criar, atualizar, remover } = useServicos();
  const itens = useMemo(
    () =>
      servicos
        .filter((s) => s.dealId === dealId)
        .sort((a, b) => a.ordem - b.ordem),
    [servicos, dealId],
  );

  const total = useMemo(
    () => itens.reduce((acc, s) => acc + (Number(s.valor) || 0), 0),
    [itens],
  );

  // Buffers locais por id para edição sem flicker em cada keystroke.
  const [rascunho, setRascunho] = useState<
    Record<string, { descricao: string; valor: number }>
  >({});

  const onTotalChangeRef = useRef(onTotalChange);
  onTotalChangeRef.current = onTotalChange;
  useEffect(() => {
    onTotalChangeRef.current(total, itens.length);
  }, [total, itens.length]);

  function bufferDe(s: DealServico) {
    return (
      rascunho[s.id] ?? { descricao: s.descricao, valor: s.valor }
    );
  }

  function setBuf(id: string, patch: Partial<{ descricao: string; valor: number }>) {
    setRascunho((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { descricao: "", valor: 0 }), ...patch },
    }));
  }

  async function salvarBuffer(s: DealServico) {
    const buf = rascunho[s.id];
    if (!buf) return;
    const novoDesc = buf.descricao.trim();
    const novoValor = Number.isFinite(buf.valor) ? buf.valor : 0;
    if (novoDesc === s.descricao && novoValor === s.valor) {
      setRascunho((prev) => {
        const c = { ...prev };
        delete c[s.id];
        return c;
      });
      return;
    }
    await atualizar(s.id, { descricao: novoDesc || s.descricao, valor: novoValor });
    setRascunho((prev) => {
      const c = { ...prev };
      delete c[s.id];
      return c;
    });
  }

  async function adicionar() {
    const proxOrdem =
      itens.length > 0 ? Math.max(...itens.map((i) => i.ordem)) + 1 : 0;
    await criar({
      dealId,
      descricao: "",
      valor: 0,
      ordem: proxOrdem,
    });
  }

  async function remoreItem(id: string) {
    await remover(id);
    setRascunho((prev) => {
      const c = { ...prev };
      delete c[id];
      return c;
    });
  }

  return (
    <fieldset className="mt-5 rounded-xl border border-navy-100 p-4">
      <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-navy-500">
        Serviços
      </legend>

      <datalist id={SUGESTOES_LIST_ID}>
        {SUGESTOES.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {itens.length === 0 ? (
        <p className="text-xs text-navy-400">
          Sem itens. Adicione serviços para detalhar o escopo do negócio. O valor do
          deal será a soma dos itens.
        </p>
      ) : (
        <ul className="space-y-2">
          {itens.map((s) => {
            const buf = bufferDe(s);
            return (
              <li
                key={s.id}
                className="grid grid-cols-1 gap-2 rounded-lg bg-navy-50 p-2 sm:grid-cols-[1fr_160px_auto]"
              >
                <div>
                  <label
                    htmlFor={`srv-desc-${s.id}`}
                    className={`${labelCls} sr-only`}
                  >
                    Descrição
                  </label>
                  <input
                    id={`srv-desc-${s.id}`}
                    type="text"
                    list={SUGESTOES_LIST_ID}
                    value={buf.descricao}
                    onChange={(e) => setBuf(s.id, { descricao: e.target.value })}
                    onBlur={() => salvarBuffer(s)}
                    placeholder="Descrição do serviço"
                    className={inputCls}
                    aria-label="Descrição do serviço"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`srv-val-${s.id}`}
                    className={`${labelCls} sr-only`}
                  >
                    Valor
                  </label>
                  <input
                    id={`srv-val-${s.id}`}
                    type="text"
                    inputMode="numeric"
                    value={buf.valor > 0 ? formatBRL(buf.valor) : ""}
                    onChange={(e) =>
                      setBuf(s.id, { valor: parseValorBRL(e.target.value) })
                    }
                    onBlur={() => salvarBuffer(s)}
                    placeholder="R$ 0,00"
                    className={inputCls}
                    aria-label="Valor do serviço"
                  />
                </div>
                <div className="flex items-center justify-end sm:items-start sm:pt-1">
                  <button
                    type="button"
                    onClick={() => remoreItem(s.id)}
                    aria-label={`Remover serviço ${s.descricao || "sem descrição"}`}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    Remover
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={adicionar}
          className="rounded-lg border border-navy-200 px-3 py-1.5 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-50"
          aria-label="Adicionar serviço"
        >
          + Adicionar serviço
        </button>
        {itens.length > 0 && (
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-navy-400">
              Total ({itens.length} {itens.length === 1 ? "item" : "itens"})
            </p>
            <p className="text-base font-semibold text-navy-900">
              {formatBRL(total)}
            </p>
          </div>
        )}
      </div>
    </fieldset>
  );
}
