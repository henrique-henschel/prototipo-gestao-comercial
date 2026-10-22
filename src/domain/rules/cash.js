import { EXPENSE_CATEGORIES, EXPENSE_METHODS, PAYMENT_METHOD_KEYS } from '../constants.js';
import { sumCents } from './money.js';
import { amountByMethod } from './payments.js';
import { activeSales } from './sales.js';
import { filterByPeriod } from './period.js';

/**
 * Regras do caixa do dia (seção 6 de docs/regras-de-negocio.md).
 * @typedef {import('../models.js').Cents} Cents
 * @typedef {import('../models.js').CashDay} CashDay
 * @typedef {import('../models.js').Expense} Expense
 * @typedef {import('../models.js').FiadoPayment} FiadoPayment
 * @typedef {import('../models.js').Sale} Sale
 */

/**
 * Dinheiro esperado na gaveta. Regra 6.4.
 * = troco inicial + vendas em dinheiro (já sem o troco) + fiado recebido em dinheiro − despesas em dinheiro.
 * @param {{ openingCents: Cents, cashSalesCents: Cents, cashFiadoCents: Cents, cashExpensesCents: Cents }} parts
 * @returns {Cents}
 */
export function expectedCash({ openingCents, cashSalesCents, cashFiadoCents, cashExpensesCents }) {
  return openingCents + cashSalesCents + cashFiadoCents - cashExpensesCents;
}

/**
 * Resumo de um dia de caixa: entradas por forma, fiado vendido, fiado recebido, despesas
 * e dinheiro esperado. Regras 6.2 a 6.4.
 * @param {{ date: string, sales: Sale[], fiadoPayments: FiadoPayment[], expenses: Expense[], cashDay?: CashDay|null }} input
 */
export function summarizeCashDay({ date, sales, fiadoPayments, expenses, cashDay = null }) {
  const period = { start: date, end: date };
  const daySales = activeSales(filterByPeriod(sales, period));
  const allPayments = daySales.flatMap((sale) => sale.payments);
  const dayFiado = filterByPeriod(fiadoPayments, period);
  const dayExpenses = filterByPeriod(expenses, period);

  /** @type {Record<string, Cents>} */
  const salesByMethod = {};
  for (const method of PAYMENT_METHOD_KEYS) salesByMethod[method] = amountByMethod(allPayments, method);

  /** @type {Record<string, Cents>} */
  const fiadoReceivedByMethod = {};
  for (const method of PAYMENT_METHOD_KEYS) {
    if (method === 'fiado') continue;
    fiadoReceivedByMethod[method] = amountByMethod(dayFiado, method);
  }

  const openingCents = cashDay?.openingCents ?? 0;
  const cashExpensesCents = sumCents(
    dayExpenses.filter((e) => e.method === 'dinheiro').map((e) => e.amountCents),
  );
  const expected = expectedCash({
    openingCents,
    cashSalesCents: salesByMethod.dinheiro,
    cashFiadoCents: fiadoReceivedByMethod.dinheiro,
    cashExpensesCents,
  });

  return {
    date,
    salesCount: daySales.length,
    soldCents: sumCents(daySales.map((sale) => sale.totalCents)),
    salesByMethod,
    /** Vendido a receber: aparece separado das entradas. */
    fiadoSoldCents: salesByMethod.fiado,
    fiadoReceivedCents: sumCents(dayFiado.map((payment) => payment.amountCents)),
    fiadoReceivedByMethod,
    expensesCents: sumCents(dayExpenses.map((expense) => expense.amountCents)),
    cashExpensesCents,
    openingCents,
    expectedCashCents: expected,
  };
}

/**
 * Valida uma despesa. Regra 6.3.
 * @param {{ category?: string, amountCents?: number, method?: string }} input
 * @returns {('valor_invalido'|'categoria_invalida'|'forma_invalida')[]}
 */
export function validateExpense({ category, amountCents, method }) {
  const errors = [];
  if (!(Number.isInteger(amountCents) && amountCents > 0)) errors.push('valor_invalido');
  if (!EXPENSE_CATEGORIES.some((option) => option.value === category)) errors.push('categoria_invalida');
  if (!EXPENSE_METHODS.some((option) => option.value === method)) errors.push('forma_invalida');
  return errors;
}

/**
 * Conferência do fechamento: diferença = contado − esperado. Regra 6.5.
 * @param {Cents} countedCents
 * @param {Cents} expectedCents
 * @returns {{ differenceCents: Cents, result: 'certo'|'sobrou'|'faltou' }}
 */
export function closingDifference(countedCents, expectedCents) {
  const differenceCents = countedCents - expectedCents;
  let result = 'certo';
  if (differenceCents > 0) result = 'sobrou';
  if (differenceCents < 0) result = 'faltou';
  return { differenceCents, result };
}
