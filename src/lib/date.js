/**
 * Utilitários de data por **dia civil** no fuso do dispositivo.
 * Datas de calendário (vencimentos) circulam como string `AAAA-MM-DD`.
 */

/**
 * @param {Date} [date]
 * @returns {string} `AAAA-MM-DD` no fuso local
 */
export function toISODate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Converte `AAAA-MM-DD` (ou ISO completo) em Date local à meia-noite.
 * @param {string} iso
 */
export function parseISODate(iso) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * @param {string} iso `AAAA-MM-DD`
 * @param {number} days
 * @returns {string} `AAAA-MM-DD`
 */
export function addDays(iso, days) {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/**
 * Diferença em dias civis (b − a).
 * @param {string} a
 * @param {string} b
 */
export function diffInDays(a, b) {
  const ms = parseISODate(b).getTime() - parseISODate(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** @returns {string} hoje em `AAAA-MM-DD` */
export function today() {
  return toISODate(new Date());
}
