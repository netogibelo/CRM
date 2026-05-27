"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DealServico, TipoServico } from "@/lib/types";
import { useServicos, useTiposServico } from "@/lib/crm-store";
import { formatBRL, parseValorBRL } from "@/lib/format";
import { inputCls, labelCls } from "@/lib/ui";

interface DealServicosProps {
  dealId: string;
  /** Recebe a soma sempre que os itens persistidos mudam. Usado pelo DealForm
   *  para espelhar no campo "Valor (R$)" e travar a entrada manual. */
  onTotalChange: (total: number, qtd: number) => void;
}

const OUTRO = "__outro__";

/** Decide o estado inicial do select para uma descrição persistida:
 *  - se bate com algum tipo ativo → seleciona esse tipo
 *  - vazio → select vazio
 *  - texto livre → modo "Outro" + input revelado */
function modoInicial(
  descricao: string,
  tipos: TipoServico[],
): { selectValue: string; texto: string } {
  if (!descricao) return { selectValue: "", texto: "" };
  const hit = tipos.find((t) => t.nome === descricao);
  if (hit) return { selectValue: hit.id, texto: "" };
  return { selectValue: OUTRO, texto: descricao };
}

// ── Linha (cada serviço gerencia seu próprio estado de edição) ──────────────
//
// Refactor anterior já isolou estado por linha e introduziu o ✓ explícito;
// agora a descrição é um <select> com as opções de tipos_servico + uma opção
// "Outro" que revela um input livre. Isso elimina o problema do datalist que
// não reabria após selecionar — selects são nativamente reabertos pelo browser.
function ServicoRow({
  servico,
  tipos,
  onAtualizar,
  onRemover,
}: {
  servico: DealServico;
  tipos: TipoServico[];
  onAtualizar: (
    id: string,
    patch: Partial<{ descricao: string; valor: number }>,
  ) => Promise<unknown>;
  onRemover: (id: string) => Promise<void>;
}) {
  const inicial = useMemo(() => modoInicial(servico.descricao, tipos), [
    servico.descricao,
    tipos,
  ]);
  const [selectValue, setSelectValue] = useState(inicial.selectValue);
  const [texto, setTexto] = useState(inicial.texto);
  const [valor, setValor] = useState(servico.valor);
  const [salvando, setSalvando] = useState(false);

  // Re-sincroniza quando o item upstream muda (após confirmar ou edição externa).
  useEffect(() => {
    setSelectValue(inicial.selectValue);
    setTexto(inicial.texto);
  }, [inicial.selectValue, inicial.texto]);
  useEffect(() => {
    setValor(servico.valor);
  }, [servico.valor]);

  const descricaoFinal = (() => {
    if (selectValue === OUTRO) return texto.trim();
    if (!selectValue) return "";
    return tipos.find((t) => t.id === selectValue)?.nome ?? "";
  })();

  const dirty =
    descricaoFinal !== servico.descricao.trim() || valor !== servico.valor;

  async function salvar() {
    if (!dirty || salvando) return;
    // Quando o usuário escolheu "Outro" mas não digitou nada, não persiste vazio.
    const descParaPersistir = descricaoFinal || servico.descricao;
    setSalvando(true);
    try {
      await onAtualizar(servico.id, {
        descricao: descParaPersistir,
        valor: Number.isFinite(valor) ? valor : 0,
      });
    } finally {
      setSalvando(false);
    }
  }

  function onKeyDownSalvar(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      salvar();
    }
  }

  return (
    <li className="grid grid-cols-1 gap-2 rounded-lg bg-navy-50 p-2 sm:grid-cols-[1fr_160px_auto]">
      <div>
        <label htmlFor={`srv-desc-${servico.id}`} className={`${labelCls} sr-only`}>
          Descrição do serviço
        </label>
        <select
          id={`srv-desc-${servico.id}`}
          value={selectValue}
          onChange={(e) => {
            const v = e.target.value;
            setSelectValue(v);
            if (v !== OUTRO) setTexto("");
          }}
          onKeyDown={onKeyDownSalvar}
          className={inputCls}
          aria-label="Tipo de serviço"
          disabled={salvando}
        >
          <option value="">Selecione um tipo…</option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
          <option value={OUTRO}>✏️ Outro (digitar manualmente)</option>
        </select>
        {selectValue === OUTRO && (
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={onKeyDownSalvar}
            placeholder="Descreva o serviço"
            className={`${inputCls} mt-2`}
            aria-label="Descrição livre do serviço"
            disabled={salvando}
            autoFocus={!texto}
          />
        )}
      </div>
      <div>
        <label htmlFor={`srv-val-${servico.id}`} className={`${labelCls} sr-only`}>
          Valor
        </label>
        <input
          id={`srv-val-${servico.id}`}
          type="text"
          inputMode="numeric"
          value={valor > 0 ? formatBRL(valor) : ""}
          onChange={(e) => setValor(parseValorBRL(e.target.value))}
          onKeyDown={onKeyDownSalvar}
          placeholder="R$ 0,00"
          className={inputCls}
          aria-label="Valor do serviço"
          disabled={salvando}
        />
      </div>
      <div className="flex items-center justify-end gap-1 sm:items-start sm:pt-1">
        <button
          type="button"
          onClick={salvar}
          disabled={!dirty || salvando}
          aria-label="Salvar serviço"
          title={dirty ? "Salvar alterações" : "Sem alterações pendentes"}
          className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
            dirty
              ? "bg-navy-900 text-white hover:bg-navy-800"
              : "border border-navy-200 text-navy-300"
          } disabled:opacity-60`}
        >
          {salvando ? "…" : "✓"}
        </button>
        <button
          type="button"
          onClick={() => onRemover(servico.id)}
          aria-label={`Remover serviço ${servico.descricao || "sem descrição"}`}
          disabled={salvando}
          className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          Remover
        </button>
      </div>
    </li>
  );
}

export function DealServicos({ dealId, onTotalChange }: DealServicosProps) {
  const { servicos, criar, atualizar, remover } = useServicos();
  const { ativos: tiposAtivos } = useTiposServico();

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

  const onTotalChangeRef = useRef(onTotalChange);
  onTotalChangeRef.current = onTotalChange;
  useEffect(() => {
    onTotalChangeRef.current(total, itens.length);
  }, [total, itens.length]);

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

  return (
    <fieldset className="mt-5 rounded-xl border border-navy-100 p-4">
      <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-navy-500">
        Serviços
      </legend>

      {itens.length === 0 ? (
        <p className="text-xs text-navy-400">
          Sem itens. Adicione serviços para detalhar o escopo do negócio. O valor
          do deal será a soma dos itens.
        </p>
      ) : (
        <ul className="space-y-2">
          {itens.map((s) => (
            <ServicoRow
              key={s.id}
              servico={s}
              tipos={tiposAtivos}
              onAtualizar={(id, patch) => atualizar(id, patch)}
              onRemover={remover}
            />
          ))}
        </ul>
      )}

      {itens.length > 0 && (
        <p className="mt-2 text-[11px] text-navy-400">
          Editou um campo? Pressione Enter ou clique ✓ para salvar.
        </p>
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
