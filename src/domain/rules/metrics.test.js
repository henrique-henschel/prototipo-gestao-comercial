import {
  compareValues,
  compareWithPrevious,
  dailySeries,
  paymentMix,
  periodMetrics,
  topProducts,
} from './metrics.js';
import { filterByPeriod, isInPeriod, periodFromPreset, previousPeriod } from './period.js';

const at = (day, hour = 10) => new Date(2026, 9, day, hour).toISOString();

function sale(day, { total, items, payments, status = 'concluida' }) {
  return { createdAt: at(day), status, totalCents: total, items, payments };
}

const coxinha = { productId: 'p1', name: 'Coxinha', emoji: '🥟', unit: 'un' };
const suco = { productId: 'p2', name: 'Suco', emoji: '🧃', unit: 'un' };

const sales = [
  sale(21, {
    total: 2000,
    items: [
      { ...coxinha, quantity: 2, totalCents: 1200, unitCostCents: 250 },
      { productId: null, name: 'Avulso', quantity: 1, totalCents: 800, unitCostCents: null },
    ],
    payments: [
      { method: 'credito', amountCents: 1000, feeCents: 35 },
      { method: 'fiado', amountCents: 1000, feeCents: 0 },
    ],
  }),
  sale(21, {
    total: 1000,
    items: [{ ...suco, quantity: 2, totalCents: 1000, unitCostCents: 200 }],
    payments: [{ method: 'pix', amountCents: 1000, feeCents: 0 }],
  }),
  sale(20, {
    total: 1800,
    items: [{ ...coxinha, quantity: 3, totalCents: 1800, unitCostCents: 250 }],
    payments: [{ method: 'dinheiro', amountCents: 1800, feeCents: 0 }],
  }),
  sale(21, {
    total: 9900,
    status: 'cancelada',
    items: [{ ...suco, quantity: 1, totalCents: 9900, unitCostCents: 0 }],
    payments: [{ method: 'pix', amountCents: 9900, feeCents: 0 }],
  }),
];
const fiadoPayments = [{ createdAt: at(21), amountCents: 400 }];
const expenses = [{ createdAt: at(21), amountCents: 300 }];

describe('períodos', () => {
  it('8 monta os períodos dos atalhos', () => {
    expect(periodFromPreset('hoje', '2026-10-21')).toEqual({ start: '2026-10-21', end: '2026-10-21' });
    expect(periodFromPreset('ontem', '2026-10-01')).toEqual({ start: '2026-09-30', end: '2026-09-30' });
    expect(periodFromPreset('7dias', '2026-10-21')).toEqual({ start: '2026-10-15', end: '2026-10-21' });
    expect(periodFromPreset('este_mes', '2026-10-21')).toEqual({ start: '2026-10-01', end: '2026-10-21' });
    expect(periodFromPreset('mes_passado', '2026-03-15')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(() => periodFromPreset('nunca')).toThrow();
  });

  it('7 compara com o período anterior de mesma duração', () => {
    expect(previousPeriod({ start: '2026-10-21', end: '2026-10-21' })).toEqual({
      start: '2026-10-20',
      end: '2026-10-20',
    });
    expect(previousPeriod({ start: '2026-10-15', end: '2026-10-21' })).toEqual({
      start: '2026-10-08',
      end: '2026-10-14',
    });
  });

  it('filtra registros pelo dia local', () => {
    const period = { start: '2026-10-21', end: '2026-10-21' };
    expect(isInPeriod(at(21, 23), period)).toBe(true);
    expect(isInPeriod('2026-10-21', period)).toBe(true);
    expect(filterByPeriod(sales, period)).toHaveLength(3);
  });
});

describe('métricas', () => {
  const today = { start: '2026-10-21', end: '2026-10-21' };

  it('7 calcula vendido, recebido, custo, taxas e lucro estimado', () => {
    expect(periodMetrics({ sales, fiadoPayments, expenses, period: today })).toEqual({
      soldCents: 3000,
      receivedCents: 2400,
      fiadoSoldCents: 1000,
      fiadoReceivedCents: 400,
      costCents: 900,
      feesCents: 35,
      expensesCents: 300,
      profitCents: 1765,
      salesCount: 2,
      averageTicketCents: 1500,
      hasMissingCost: true,
    });
    const empty = periodMetrics({ sales: [], fiadoPayments: [], expenses: [], period: today });
    expect(empty.averageTicketCents).toBe(0);
  });

  it('7 compara hoje com ontem', () => {
    const comparison = compareWithPrevious({ sales, fiadoPayments, expenses, period: today });
    expect(comparison.sold).toEqual({
      current: 3000,
      previous: 1800,
      difference: 1200,
      percent: 1200 / 1800,
    });
    expect(comparison.received).toMatchObject({
      current: comparison.current.receivedCents,
      previous: comparison.previous.receivedCents,
    });
    expect(compareValues(10, 0).percent).toBeNull();
    expect(compareValues(-50, -100).percent).toBe(0.5);
  });

  it('7 compara hoje com ontem até a mesma hora', () => {
    const cash = (day, hour, total) => ({
      ...sale(day, { total, items: [], payments: [{ method: 'dinheiro', amountCents: total }] }),
      createdAt: at(day, hour),
    });
    const list = [cash(20, 9, 1000), cash(20, 15, 5000), cash(21, 9, 1500)];
    const input = {
      sales: list,
      fiadoPayments: [],
      expenses: [],
      period: { start: '2026-10-21', end: '2026-10-21' },
    };
    expect(compareWithPrevious(input).sold.previous).toBe(6000);
    expect(compareWithPrevious(input, { now: at(21, 12) }).sold).toMatchObject({
      previous: 1000,
      difference: 500,
    });
    // Período que não termina hoje: compara os dias inteiros.
    expect(compareWithPrevious(input, { now: at(22, 12) }).sold.previous).toBe(6000);
  });

  it('monta a série diária com zeros nos dias sem venda', () => {
    expect(dailySeries(sales, { start: '2026-10-19', end: '2026-10-21' })).toEqual([
      { date: '2026-10-19', soldCents: 0, salesCount: 0 },
      { date: '2026-10-20', soldCents: 1800, salesCount: 1 },
      { date: '2026-10-21', soldCents: 3000, salesCount: 2 },
    ]);
  });

  it('separa por forma de pagamento na ordem fixa', () => {
    const mix = paymentMix(sales, today);
    expect(mix.map((row) => row.method)).toEqual(['dinheiro', 'pix', 'debito', 'credito', 'fiado']);
    expect(mix.find((row) => row.method === 'pix')).toEqual({
      method: 'pix',
      amountCents: 1000,
      share: 1 / 3,
    });
  });

  it('classifica os produtos mais vendidos, sem itens avulsos e sem canceladas', () => {
    expect(topProducts(sales, { start: '2026-10-20', end: '2026-10-21' })).toEqual([
      { productId: 'p1', name: 'Coxinha', emoji: '🥟', unit: 'un', quantity: 5, revenueCents: 3000 },
      { productId: 'p2', name: 'Suco', emoji: '🧃', unit: 'un', quantity: 2, revenueCents: 1000 },
    ]);
  });
});
