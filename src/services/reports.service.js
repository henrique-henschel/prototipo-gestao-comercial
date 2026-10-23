import { SALE_STATUS } from '@/domain/constants.js';
import { cashDayClosing, expensesByCategory, summarizeCashDay } from '@/domain/rules/cash.js';
import { customerFiadoSummary, compareUrgency, fiadoIndicators } from '@/domain/rules/fiado.js';
import {
  compareWithPrevious,
  dailySeries,
  paymentMix,
  periodMetrics,
  topProducts,
} from '@/domain/rules/metrics.js';
import { filterByPeriod } from '@/domain/rules/period.js';
import { compareStockUrgency, stockStatus, stockValue } from '@/domain/rules/stock.js';
import { eachDay, today as todayISO } from '@/lib/date.js';
import { nowISO, request } from './api.js';

/**
 * Relatórios (seção 8 de docs/regras-de-negocio.md). Os números saem das mesmas
 * regras usadas nas telas; no back-end real, este endpoint faria o cálculo no servidor.
 * As linhas já vêm prontas para a tabela (com o nome do cliente na venda, por exemplo),
 * como um endpoint de relatório devolveria.
 * @typedef {import('@/domain/models.js').Period} Period
 * @typedef {'resumo'|'vendas'|'formas'|'produtos'|'fiado'|'estoque'|'caixa'} ReportType
 */

/** Cada tipo de relatório e como montar os seus dados. */
const BUILDERS = {
  /** Indicadores × período anterior (cortado na hora de agora), formas, mais vendidos e a foto de hoje. */
  resumo: (db, period, now) => ({
    ...compareWithPrevious({ ...db, period }, { now }),
    paymentMix: paymentMix(db.sales, period),
    topProducts: topProducts(db.sales, period, 5),
    fiado: fiadoIndicators(db.customers, db.fiadoAccounts, todayISO()),
    stock: stockValue(db.products),
  }),
  /** Todas as vendas do período (inclusive as canceladas, marcadas), com o vendido por dia. */
  vendas: (db, period) => {
    const names = new Map(db.customers.map((customer) => [customer.id, customer.name]));
    const sales = filterByPeriod(db.sales, period).map((sale) => ({
      ...sale,
      customerName: sale.customerId ? (names.get(sale.customerId) ?? null) : null,
    }));
    return {
      metrics: periodMetrics({ ...db, period }),
      days: dailySeries(db.sales, period),
      sales,
      cancelledCount: sales.filter((sale) => sale.status === SALE_STATUS.CANCELADA).length,
    };
  },
  formas: (db, period) => ({
    metrics: periodMetrics({ ...db, period }),
    paymentMix: paymentMix(db.sales, period),
  }),
  /** Todos os produtos vendidos no período, do que mais vendeu para o que menos vendeu. */
  produtos: (db, period) => ({
    metrics: periodMetrics({ ...db, period }),
    topProducts: topProducts(db.sales, period, Infinity),
  }),
  fiado: (db) => {
    const today = todayISO();
    const debtors = db.customers
      .map((customer) => ({ customer, ...customerFiadoSummary(customer, db.fiadoAccounts, today) }))
      .filter((row) => row.openCents > 0)
      .sort(compareUrgency);
    return { indicators: fiadoIndicators(db.customers, db.fiadoAccounts, today), debtors };
  },
  /** Produtos à venda (o que acabou e o que está acabando primeiro) e o valor parado em cada um. */
  estoque: (db) => {
    const products = db.products
      .filter((product) => product.active)
      .sort(compareStockUrgency)
      .map((product) => ({
        ...product,
        status: stockStatus(product),
        stockCostCents: product.costCents == null ? null : stockValue([product]).costCents,
      }));
    return {
      products,
      value: stockValue(db.products),
      outCount: products.filter((product) => product.status === 'acabou').length,
      lowCount: products.filter((product) => product.status === 'acabando').length,
    };
  },
  /** O resumo de cada dia (com o fechamento, se houve), as despesas e as despesas por categoria. */
  caixa: (db, period) => {
    const expenses = filterByPeriod(db.expenses, period);
    return {
      metrics: periodMetrics({ ...db, period }),
      days: eachDay(period.start, period.end).map((date) => {
        const cashDay = db.cashDays.find((cash) => cash.date === date) ?? null;
        return {
          ...summarizeCashDay({ date, ...db, cashDay }),
          opened: Boolean(cashDay),
          closing: cashDayClosing(cashDay),
        };
      }),
      expenses,
      expensesByCategory: expensesByCategory(expenses),
    };
  },
};

/**
 * GET /reports/:type?start=&end=
 * Fiado e estoque são uma foto de hoje e ignoram o período.
 * @param {{ type: ReportType, period: Period }} query
 * @returns {Promise<{ type: ReportType, period: Period, generatedAt: string, data: object }>}
 */
export function getReport({ type, period }) {
  return request((db) => {
    const generatedAt = nowISO();
    return { type, period, generatedAt, data: BUILDERS[type](db, period, generatedAt) };
  });
}
