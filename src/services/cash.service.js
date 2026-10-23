import { summarizeCashDay, validateCashDayChange, validateExpense } from '@/domain/rules/cash.js';
import { filterByPeriod } from '@/domain/rules/period.js';
import { EXPENSE_CATEGORIES } from '@/domain/constants.js';
import { dateOf, today } from '@/lib/date.js';
import { createId } from '@/lib/id.js';
import { ApiError, assertValid, findOrFail, nowISO, request } from './api.js';

/**
 * Caixa do dia e despesas (seção 6 de docs/regras-de-negocio.md).
 * @typedef {import('@/domain/models.js').CashDay} CashDay
 * @typedef {import('@/domain/models.js').Expense} Expense
 * @typedef {import('@/domain/models.js').Period} Period
 */

function findCashDay(db, date) {
  const cashDay = db.cashDays.find((cash) => cash.date === date);
  if (!cashDay) throw new ApiError('caixa_inexistente');
  return cashDay;
}

/** Despesas de um dia fechado não mudam (regras 6.3 e 6.5). */
function assertDayOpen(db, date) {
  assertValid(validateCashDayChange(db.cashDays.find((cash) => cash.date === date)));
}

function saveCashDay(db, cashDay) {
  db.cashDays = db.cashDays.map((cash) => (cash.date === cashDay.date ? cashDay : cash));
  return cashDay;
}

/**
 * GET /cash-days — em ordem cronológica.
 * @returns {Promise<CashDay[]>}
 */
export function listCashDays() {
  return request((db) => db.cashDays);
}

/**
 * POST /cash-days — abre o caixa manualmente com o troco inicial (regra 6.1).
 * @param {{ date?: string, openingCents?: number }} [input] padrão: hoje e o troco inicial dos Ajustes
 * @returns {Promise<CashDay>}
 */
export function openCashDay({ date = today(), openingCents } = {}) {
  return request((db) => {
    if (db.cashDays.some((cash) => cash.date === date)) throw new ApiError('caixa_ja_aberto');
    const value = openingCents ?? db.settings.defaultOpeningCents;
    if (!(Number.isInteger(value) && value >= 0)) throw new ApiError('valor_invalido');
    /** @type {CashDay} */
    const cashDay = {
      date,
      openingCents: value,
      openedAt: nowISO(),
      closedAt: null,
      countedCents: null,
      expectedCents: null,
      note: '',
    };
    db.cashDays = [...db.cashDays, cashDay];
    return cashDay;
  });
}

/**
 * PATCH /cash-days/:date — corrige o troco inicial de um caixa aberto.
 * @param {string} date
 * @param {{ openingCents: number }} input
 * @returns {Promise<CashDay>}
 */
export function updateOpening(date, { openingCents }) {
  return request((db) => {
    const cashDay = findCashDay(db, date);
    if (cashDay.closedAt) throw new ApiError('caixa_fechado');
    if (!(Number.isInteger(openingCents) && openingCents >= 0)) throw new ApiError('valor_invalido');
    return saveCashDay(db, { ...cashDay, openingCents });
  });
}

/**
 * POST /cash-days/:date/close — fecha o dia com a conferência (regra 6.5). O esperado é
 * calculado agora e guardado, para o histórico não mudar depois.
 * @param {string} date
 * @param {{ countedCents: number, note?: string }} input
 * @returns {Promise<CashDay>}
 */
export function closeCashDay(date, { countedCents, note = '' }) {
  return request((db) => {
    const cashDay = findCashDay(db, date);
    if (cashDay.closedAt) throw new ApiError('caixa_fechado');
    if (!(Number.isInteger(countedCents) && countedCents >= 0)) throw new ApiError('valor_invalido');
    const { expectedCashCents } = summarizeCashDay({ date, ...db, cashDay });
    return saveCashDay(db, {
      ...cashDay,
      closedAt: nowISO(),
      countedCents,
      expectedCents: expectedCashCents,
      note: note.trim(),
    });
  });
}

/**
 * POST /cash-days/:date/reopen — reabre um dia fechado (regra 6.5).
 * @param {string} date
 * @returns {Promise<CashDay>}
 */
export function reopenCashDay(date) {
  return request((db) => {
    const cashDay = findCashDay(db, date);
    if (!cashDay.closedAt) throw new ApiError('caixa_nao_fechado');
    return saveCashDay(db, { ...cashDay, closedAt: null, countedCents: null, expectedCents: null });
  });
}

/**
 * GET /expenses?start=&end= — em ordem cronológica.
 * @param {{ period?: Period }} [filters]
 * @returns {Promise<Expense[]>}
 */
export function listExpenses({ period } = {}) {
  return request((db) => (period ? filterByPeriod(db.expenses, period) : db.expenses));
}

/**
 * POST /expenses. Sem descrição, usa o nome da categoria.
 * @param {Pick<Expense, 'category'|'amountCents'|'method'> & { description?: string }} input
 * @returns {Promise<Expense>}
 */
export function createExpense(input) {
  return request((db) => {
    assertValid(validateExpense(input));
    const createdAt = nowISO();
    assertDayOpen(db, dateOf(createdAt));
    const category = EXPENSE_CATEGORIES.find((option) => option.value === input.category);
    /** @type {Expense} */
    const expense = {
      id: createId('desp'),
      description: input.description?.trim() || category.label,
      category: input.category,
      amountCents: input.amountCents,
      method: input.method,
      createdAt,
    };
    db.expenses = [...db.expenses, expense];
    return expense;
  });
}

/**
 * DELETE /expenses/:id (também é o "Desfazer" de uma despesa recém-lançada).
 * @param {string} id
 * @returns {Promise<{ expenseId: string }>}
 */
export function deleteExpense(id) {
  return request((db) => {
    const expense = findOrFail(db.expenses, id);
    assertDayOpen(db, dateOf(expense.createdAt));
    db.expenses = db.expenses.filter((item) => item.id !== id);
    return { expenseId: id };
  });
}

/**
 * PUT /expenses/:id — devolve uma despesa apagada, com o mesmo id e a mesma hora
 * (o "Desfazer" de apagar).
 * @param {Expense} expense
 * @returns {Promise<Expense>}
 */
export function restoreExpense(expense) {
  return request((db) => {
    assertValid(validateExpense(expense));
    assertDayOpen(db, dateOf(expense.createdAt));
    const others = db.expenses.filter((item) => item.id !== expense.id);
    db.expenses = [...others, expense].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return expense;
  });
}
