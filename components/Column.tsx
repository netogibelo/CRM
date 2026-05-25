"use client";

import { useState } from "react";
import type { Deal, Etapa } from "@/lib/types";
import { corDaEtapa } from "@/lib/stages";
import { formatBRL } from "@/lib/format";
import { DealCard } from "./DealCard";

interface ColumnProps {
  stage: Etapa;
  deals: Deal[];
  onAbrir: (deal: Deal) => void;
  onDropDeal: (dealId: string, etapaId: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  arrastandoId: string | null;
}

export function Column({
  stage,
  deals,
  onAbrir,
  onDropDeal,
  onDragStart,
  onDragEnd,
  arrastandoId,
}: ColumnProps) {
  const [sobre, setSobre] = useState(false);
  const total = deals.reduce((acc, d) => acc + d.valor, 0);

  return (
    <section
      aria-label={`Etapa ${stage.nome}, ${deals.length} oportunidades`}
      className="flex w-[280px] shrink-0 flex-col rounded-2xl bg-navy-100/50 sm:w-[300px]"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!sobre) setSobre(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setSobre(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setSobre(false);
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDropDeal(id, stage.id);
      }}
    >
      <header className="flex items-center justify-between gap-2 px-3.5 pb-2 pt-3.5">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: corDaEtapa(stage.ordem) }}
            aria-hidden="true"
          />
          <h3 className="text-sm font-semibold text-navy-800">{stage.nome}</h3>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-navy-500">
          {deals.length}
        </span>
      </header>

      <div
        className={`flex flex-1 flex-col gap-2.5 rounded-xl px-2.5 pb-2 transition-colors ${
          sobre ? "bg-navy-200/60" : "bg-transparent"
        }`}
      >
        {deals.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-navy-400">
            {sobre ? "Solte aqui" : "Nenhuma oportunidade"}
          </p>
        ) : (
          deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onAbrir={onAbrir}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              arrastando={arrastandoId === deal.id}
            />
          ))
        )}
      </div>

      <footer className="mt-1 flex items-center justify-between border-t border-navy-200/70 px-3.5 py-2.5">
        <span className="text-xs text-navy-500">
          {deals.length} {deals.length === 1 ? "oportunidade" : "oportunidades"}
        </span>
        <span className="text-xs font-semibold text-navy-800">
          {formatBRL(total)}
        </span>
      </footer>
    </section>
  );
}
