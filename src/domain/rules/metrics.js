import { eachDay, dateOf } from '@/lib/date.js';
import { PAYMENT_METHOD_KEYS } from '../constants.js';
import { sumCents } from './money.js';
import { amountByMethod } from './payments.js';
import { filterByPeriod, previousPeriod } from './period.js';
import { activeSales } from './sales.js';
import { roundQuantity } from './stock.js';

/**
 * Métricas e lucro (seção 7 de docs/regras-de-negocio.md).
 * @typedef {import('../models.js').Cents} Cents
 * @typedef {import('../models.js').Expense} Expense
 * @typedef {import('../models.js').FiadoPayment} FiadoPayment
 * @typedef {import('../models.js').Period} Period
 * @typedef {import('../models.js').Sale} Sale
 */

/**
 * Custo das mercadorias de uma venda (itens sem custo contam como zero).
 * @param {Sale} sale
 * @returns {Cents}
 */
export function saleCost(sale) {
  return sumCents(sale.items.map((item) => Math.round((item.unitCostCents ?? 0) * item.quantity)));
}

/**
 * Taxas da maquininha de uma venda.
 * @param {Sale} sale
 * @returns {Cents}
 */
export function saleFees(sale) {
  return sumCents(sale.payments.map((payment) => payment.feeCents ?? 0));
}

/**
 * Indicadores de um período. Regra 7.
 * - Vendido: totais das vendas não canceladas, inclusive a parte em fiado.
 * - Recebido: vendido − parte em fiado dessas vendas + recebimentos de fiado do período.
 * - Lucro estimado: vendido − custo das mercadorias − taxas − despesas.
 * @param {{ sales: Sale[], fiadoPayments: FiadoPayment[], expenses: Expense[], period: Period }} input
 */
export function periodMetrics({ sales, fiadoPayments, expenses, period }) {
  const periodSales = activeSales(filterByPeriod(sales, period));
  const soldCents = sumCents(periodSales.map((sale) => sale.totalCents));
  const fiadoSoldCents = sumCents(periodSales.map((sale) => amountByMethod(sale.payments, 'fiado')));
  const fiadoReceivedCents = sumCents(filterByPeriod(fiadoPayments, period).map((p) => p.amountCents));
  const costCents = sumCents(periodSales.map(saleCost));
  const feesCents = sumCents(periodSales.map(saleFees));
  const expensesCents = sumCents(filterByPeriod(expenses, period).map((expense) => expense.amountCents));
  const salesCount = periodSales.length;

  return {
    soldCents,
    receivedCents: soldCents - fiadoSoldCents + fiadoReceivedCents,
    fiadoSoldCents,
    fiadoReceivedCents,
    costCents,
    feesCents,
    expensesCents,
    profitCents: soldCents - costCents - feesCents - expensesCents,
    salesCount,
    averageTicketCents: salesCount > 0 ? Math.round(soldCents / salesCount) : 0,
    /** Há itens vendidos sem custo: a interface avisa que o lucro é estimado. */
    hasMissingCost: periodSales.some((sale) => sale.items.some((item) => item.unitCostCents == null)),
  };
}

/**
 * Variação entre dois valores. `percent` é fração (0.25 = +25%) e fica nulo quando
 * o valor anterior é zero (não dá para comparar).
 * @param {number} current
 * @param {number} previous
 */
export function compareValues(current, previous) {
  return {
    current,
    previous,
    difference: current - previous,
    percent: previous === 0 ? null : (current - previous) / Math.abs(previous),
  };
}

/** Milissegundos desde a meia-noite local de um instante. */
function timeOfDay(iso) {
  const date = new Date(iso);
  return (
    ((date.getHours() * 60 + date.getMinutes()) * 60 + date.getSeconds()) * 1000 + date.getMilliseconds()
  );
}

/**
 * Indicadores do período e do período anterior de mesma duração, com as variações. Regra 7.
 * Com `now`, quando o período termina hoje, o último dia do período anterior é cortado na
 * mesma hora: às 10h, "hoje" é comparado com "ontem até as 10h", e não com o dia inteiro.
 * @param {{ sales: Sale[], fiadoPayments: FiadoPayment[], expenses: Expense[], period: Period }} input
 * @param {{ now?: string }} [options] instante atual (ISO)
 */
export function compareWithPrevious(input, { now } = {}) {
  const current = periodMetrics(input);
  const period = previousPeriod(input.period);
  const sameTime = Boolean(now) && input.period.end === dateOf(now);
  const cut = (records) =>
    sameTime
      ? records.filter(
          (record) =>
            dateOf(record.createdAt) !== period.end || timeOfDay(record.createdAt) <= timeOfDay(now),
        )
      : records;
  const previous = periodMetrics({
    sales: cut(input.sales),
    fiadoPayments: cut(input.fiadoPayments),
    expenses: cut(input.expenses),
    period,
  });
  return {
    current,
    previous,
    sold: compareValues(current.soldCents, previous.soldCents),
    received: compareValues(current.receivedCents, previous.receivedCents),
    profit: compareValues(current.profitCents, previous.profitCents),
    salesCount: compareValues(current.salesCount, previous.salesCount),
    averageTicket: compareValues(current.averageTicketCents, previous.averageTicketCents),
  };
}

/**
 * Série diária de vendas, com zeros nos dias sem venda (gráfico "últimos 7 dias").
 * @param {Sale[]} sales
 * @param {Period} period
 * @returns {{ date: string, soldCents: Cents, salesCount: number }[]}
 */
export function dailySeries(sales, period) {
  const totals = new Map(
    eachDay(period.start, period.end).map((day) => [day, { soldCents: 0, salesCount: 0 }]),
  );
  for (const sale of activeSales(filterByPeriod(sales, period))) {
    const entry = totals.get(dateOf(sale.createdAt));
    entry.soldCents += sale.totalCents;
    entry.salesCount += 1;
  }
  return [...totals].map(([date, values]) => ({ date, ...values }));
}

/**
 * Quanto entrou por forma de pagamento no período, na ordem fixa das formas.
 * @param {Sale[]} sales
 * @param {Period} period
 * @returns {{ method: import('../models.js').PaymentMethod, amountCents: Cents, share: number }[]}
 */
export function paymentMix(sales, period) {
  const payments = activeSales(filterByPeriod(sales, period)).flatMap((sale) => sale.payments);
  const total = sumCents(payments.map((payment) => payment.amountCents));
  return PAYMENT_METHOD_KEYS.map((method) => {
    const amountCents = amountByMethod(payments, method);
    return { method, amountCents, share: total > 0 ? amountCents / total : 0 };
  });
}

/**
 * Produtos mais vendidos no período, por valor vendido. Itens avulsos ficam de fora.
 * @param {Sale[]} sales
 * @param {Period} period
 * @param {number} [limit=5]
 */
export function topProducts(sales, period, limit = 5) {
  const ranking = new Map();
  for (const sale of activeSales(filterByPeriod(sales, period))) {
    for (const item of sale.items) {
      if (!item.productId) continue;
      const entry = ranking.get(item.productId) ?? {
        productId: item.productId,
        name: item.name,
        emoji: item.emoji,
        unit: item.unit,
        quantity: 0,
        revenueCents: 0,
      };
      entry.quantity = roundQuantity(entry.quantity + item.quantity);
      entry.revenueCents += item.totalCents;
      ranking.set(item.productId, entry);
    }
  }
  return [...ranking.values()]
    .sort((a, b) => b.revenueCents - a.revenueCents || b.quantity - a.quantity)
    .slice(0, limit);
}
