"use client";

import { useState } from "react";
import type { AtividadeCard as TCard, AtividadeLista } from "@/lib/types";
import { corSwatch } from "@/lib/atividade-cores";
import { formatDateBR } from "@/lib/format";

interface AtividadeCardProps {
  card: TCard;
  listas: AtividadeLista[];
  onAbrir: (card: TCard) => void;
  onMover: (cardId: string, listaId: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  arrastando: boolean;
}

export function AtividadeCard({
  card,
  listas,
  onAbrir,
  onMover,
  onDragStart,
  onDragEnd,
  arrastando,
}: AtividadeCardProps) {
  const [menu, setMenu] = useState(false);
  const swatch = corSwatch(card.cor);
  const outras = listas.filter((l) => l.id !== card.listaId);

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onClick={() => onAbrir(card)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAbrir(card);
        }
      }}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", card.id);
        onDragStart(card.id);
      }}
      onDragEnd={onDragEnd}
      aria-label={`Card ${card.titulo}. Abrir para editar.`}
      className={`group relative cursor-grab overflow-hidden rounded-xl border border-navy-100 bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover active:cursor-grabbing ${
        arrastando ? "opacity-40" : ""
      }`}
    >
      {swatch && <div className={`h-1.5 w-full ${swatch}`} aria-hidden="true" />}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug text-navy-900">
            {card.titulo}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenu((v) => !v);
            }}
            aria-label="Mover card para outra lista"
            aria-haspopup="menu"
            aria-expanded={menu}
            className="-mr-1 -mt-0.5 shrink-0 rounded-md p-1 text-navy-300 transition-colors hover:bg-navy-50 hover:text-navy-700"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="8" cy="3.5" r="1.3" fill="currentColor" />
              <circle cx="8" cy="8" r="1.3" fill="currentColor" />
              <circle cx="8" cy="12.5" r="1.3" fill="currentColor" />
            </svg>
          </button>
        </div>

        {card.descricao && (
          <p className="mt-1 line-clamp-2 text-xs text-navy-500">
            {card.descricao}
          </p>
        )}

        {card.data && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-navy-50 px-1.5 py-0.5 text-[11px] font-medium text-navy-500">
            <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M5 1v2M11 1v2M2.5 6.5h11M3 3h10a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z"
                stroke="currentColor"
                strokeWidth="1.1"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
            {formatDateBR(card.data)}
          </span>
        )}
      </div>

      {menu && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              setMenu(false);
            }}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-2 top-9 z-20 w-44 overflow-hidden rounded-lg border border-navy-100 bg-white py-1 shadow-card-hover"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-navy-300">
              Mover para
            </p>
            {outras.length === 0 ? (
              <p className="px-3 py-1.5 text-xs text-navy-400">
                Não há outras listas.
              </p>
            ) : (
              outras.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMover(card.id, l.id);
                    setMenu(false);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-navy-700 transition-colors hover:bg-navy-50"
                >
                  {l.nome}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
