"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Settings } from "lucide-react";
import { CONFIG_SECOES } from "@/lib/nav";
import { useNav } from "@/lib/nav-store";

const DELAY_FECHAR = 220;

/**
 * Item "Configurações" do rail com flyout à direita listando as seções de
 * Configurações. Abre por hover ou foco; fecha com atraso (safe-triangle via
 * ponte invisível `pl-3` + timeout) para o mouse percorrer a diagonal.
 * Esc fecha e devolve o foco ao item-pai; setas ↑↓ navegam; clique-fora fecha.
 */
export function RailFlyout({ ativo }: { ativo: boolean }) {
  const { irParaConfig } = useNav();
  const [aberto, setAberto] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const fecharTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limparTimer = () => {
    if (fecharTimer.current) clearTimeout(fecharTimer.current);
  };
  const abrir = useCallback(() => {
    limparTimer();
    setAberto(true);
  }, []);
  const fecharComDelay = useCallback(() => {
    limparTimer();
    fecharTimer.current = setTimeout(() => setAberto(false), DELAY_FECHAR);
  }, []);
  const fecharEFocarPai = useCallback(() => {
    limparTimer();
    setAberto(false);
    triggerRef.current?.focus();
  }, []);

  const abrirEFocarPrimeiro = useCallback(() => {
    setAberto(true);
    requestAnimationFrame(() => itemRefs.current[0]?.focus());
  }, []);

  // Clique fora fecha.
  useEffect(() => {
    if (!aberto) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [aberto]);

  useEffect(() => () => limparTimer(), []);

  function selecionar(secaoId: string) {
    irParaConfig(secaoId);
    setAberto(false);
  }

  function onTriggerKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      abrirEFocarPrimeiro();
    } else if (e.key === "Escape") {
      setAberto(false);
    }
  }

  function onPanelKey(e: React.KeyboardEvent) {
    const itens = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    const idx = itens.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      itens[(idx + 1) % itens.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      itens[(idx - 1 + itens.length) % itens.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      itens[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      itens[itens.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      fecharEFocarPai();
    }
  }

  return (
    <div
      ref={wrapRef}
      className="relative flex justify-center"
      onMouseEnter={abrir}
      onMouseLeave={fecharComDelay}
      onBlur={(e) => {
        // Fecha quando o foco sai do conjunto trigger+painel (Tab para fora).
        if (!wrapRef.current?.contains(e.relatedTarget as Node)) {
          setAberto(false);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label="Configurações"
        aria-haspopup="true"
        aria-expanded={aberto}
        aria-current={ativo ? "page" : undefined}
        onFocus={abrir}
        onClick={() => (aberto ? fecharEFocarPai() : abrirEFocarPrimeiro())}
        onKeyDown={onTriggerKey}
        className={`relative flex h-12 w-12 items-center justify-center rounded-xl transition-colors focus-visible:outline-gibelo-areia ${
          ativo || aberto
            ? "bg-navy-900 text-white"
            : "text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Settings size={22} strokeWidth={ativo ? 2.4 : 2} aria-hidden="true" />
      </button>

      {aberto && (
        <div
          role="menu"
          aria-label="Configurações"
          onKeyDown={onPanelKey}
          className="absolute left-full top-0 z-50 pl-3"
        >
          <div className="w-60 overflow-hidden rounded-xl border border-navy-100 bg-white py-1.5 shadow-card-hover dark:border-dark-border dark:bg-dark-surface">
            <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-navy-500 dark:text-gibelo-areia">
              Configurações
            </p>
            {CONFIG_SECOES.map((s, i) => (
              <button
                key={s.id}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                role="menuitem"
                type="button"
                onClick={() => selecionar(s.id)}
                className="block w-full px-3 py-2 text-left text-sm text-navy-700 transition-colors hover:bg-navy-50 hover:text-navy-900 dark:text-gibelo-offwhite dark:hover:bg-dark-elevated"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
