// Catálogo de tipos de obra para projetos de engenharia civil (Gibelo).

import type { TipoObra } from "./types";

export const TIPOS_OBRA: { value: TipoObra; label: string; abrev: string }[] = [
  {
    value: "residencial_unifamiliar",
    label: "Residencial unifamiliar",
    abrev: "Resid. unifamiliar",
  },
  {
    value: "residencial_multifamiliar",
    label: "Residencial multifamiliar",
    abrev: "Resid. multifamiliar",
  },
  { value: "comercial", label: "Comercial", abrev: "Comercial" },
  { value: "industrial", label: "Industrial", abrev: "Industrial" },
  { value: "reforma", label: "Reforma", abrev: "Reforma" },
  { value: "outro", label: "Outro", abrev: "Outro" },
];

export function labelTipoObra(tipo: TipoObra | null | undefined): string {
  if (!tipo) return "";
  return TIPOS_OBRA.find((t) => t.value === tipo)?.label ?? tipo;
}

export function abrevTipoObra(tipo: TipoObra | null | undefined): string {
  if (!tipo) return "";
  return TIPOS_OBRA.find((t) => t.value === tipo)?.abrev ?? tipo;
}
