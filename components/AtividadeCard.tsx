"use client";

import { useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AtividadeCard as TCard, AtividadeLista } from "@/lib/types";
import { cardBarra } from "@/lib/atividade-cores";
import { formatDateBR } from "@/lib/format";
import { useBoard } from "@/lib/activities-store";

interface AtividadeCardProps {
  card: TCard;
  listas: AtividadeLista[];
  onAbrir: (card: TCard) => void;
  onMover: (cardId: string, listaId: string) => void;
}

export function AtividadeCard({
  card,
  listas,
  onAbrir,
  onMover,
}: AtividadeCardProps) {
  const [menu, setMenu] = useState(false);
  const { checklistDoCard, etiquetasDoCard } = useBoard();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });
  const downPos = useRef<{ x: number; y: number } | null>(null);

  const barra = cardBarra(card.cor);
  const outras = listas.filter((l) => l.id !== card.listaId);
  const checklist = checklistDoCard(card.id);
  const concluidas = checklist.filter((i) => i.concluida).length;
  const total = checklist.length;
  const etiquetas = etiquetasDoCard(card.id);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      aria-roledescription="Card arrastável"
      // Distingue toque/clique (abre) de arraste (não abre).
      onPointerDownCapture={(e) => {
        downPos.current = { x: e.clientX, y: e.clientY };
      }}
      onClick={(e) => {
        const d = downPos.current;
        if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return;
        onAbrir(card);
      }}
      className={`group relative cursor-grab rounded-xl border border-navy-100 dark:border-dark-border bg-white dark:bg-dark-surface shadow-card transition-shadow hover:shadow-card-hover active:cursor-grabbing ${
        barra ? `border-l-4 ${barra}` : ""
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="p-3">
        {etiquetas.length > 0 && (
          <div
            className="-mt-1 mb-2 flex flex-wrap gap-1"
            aria-label={`Etiquetas: ${etiquetas.map((e) => e.nome).join(", ")}`}
          >
            {etiquetas.map((e) => (
              <span
                key={e.id}
                title={e.nome}
                className="h-1.5 w-9 rounded-full"
                style={{ backgroundColor: e.cor }}
                aria-hidden="true"
              />
            ))}
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug text-navy-900 dark:text-gibelo-offwhite">
            {card.titulo}
          </p>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setMenu((v) => !v);
            }}
            aria-label="Ações do card"
            aria-haspopup="menu"
            aria-expanded={menu}
            className="-mr-1 -mt-0.5 shrink-0 rounded-md p-1 text-navy-500 dark:text-gibelo-areia transition-colors hover:bg-navy-50 dark:hover:bg-dark-elevated dark:bg-dark-elevated hover:text-navy-700 dark:text-gibelo-offwhite"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="8" cy="3.5" r="1.3" fill="currentColor" />
              <circle cx="8" cy="8" r="1.3" fill="currentColor" />
              <circle cx="8" cy="12.5" r="1.3" fill="currentColor" />
            </svg>
          </button>
        </div>

        {card.descricao && (
          <p className="mt-1 line-clamp-2 text-xs text-navy-700 dark:text-gibelo-areia">
            {card.descricao}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {card.data && (
            <span className="inline-flex items-center gap-1 rounded-md bg-navy-50 dark:bg-dark-elevated px-1.5 py-0.5 text-[11px] font-medium text-navy-700 dark:text-gibelo-areia">
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
          {total > 0 && (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                concluidas === total
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-navy-50 text-navy-700 dark:bg-dark-elevated dark:text-gibelo-areia"
              }`}
              aria-label={`Checklist: ${concluidas} de ${total} concluídas`}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M2 4h8M2 8h8M2 12h8M13 3l1.5 1.5L13 6M13 7l1.5 1.5L13 10M13 11l1.5 1.5L13 14"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {concluidas}/{total}
              {concluidas === total ? " ✓" : ""}
            </span>
          )}
        </div>
      </div>

      {menu && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setMenu(false);
            }}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-2 top-9 z-20 w-44 overflow-hidden rounded-lg border border-navy-100 dark:border-dark-border bg-white dark:bg-dark-surface py-1 shadow-card-hover"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setMenu(false);
                onAbrir(card);
              }}
              className="block w-full px-3 py-1.5 text-left text-sm font-medium text-navy-700 dark:text-gibelo-offwhite transition-colors hover:bg-navy-50 dark:hover:bg-dark-elevated dark:bg-dark-elevated"
            >
              Editar
            </button>
            <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-navy-500 dark:text-gibelo-areia">
              Mover para
            </p>
            {outras.length === 0 ? (
              <p className="px-3 py-1.5 text-xs text-navy-700 dark:text-gibelo-areia">
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
                  className="block w-full px-3 py-1.5 text-left text-sm text-navy-700 dark:text-gibelo-offwhite transition-colors hover:bg-navy-50 dark:hover:bg-dark-elevated dark:bg-dark-elevated"
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
