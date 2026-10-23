import { CURRENCY, LOCALE } from '@/app/config.js';

/**
 * Dinheiro é sempre representado em **centavos inteiros** (`1250` = R$ 12,50).
 * Conversões para reais acontecem apenas na borda: entrada do usuário e exibição.
 * @typedef {number} Cents
 */

const brl = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY });
const brlCompact = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  notation: 'compact',
  maximumFractionDigits: 1,
});
const decimal = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Converte reais (número) para centavos, arredondando *half-up*.
 * @param {number} reais
 * @returns {Cents}
 */
export function toCents(reais) {
  if (!Number.isFinite(reais)) return 0;
  // toFixed corrige resíduos binários (1.005 * 100 = 100.4999...) antes de arredondar.
  return Math.sign(reais) * Math.round(Number((Math.abs(reais) * 100).toFixed(6)));
}

/**
 * @param {Cents} cents
 * @returns {number} valor em reais
 */
export function fromCents(cents) {
  return cents / 100;
}

/**
 * Formata centavos como moeda: `formatBRL(1250)` → "R$ 12,50".
 * O espaço inseparável do Intl é trocado por espaço comum para facilitar busca e testes.
 * @param {Cents} cents
 * @param {{ compact?: boolean, signed?: boolean }} [options]
 */
export function formatBRL(cents, { compact = false, signed = false } = {}) {
  const value = fromCents(cents || 0);
  const text = (compact ? brlCompact : brl).format(Math.abs(value)).replace(/\s/g, ' ');
  if (value < 0) return `− ${text}`;
  if (signed && value > 0) return `+ ${text}`;
  return text;
}

/**
 * Formata centavos sem o símbolo da moeda: `formatDecimal(1250)` → "12,50".
 * @param {Cents} cents
 */
export function formatDecimal(cents) {
  return decimal.format(fromCents(cents || 0));
}

/**
 * Extrai centavos de um texto digitado, considerando só os dígitos
 * (o último par é sempre os centavos): "R$ 12,345" → 12345.
 * É a base da digitação estilo calculadora do MoneyInput.
 * @param {string} text
 * @param {{ max?: Cents }} [options]
 * @returns {Cents}
 */
export function parseCentsFromDigits(text, { max = 99_999_999 } = {}) {
  const digits = String(text ?? '').replace(/\D/g, '');
  if (!digits) return 0;
  const cents = Number.parseInt(digits.slice(-12), 10);
  return Math.min(cents, max);
}

/**
 * Soma uma lista de valores em centavos.
 * @param {Cents[]} values
 * @returns {Cents}
 */
export function sumCents(values) {
  return values.reduce((total, value) => total + (value || 0), 0);
}

/**
 * Aplica um percentual (0–100) a um valor, arredondando para o centavo mais próximo.
 * @param {Cents} cents
 * @param {number} percent
 * @returns {Cents}
 */
export function percentOf(cents, percent) {
  return Math.round((cents * percent) / 100);
}

/** Maior taxa que se digita (99,99%). */
export const MAX_PERCENT = 99.99;

/**
 * Porcentagem digitada como na calculadora, com 2 casas e sem vírgula: os dígitos entram
 * pela direita ("1", "9", "9" vira 1,99%). Usada nas taxas da maquininha.
 * @param {string} text
 * @param {{ max?: number }} [options] maior porcentagem aceita
 * @returns {number} ex.: 1.99
 */
export function parsePercentFromDigits(text, { max = MAX_PERCENT } = {}) {
  return parseCentsFromDigits(text, { max: Math.round(max * 100) }) / 100;
}

/**
 * Os dígitos de uma porcentagem, para continuar a digitação: 1.99 → "199".
 * @param {number} percent
 */
export function percentDigits(percent) {
  const hundredths = Math.round((percent || 0) * 100);
  return hundredths > 0 ? String(hundredths) : '';
}
