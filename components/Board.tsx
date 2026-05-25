"use client";

import { useState } from "react";
import type { Deal } from "@/lib/types";
import { useStages } from "@/lib/crm-store";
import { Column } from "./Column";

interface BoardProps {
  /** Apenas oportunidades abertas. */
  deals: Deal[];
  onAbrir: (deal: Deal) => void;
  onMover: (dealId: string, etapaId: string) => void;
}

export function Board({ deals, onAbrir, onMover }: BoardProps) {
  const { ativas } = useStages();
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);

  return (
    <div className="scrollbar-board -mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-4">
        {ativas.map((stage) => (
          <Column
            key={stage.id}
            stage={stage}
            deals={deals.filter((d) => d.etapaId === stage.id)}
            onAbrir={onAbrir}
            onDropDeal={(dealId, etapaId) => {
              setArrastandoId(null);
              onMover(dealId, etapaId);
            }}
            onDragStart={setArrastandoId}
            onDragEnd={() => setArrastandoId(null)}
            arrastandoId={arrastandoId}
          />
        ))}
      </div>
    </div>
  );
}
