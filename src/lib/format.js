import { LOCALE } from '@/app/config.js';
import { diffInDays, parseISODate, today } from './date.js';

const dateShort = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' });
const dateLong = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
const dateDayMonth = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' });
const time = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' });
const number = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 3 });
const percent = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 1 });

/** "21/10/2026" */
export function formatDate(iso) {
  return dateShort.format(parseISODate(iso));
}

/** "quarta-feira, 21 de outubro" */
export function formatDateLong(iso) {
  return dateLong.format(parseISODate(iso));
}

/** "21 de out." */
export function formatDayMonth(iso) {
  return dateDayMonth.format(parseISODate(iso));
}

/** "14:35" a partir de um ISO com hora */
export function formatTime(isoDateTime) {
  return time.format(new Date(isoDateTime));
}

/** Números com até 3 casas (quantidades em kg): 1,25 */
export function formatNumber(value) {
  return number.format(value);
}

/** Recebe fração (0.125) e devolve "12,5%" */
export function formatPercent(fraction) {
  return percent.format(fraction);
}

/**
 * Dia relativo em linguagem simples: "hoje", "amanhã", "ontem",
 * "em 5 dias", "há 3 dias"; além de 30 dias, a data por extenso curta.
 * @param {string} iso `AAAA-MM-DD`
 * @param {string} [reference] dia de referência (padrão: hoje)
 */
export function formatRelativeDay(iso, reference = today()) {
  const diff = diffInDays(reference, iso);
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'amanhã';
  if (diff === -1) return 'ontem';
  if (Math.abs(diff) > 30) return formatDayMonth(iso);
  return diff > 0 ? `em ${diff} dias` : `há ${-diff} dias`;
}

/** Pluralização simples em pt-BR: plural(3, 'item', 'itens') → "3 itens" */
export function plural(count, singular, pluralForm = `${singular}s`) {
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`;
}
