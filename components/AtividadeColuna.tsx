"use client";

import { useState } from "react";
import type { AtividadeCard as TCard, AtividadeLista } from "@/lib/types";
import { AtividadeCard } from "./AtividadeCard";

interface AtividadeColunaProps {
  lista: AtividadeLista;
  cards: TCard[];
  listas: AtividadeLista[];
  posicao: number;
  total: number;
  onAbrirCard: (card: TCard) => void;
  onNovoCard: (listaId: string) => void;
  onMoverCard: (cardId: string, listaId: string) => void;
  onRenomear: (id: string, nome: string) => void;
  onRemover: (id: string) => void;
  onMoverLista: (id: string, dir: -1 | 1) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  arrastandoId: string | null;
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
  onRenomear,
  onRemover,
  onMoverLista,
  onDragStart,
  onDragEnd,
  arrastandoId,
}: AtividadeColunaProps) {
  const [sobre, setSobre] = useState(false);
  const [nome, setNome] = useState(lista.nome);

  return (
    <section
      aria-label={`Lista ${lista.nome}, ${cards.length} cards`}
      className="flex w-[280px] shrink-0 flex-col rounded-2xl bg-navy-100/50 sm:w-[300px]"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!sobre) setSobre(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setSobre(false);
        const id = e.dataTransfer.getData("text/plain");
        if (id) onMoverCard(id, lista.id);
      }}
    >
      <header className="flex items-center gap-1 px-2.5 pb-2 pt-3">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={() => {
            const t = nome.trim();
            if (t && t !== lista.nome) onRenomear(lista.id, t);
            else setNome(lista.nome);
          }}
          aria-label={`Renomear lista ${lista.nome}`}
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm font-semibold text-navy-800 hover:border-navy-200 focus:border-navy-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-500/30"
        />
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-navy-500">
          {cards.length}
        </span>
        <button
          type="button"
          onClick={() => onMoverLista(lista.id, -1)}
          disabled={posicao === 0}
          aria-label={`Mover lista ${lista.nome} para a esquerda`}
          className="rounded-md p-1 text-navy-400 transition-colors hover:bg-white hover:text-navy-700 disabled:opacity-30"
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
          className="rounded-md p-1 text-navy-400 transition-colors hover:bg-white hover:text-navy-700 disabled:opacity-30"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onRemover(lista.id)}
          aria-label={`Excluir lista ${lista.nome}`}
          className="rounded-md p-1 text-navy-400 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2.5 4h11M6 4V2.5h4V4M5 4l.5 9h5l.5-9" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      <div
        className={`flex flex-1 flex-col gap-2.5 rounded-xl px-2.5 pb-1 transition-colors ${
          sobre ? "bg-navy-200/60" : ""
        }`}
      >
        {cards.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-navy-400">
            {sobre ? "Solte aqui" : "Nenhum card"}
          </p>
        ) : (
          cards.map((card) => (
            <AtividadeCard
              key={card.id}
              card={card}
              listas={listas}
              onAbrir={onAbrirCard}
              onMover={onMoverCard}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              arrastando={arrastandoId === card.id}
            />
          ))
        )}
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
