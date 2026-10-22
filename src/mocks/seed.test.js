import { FIADO_STATUS_SEVERITY } from '@/domain/constants.js';
import { accountStatus } from '@/domain/rules/fiado.js';
import { sumCents } from '@/domain/rules/money.js';
import { paymentProgress } from '@/domain/rules/payments.js';
import { calcSaleTotals } from '@/domain/rules/sales.js';
import { roundQuantity, stockStatus } from '@/domain/rules/stock.js';
import { createEmptyData, createSeed, HISTORY_DAYS } from './seed.js';

const NOW = new Date(2026, 9, 21, 15, 30);
const TODAY = '2026-10-21';

describe('dados de exemplo', () => {
  const data = createSeed({ now: NOW });

  it('é determinístico para a mesma data de referência', () => {
    expect(JSON.stringify(createSeed({ now: NOW }))).toBe(JSON.stringify(data));
    expect(JSON.stringify(createSeed({ now: NOW, seed: 1 }))).not.toBe(JSON.stringify(data));
  });

  it('tem o volume do plano: ~25 produtos, ~15 clientes, ~400 vendas em 90 dias', () => {
    expect(data.products.length).toBeGreaterThanOrEqual(25);
    expect(data.customers).toHaveLength(15);
    expect(data.sales.length).toBeGreaterThan(350);
    expect(data.sales.length).toBeLessThan(500);
    expect(data.expenses.length).toBeGreaterThan(50);
    expect(data.cashDays.length).toBeLessThanOrEqual(HISTORY_DAYS);
  });

  it('nunca gera registros no futuro', () => {
    const records = [...data.sales, ...data.fiadoPayments, ...data.expenses, ...data.stockMovements];
    expect(records.every((record) => new Date(record.createdAt) <= NOW)).toBe(true);
  });

  it('tem fiado em todos os status e estoque em todas as situações', () => {
    const statuses = new Set(data.fiadoAccounts.map((account) => accountStatus(account, TODAY)));
    expect([...statuses].sort()).toEqual(Object.keys(FIADO_STATUS_SEVERITY).sort());
    const situations = new Set(data.products.map(stockStatus));
    expect(situations).toEqual(new Set(['ok', 'acabando', 'acabou', null]));
    expect(data.products.some((product) => !product.active)).toBe(true);
    expect(data.customers.some((customer) => customer.fiadoBlocked)).toBe(true);
    expect(data.customers.some((customer) => customer.creditCents > 0)).toBe(true);
  });

  it('as vendas batem com as regras: totais, pagamentos e numeração', () => {
    data.sales.forEach((sale, index) => {
      expect(sale.number).toBe(index + 1);
      const totals = calcSaleTotals(sale.items, sale.discount);
      expect(sale.totalCents).toBe(totals.totalCents);
      expect(paymentProgress(sale.totalCents, sale.payments).isComplete).toBe(true);
      if (sale.payments.some((payment) => payment.method === 'fiado')) expect(sale.customerId).toBeTruthy();
    });
    expect(data.nextSaleNumber).toBe(data.sales.length + 1);
  });

  it('o estoque de cada produto é a soma das movimentações', () => {
    for (const product of data.products.filter((p) => p.trackStock)) {
      const deltas = data.stockMovements.filter((m) => m.productId === product.id).map((m) => m.delta);
      expect(roundQuantity(deltas.reduce((sum, delta) => sum + delta, 0))).toBe(product.quantity);
    }
  });

  it('o valor pago de cada conta de fiado é a soma dos abatimentos', () => {
    const allocations = data.fiadoPayments.flatMap((payment) => payment.allocations);
    for (const account of data.fiadoAccounts) {
      const paid = sumCents(allocations.filter((a) => a.accountId === account.id).map((a) => a.amountCents));
      expect(paid).toBe(account.paidCents);
      expect(paid).toBeLessThanOrEqual(account.originalCents);
    }
  });

  it('fecha os dias passados e deixa o caixa de hoje aberto', () => {
    const past = data.cashDays.filter((day) => day.date !== TODAY);
    expect(past.every((day) => day.closedAt && day.countedCents !== null)).toBe(true);
    expect(data.cashDays.find((day) => day.date === TODAY)?.closedAt).toBeNull();
  });

  it('começar do zero cria um negócio vazio, ainda sem boas-vindas', () => {
    const empty = createEmptyData({ now: NOW });
    expect(empty.business.onboarded).toBe(false);
    expect(empty.sales).toEqual([]);
    expect(empty.nextSaleNumber).toBe(1);
  });
});
