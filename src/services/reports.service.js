import { summarizeCashDay } from '@/domain/rules/cash.js';
import { customerFiadoSummary, compareUrgency, fiadoIndicators } from '@/domain/rules/fiado.js';
import { compareWithPrevious, paymentMix, topProducts } from '@/domain/rules/metrics.js';
import { filterByPeriod } from '@/domain/rules/period.js';
import { stockStatus, stockValue } from '@/domain/rules/stock.js';
import { eachDay, today as todayISO } from '@/lib/date.js';
import { nowISO, request } from './api.js';

/**
 * Relatórios (seção 8 de docs/regras-de-negocio.md). Os números saem das mesmas
 * regras usadas nas telas; no back-end real, este endpoint faria o cálculo no servidor.
 * @typedef {import('@/domain/models.js').Period} Period
 * @typedef {'resumo'|'vendas'|'formas'|'produtos'|'fiado'|'estoque'|'caixa'} ReportType
 */

/** Cada tipo de relatório e como montar os seus dados. */
const BUILDERS = {
  resumo: (db, period) => ({
    ...compareWithPrevious({ ...db, period }),
    paymentMix: paymentMix(db.sales, period),
    topProducts: topProducts(db.sales, period, 5),
  }),
  vendas: (db, period) => ({ sales: filterByPeriod(db.sales, period) }),
  formas: (db, period) => ({ paymentMix: paymentMix(db.sales, period) }),
  produtos: (db, period) => ({ topProducts: topProducts(db.sales, period, 20) }),
  fiado: (db) => {
    const today = todayISO();
    const debtors = db.customers
      .map((customer) => ({ customer, ...customerFiadoSummary(customer, db.fiadoAccounts, today) }))
      .filter((row) => row.openCents > 0)
      .sort(compareUrgency);
    return { indicators: fiadoIndicators(db.customers, db.fiadoAccounts, today), debtors };
  },
  estoque: (db) => ({
    products: db.products
      .filter((p) => p.active)
      .map((product) => ({ ...product, status: stockStatus(product) })),
    value: stockValue(db.products),
  }),
  caixa: (db, period) => ({
    days: eachDay(period.start, period.end).map((date) =>
      summarizeCashDay({ date, ...db, cashDay: db.cashDays.find((cash) => cash.date === date) }),
    ),
    expenses: filterByPeriod(db.expenses, period),
  }),
};

/**
 * GET /reports/:type?start=&end=
 * Fiado e estoque são uma foto de hoje e ignoram o período.
 * @param {{ type: ReportType, period: Period }} query
 * @returns {Promise<{ type: ReportType, period: Period, generatedAt: string, data: object }>}
 */
export function getReport({ type, period }) {
  return request((db) => ({
    type,
    period,
    generatedAt: nowISO(),
    data: BUILDERS[type](db, period),
  }));
}
