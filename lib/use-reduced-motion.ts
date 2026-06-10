import { useEffect, useState } from "react";

/**
 * Espelha `prefers-reduced-motion: reduce` como estado React, reagindo a
 * mudanças ao vivo. Animações CSS já são neutralizadas globalmente em
 * globals.css; este hook cobre animações dirigidas por JS (ex.: Recharts,
 * que ignora a media query).
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}
