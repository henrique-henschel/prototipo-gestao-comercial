import { closingDifference, expectedCash, summarizeCashDay, validateExpense } from './cash.js';

/** Instante local num dia, para o teste não depender do fuso. */
const at = (day, hour = 10) => new Date(2026, 9, day, hour).toISOString();

const sales = [
  {
    createdAt: at(21),
    status: 'concluida',
    totalCents: 3000,
    payments: [
      { method: 'dinheiro', amountCents: 2000, receivedCents: 5000, changeCents: 3000 },
      { method: 'pix', amountCents: 1000 },
    ],
  },
  {
    createdAt: at(21, 15),
    status: 'concluida',
    totalCents: 1500,
    payments: [{ method: 'fiado', amountCents: 1500 }],
  },
  {
    createdAt: at(21, 16),
    status: 'cancelada',
    totalCents: 9000,
    payments: [{ method: 'dinheiro', amountCents: 9000 }],
  },
  {
    createdAt: at(20),
    status: 'concluida',
    totalCents: 700,
    payments: [{ method: 'dinheiro', amountCents: 700 }],
  },
];
const fiadoPayments = [
  { createdAt: at(21), method: 'dinheiro', amountCents: 800 },
  { createdAt: at(21), method: 'pix', amountCents: 400 },
];
const expenses = [
  { createdAt: at(21), method: 'dinheiro', amountCents: 1200 },
  { createdAt: at(21), method: 'outro', amountCents: 5000 },
];

describe('caixa do dia', () => {
  it('6.4 calcula o dinheiro esperado na gaveta', () => {
    expect(
      expectedCash({
        openingCents: 5000,
        cashSalesCents: 2000,
        cashFiadoCents: 800,
        cashExpensesCents: 1200,
      }),
    ).toBe(6600);
  });

  it('6.2 a 6.4 resumem o dia: entradas por forma, fiado separado e despesas', () => {
    const summary = summarizeCashDay({
      date: '2026-10-21',
      sales,
      fiadoPayments,
      expenses,
      cashDay: { openingCents: 5000 },
    });
    expect(summary).toMatchObject({
      salesCount: 2,
      soldCents: 4500,
      salesByMethod: { dinheiro: 2000, pix: 1000, debito: 0, credito: 0, fiado: 1500 },
      fiadoSoldCents: 1500,
      fiadoReceivedCents: 1200,
      fiadoReceivedByMethod: { dinheiro: 800, pix: 400 },
      expensesCents: 6200,
      cashExpensesCents: 1200,
      openingCents: 5000,
      expectedCashCents: 6600,
    });
  });

  it('6.5 mostra se sobrou ou faltou dinheiro no fechamento', () => {
    expect(closingDifference(6600, 6600)).toEqual({ differenceCents: 0, result: 'certo' });
    expect(closingDifference(7000, 6600)).toEqual({ differenceCents: 400, result: 'sobrou' });
    expect(closingDifference(6000, 6600)).toEqual({ differenceCents: -600, result: 'faltou' });
  });

  it('6.3 valida a despesa', () => {
    expect(validateExpense({ category: 'transporte', amountCents: 2000, method: 'dinheiro' })).toEqual([]);
    expect(validateExpense({ category: 'nada', amountCents: 0, method: 'cheque' })).toEqual([
      'valor_invalido',
      'categoria_invalida',
      'forma_invalida',
    ]);
  });
});
