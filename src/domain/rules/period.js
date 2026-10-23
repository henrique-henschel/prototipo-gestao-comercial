import {
  addDays,
  dateOf,
  diffInDays,
  endOfMonth,
  parseISODate,
  startOfMonth,
  toISODate,
  today as todayISO,
} from '@/lib/date.js';

/**
 * Períodos de consulta (relatórios, métricas e comparativos), em dias civis inclusivos.
 * @typedef {import('../models.js').Period} Period
 */

/**
 * Período de um atalho. Regra 8 ("Períodos").
 * @param {'hoje'|'ontem'|'7dias'|'este_mes'|'mes_passado'} preset
 * @param {string} [today]
 * @returns {Period}
 */
export function periodFromPreset(preset, today = todayISO()) {
  switch (preset) {
    case 'hoje':
      return { start: today, end: today };
    case 'ontem': {
      const yesterday = addDays(today, -1);
      return { start: yesterday, end: yesterday };
    }
    case '7dias':
      return { start: addDays(today, -6), end: today };
    case 'este_mes':
      return { start: startOfMonth(today), end: today };
    case 'mes_passado': {
      const lastMonth = addDays(startOfMonth(today), -1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
    default:
      throw new Error(`Período desconhecido: ${preset}`);
  }
}

/** `AAAA-MM-DD` de um dia que existe (31/02 não passa). */
function isValidDay(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') && toISODate(parseISODate(value)) === value;
}

/**
 * Período escolhido à mão ("Escolher datas"). Regra 8 ("Períodos"): as datas podem vir
 * trocadas (o início depois do fim) e o período nunca passa de hoje, porque não há
 * registros no futuro. Devolve nulo se faltar uma das datas ou se o período começar
 * depois de hoje.
 * @param {string|null|undefined} start `AAAA-MM-DD`
 * @param {string|null|undefined} end `AAAA-MM-DD`
 * @param {string} [today]
 * @returns {Period|null}
 */
export function customPeriod(start, end, today = todayISO()) {
  if (!isValidDay(start) || !isValidDay(end)) return null;
  const [first, last] = start <= end ? [start, end] : [end, start];
  if (first > today) return null;
  return { start: first, end: last > today ? today : last };
}

/**
 * Período anterior de mesma duração ("hoje × ontem", "7 dias × 7 dias antes"). Regra 7.
 * @param {Period} period
 * @returns {Period}
 */
export function previousPeriod({ start, end }) {
  const length = diffInDays(start, end) + 1;
  return { start: addDays(start, -length), end: addDays(start, -1) };
}

/**
 * O instante ou dia está dentro do período?
 * @param {string} iso data (`AAAA-MM-DD`) ou ISO completo
 * @param {Period} period
 */
export function isInPeriod(iso, { start, end }) {
  const day = dateOf(iso);
  return day >= start && day <= end;
}

/**
 * Filtra registros com `createdAt` dentro do período.
 * @template {{ createdAt: string }} T
 * @param {T[]} records
 * @param {Period} period
 * @returns {T[]}
 */
export function filterByPeriod(records, period) {
  return records.filter((record) => isInPeriod(record.createdAt, period));
}
