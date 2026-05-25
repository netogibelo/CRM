// Geração de id e timestamp, compartilhada entre repositório e migração de seed
// (evita implementações divergentes do gerador de id).

export function novoId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export function agoraISO(): string {
  return new Date().toISOString();
}
