"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { AtividadeCard as TCard, AtividadeLista, ListaCor } from "@/lib/types";
import { LISTA_CORES, listaDot, listaHeader } from "@/lib/atividade-cores";
import { AtividadeCard } from "./AtividadeCard";
import { EditableText } from "./EditableText";

interface AtividadeColunaProps {
  lista: AtividadeLista;
  cards: TCard[];
  listas: AtividadeLista[];
  posicao: number;
  total: number;
  onAbrirCard: (card: TCard) => void;
  onNovoCard: (listaId: string) => void;
  onMoverCard: (cardId: string, listaId: string) => void;
  onPintarLista: (id: string, cor: ListaCor) => void;
  onRenomear: (id: string, nome: string) => void;
  onRemover: (id: string) => void;
  onMoverLista: (id: string, dir: -1 | 1) => void;
}

function SeletorCorLista({
  cor,
  nome,
  onChange,
}: {
  cor: ListaCor;
  nome: string;
  onChange: (cor: ListaCor) => void;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={`Cor da lista ${nome}`}
        aria-haspopup="menu"
        aria-expanded={aberto}
        className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-white/50"
      >
        <span
          className={`h-3.5 w-3.5 rounded-full ring-1 ring-black/10 ${listaDot(cor)}`}
        />
      </button>
      {aberto && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setAberto(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 top-8 z-20 grid grid-cols-4 gap-1.5 rounded-lg border border-navy-100 bg-white p-2 shadow-card-hover"
          >
            {LISTA_CORES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="menuitemradio"
                aria-checked={c.id === cor}
                aria-label={c.nome}
                onClick={() => {
                  onChange(c.id);
                  setAberto(false);
                }}
                className={`h-6 w-6 rounded-full ${c.dot} ${
                  c.id === cor ? "ring-2 ring-navy-600 ring-offset-1" : ""
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function AtividadeColuna({
  lista,
  cards,
  listas,
  posicao,
  total,
  onAbrirCard,
  onNovoCard,
  onMoverCard,
  onPintarLista,
  onRenomear,
  onRemover,
  onMoverLista,
}: AtividadeColunaProps) {
  const { setNodeRef, isOver } = useDroppable({ id: lista.id });
  const itemIds = cards.map((c) => c.id);
  const btn =
    "rounded-md p-1 text-navy-600 transition-colors hover:bg-white/60 disabled:opacity-30";

  return (
    <section
      aria-label={`Lista ${lista.nome}, ${cards.length} cards`}
      className="flex w-[280px] shrink-0 flex-col rounded-2xl bg-navy-100/50 sm:w-[300px]"
    >
      <header
        className={`flex items-center gap-1 rounded-t-2xl px-2.5 py-2 ${listaHeader(lista.cor)}`}
      >
        <EditableText
          value={lista.nome}
          onCommit={(nome) => onRenomear(lista.id, nome)}
          ariaLabel={`Renomear lista ${lista.nome}`}
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm font-semibold text-inherit hover:border-white/60 focus:border-white focus:bg-white/80 focus:text-navy-900 focus:outline-none focus:ring-2 focus:ring-white/70"
        />
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-navy-700">
          {cards.length}
        </span>
        <SeletorCorLista
          cor={lista.cor}
          nome={lista.nome}
          onChange={(cor) => onPintarLista(lista.id, cor)}
        />
        <button
          type="button"
          onClick={() => onMoverLista(lista.id, -1)}
          disabled={posicao === 0}
          aria-label={`Mover lista ${lista.nome} para a esquerda`}
          className={btn}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onMoverLista(lista.id, 1)}
          disabled={posicao === total - 1}
          aria-label={`Mover lista ${lista.nome} para a direita`}
          className={btn}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onRemover(lista.id)}
          aria-label={`Excluir lista ${lista.nome}`}
          className="rounded-md p-1 text-navy-600 transition-colors hover:bg-red-100 hover:text-red-600"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2.5 4h11M6 4V2.5h4V4M5 4l.5 9h5l.5-9" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2.5 px-2.5 pt-2.5 pb-1 transition-colors ${
          isOver ? "bg-navy-200/60" : ""
        }`}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {cards.length === 0 ? (
            <p className="px-2 py-8 text-center text-xs text-navy-400">
              {isOver ? "Solte aqui" : "Nenhum card"}
            </p>
          ) : (
            cards.map((card) => (
              <AtividadeCard
                key={card.id}
                card={card}
                listas={listas}
                onAbrir={onAbrirCard}
                onMover={onMoverCard}
              />
            ))
          )}
        </SortableContext>
      </div>

      <div className="p-2.5 pt-1.5">
        <button
          type="button"
          onClick={() => onNovoCard(lista.id)}
          className="w-full rounded-lg border border-dashed border-navy-200 px-3 py-2 text-sm font-medium text-navy-500 transition-colors hover:border-navy-300 hover:bg-white hover:text-navy-700"
        >
          + Adicionar card
        </button>
      </div>
    </section>
  );
}
