"use client";

import { useId, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

interface RailItemProps {
  Icon: LucideIcon;
  /** Nome da seção — vira o nome acessível (aria-label) e o tooltip. */
  label: string;
  ativo?: boolean;
  badge?: number;
  onClick?: () => void;
  /** Item "Em breve": muted, aria-disabled, fora da ordem de Tab. */
  desabilitado?: boolean;
  /** Texto alternativo de tooltip (ex.: "Em breve"). Default = label. */
  tooltip?: string;
}

const DELAY_HOVER = 250;

/**
 * Botão de navegação icon-only do rail. Tooltip aparece à direita com
 * delay de ~250ms no hover do mouse e imediato no foco por teclado. O
 * aria-label garante nome acessível independente do tooltip (que é só
 * reforço visual). Estado ativo usa squircle preenchido (shape), não só cor.
 */
export function RailItem({
  Icon,
  label,
  ativo = false,
  badge,
  onClick,
  desabilitado = false,
  tooltip,
}: RailItemProps) {
  const [mostrarDica, setMostrarDica] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dicaId = useId();
  const texto = tooltip ?? label;

  function agendarDica() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMostrarDica(true), DELAY_HOVER);
  }
  function esconderDica() {
    if (timer.current) clearTimeout(timer.current);
    setMostrarDica(false);
  }

  const temBadge = typeof badge === "number" && badge > 0 && !desabilitado;
  const ariaLabel = temBadge
    ? `${label}, ${badge} ${badge === 1 ? "item" : "itens"}`
    : label;

  return (
    <div
      className="relative flex justify-center"
      onMouseEnter={agendarDica}
      onMouseLeave={esconderDica}
    >
      <button
        type="button"
        onClick={desabilitado ? undefined : onClick}
        onFocus={() => setMostrarDica(true)}
        onBlur={esconderDica}
        onKeyDown={(e) => {
          if (e.key === "Escape") esconderDica();
        }}
        aria-label={ariaLabel}
        aria-current={ativo ? "page" : undefined}
        aria-disabled={desabilitado || undefined}
        aria-describedby={mostrarDica ? dicaId : undefined}
        tabIndex={desabilitado ? -1 : 0}
        className={`relative flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
          desabilitado
            ? "cursor-not-allowed text-white/25"
            : ativo
              ? "bg-navy-900 text-white"
              : "text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon size={22} strokeWidth={ativo ? 2.4 : 2} aria-hidden="true" />
        {temBadge && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gibelo-areia px-1 text-[10px] font-bold leading-none text-navy-900 ring-2 ring-gibelo-preto"
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </button>

      <span
        id={dicaId}
        role="tooltip"
        className={`pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-navy-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-card-hover transition-opacity duration-150 dark:bg-dark-elevated ${
          mostrarDica ? "opacity-100" : "opacity-0"
        }`}
        hidden={!mostrarDica}
      >
        {texto}
      </span>
    </div>
  );
}
