/**
 * Identificadores gerados no cliente. No back-end real, o servidor gera os ids;
 * aqui o prefixo ajuda a reconhecer a entidade ao depurar ("sale_k3x9...").
 * @param {string} prefix ex.: "sale", "prod", "cli"
 * @returns {string}
 */
export function createId(prefix) {
  const random = globalThis.crypto?.randomUUID?.().replace(/-/g, '').slice(0, 12);
  return `${prefix}_${random ?? Math.random().toString(36).slice(2, 14)}`;
}
