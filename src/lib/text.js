/**
 * Texto para busca: sem acento e em minúsculas ("José" e "jose" se encontram).
 * @param {string|null|undefined} text
 * @returns {string}
 */
export function normalizeSearch(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}
