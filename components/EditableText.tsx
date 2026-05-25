"use client";

import { useState } from "react";

interface EditableTextProps {
  value: string;
  onCommit: (value: string) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Input editável inline que confirma no blur e reverte se ficar vazio ou
 * inalterado. Usado em nomes de origens, etapas e listas.
 */
export function EditableText({
  value,
  onCommit,
  ariaLabel,
  className = "",
}: EditableTextProps) {
  const [texto, setTexto] = useState(value);
  return (
    <input
      aria-label={ariaLabel}
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => {
        const t = texto.trim();
        if (t && t !== value) onCommit(t);
        else setTexto(value);
      }}
      className={className}
    />
  );
}
