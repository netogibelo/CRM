/**
 * Logo Gibelo Construtora inline em SVG — wordmark "Gibelo" + descritor
 * "CONSTRUTORA" em texto HTML.
 *
 * Estratégia:
 *   - SVG inline com `fill="currentColor"` (sem download de PNG, sem
 *     preload duplicado entre temas, troca de cor é só CSS).
 *   - Aspect ratio fixo via viewBox trimmed pro "Gibelo" — evita Cumulative
 *     Layout Shift.
 *   - Path tracing copiado de public/logo-gibelo-wordmark.svg (Manual de
 *     Marca v1.0). ViewBox recortado pra remover whitespace original.
 */

interface GibeloLogoProps {
  /** Largura visual do bloco wordmark+descritor (px). */
  width?: number;
  /** Classe extra aplicada ao container. */
  className?: string;
  /** Mostra "CONSTRUTORA" abaixo do wordmark. Default true. */
  comDescritor?: boolean;
  /**
   * Classes de cor do wordmark (currentColor). Default segue o tema; o rail
   * escuro passa "text-white" para a versão clara da marca.
   */
  corClasse?: string;
}

export function GibeloLogo({
  width = 160,
  className = "",
  comDescritor = true,
  corClasse = "text-navy-900 dark:text-gibelo-offwhite",
}: GibeloLogoProps) {
  // Aspect ~3.2:1 do wordmark. Mantém box estável em qualquer tema.
  const height = Math.round(width / 3.2);

  return (
    <div
      className={`inline-flex flex-col leading-none ${corClasse} ${className}`}
      style={{ width }}
      aria-label="Gibelo Construtora"
      role="img"
    >
      <svg
        viewBox="220 322 450 138"
        width={width}
        height={height}
        style={{ display: "block" }}
        fill="currentColor"
        aria-hidden="true"
      >
        <g>
          <path transform="matrix(1 0 0 -1 292.26 403.49)" d="m0 0v-0.149l-39.885-8.577v11.56l39.885 8.501c10.636-0.298 15.954-6.662 15.954-19.091v-16.332c0-17.401-9.307-26.1-27.919-26.1h-27.92c-18.614 0-27.919 8.699-27.919 26.1v59.659c0 17.401 9.305 26.102 27.919 26.102h27.92c18.612 0 27.919-8.701 27.919-26.102h-11.966c0 9.944-5.318 14.915-15.953 14.915h-27.92c-10.636 0-15.953-4.971-15.953-14.915v-59.659c0-9.943 5.317-14.914 15.953-14.914h27.92c10.635 0 15.953 4.971 15.953 14.914v20.061c0 2.088-1.329 3.43-3.988 4.027" />
          <path transform="matrix(1 0 0 -1 0 595.28)" d="m320.18 219.9h11.966v-78.303h-11.966zm5.983 9.322c-5.318 0-7.977 2.485-7.977 7.457 0 4.971 2.659 7.457 7.977 7.457 5.317 0 7.977-2.486 7.977-7.457 0-4.972-2.66-7.457-7.977-7.457" />
          <path transform="matrix(1 0 0 -1 399.95 442.49)" d="m0 0c10.635 0 15.954 4.971 15.954 14.914v26.102c0 9.942-5.319 14.914-15.954 14.914h-43.873v-41.016c0-9.943 5.317-14.914 15.954-14.914zm27.92 14.914c0-17.401-9.308-26.101-27.92-26.101h-27.919c-18.614 0-27.92 8.7-27.92 26.101v85.761h11.966v-33.559h43.873c18.612 0 27.92-8.7 27.92-26.1z" />
          <path transform="matrix(1 0 0 -1 465.76 386.56)" d="m0 0c-10.637 0-15.954-4.972-15.954-14.914v-16.034l56.558 12.156c2.179 0.695 3.27 1.987 3.27 3.878 0 9.942-5.318 14.914-15.954 14.914zm27.92-55.93c10.636 0 15.954 4.971 15.954 14.914h11.965c0-17.401-9.307-26.1-27.919-26.1h-27.92c-18.613 0-27.919 8.699-27.919 26.1v26.102c0 17.4 9.306 26.101 27.919 26.101h27.92c18.612 0 27.919-7.458 27.919-22.373 0-10.838-4.042-17.052-12.125-18.643l-59.588-12.678c0.478-8.949 5.77-13.423 15.874-13.423z" />
          <path transform="matrix(1 0 0 -1 0 595.28)" d="m529.58 253.46h11.966v-111.86h-11.966z" />
          <path transform="matrix(1 0 0 -1 581.43 386.56)" d="m0 0c-10.637 0-15.954-4.972-15.954-14.914v-26.102c0-9.943 5.317-14.914 15.954-14.914h27.919c10.636 0 15.954 4.971 15.954 14.914v26.102c0 9.942-5.318 14.914-15.954 14.914zm-27.92-14.914c0 17.4 9.306 26.101 27.92 26.101h27.919c18.612 0 27.919-8.701 27.919-26.101v-26.102c0-17.401-9.307-26.1-27.919-26.1h-27.919c-18.614 0-27.92 8.699-27.92 26.1z" />
        </g>
      </svg>
      {comDescritor && (
        <span
          aria-hidden="true"
          className="mt-1 select-none text-[10px] font-medium uppercase tracking-[0.3em] text-navy-700 dark:text-gibelo-areia"
        >
          Construtora
        </span>
      )}
    </div>
  );
}
