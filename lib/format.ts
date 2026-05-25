// Utilitários de formatação pt-BR (moeda e datas).

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Formata um valor em reais: 1234.5 → "R$ 1.234,50". */
export function formatBRL(valor: number): string {
  return brl.format(valor);
}

/** Formata valores grandes de forma compacta: 1250000 → "R$ 1,3 mi". */
export function formatBRLCompact(valor: number): string {
  return brlCompact.format(valor);
}

/** Converte os dígitos digitados (centavos) em um valor em reais: "48000000" → 480000. */
export function parseValorBRL(raw: string): number {
  const digitos = raw.replace(/\D/g, "");
  if (!digitos) return 0;
  return Number(digitos) / 100;
}

/** Formata uma data ISO (yyyy-mm-dd) como dd/mm/aaaa. */
export function formatDateBR(iso: string): string {
  if (!iso) return "—";
  // Constrói a data em horário local para evitar deslocamento de fuso.
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  if (!ano || !mes || !dia) return "—";
  const d = new Date(ano, mes - 1, dia);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Formata um timestamp ISO completo como dd/mm/aaaa. */
export function formatTimestampBR(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Dias decorridos desde o timestamp ISO informado até agora. */
export function diasDesde(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** Limite, em dias, sem atualização para considerar uma oportunidade "parada". */
export const DIAS_PARADO = 14;

/** Indica se a oportunidade está parada (sem atualização) há muito tempo. */
export function estaParado(atualizadoEm: string): boolean {
  return diasDesde(atualizadoEm) > DIAS_PARADO;
}
