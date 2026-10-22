import { itemsSummary, receiptText } from './receipt.js';

const sale = {
  number: 412,
  createdAt: '2026-10-22T15:30:00.000Z',
  items: [
    { productId: 'p1', name: 'Coxinha', unit: 'un', quantity: 2, totalCents: 1200 },
    { productId: 'p2', name: 'Laranja', unit: 'kg', quantity: 1.5, totalCents: 899 },
    { productId: null, name: 'Gelo', unit: 'un', quantity: 1, totalCents: 300 },
  ],
  subtotalCents: 2399,
  discountCents: 399,
  totalCents: 2000,
  payments: [
    { method: 'credito', amountCents: 1000, installments: 3 },
    { method: 'dinheiro', amountCents: 1000, receivedCents: 2000, changeCents: 1000 },
  ],
  changeCents: 1000,
  status: 'concluida',
};

describe('recibo', () => {
  it('lista itens, desconto, total, formas e troco em linhas curtas', () => {
    const text = receiptText(sale, { businessName: 'Barraca da Rosa', customerName: 'Maria' });
    expect(text).toContain('*Barraca da Rosa*');
    expect(text).toContain('Venda nº 412');
    expect(text).toContain('Cliente: Maria');
    expect(text).toContain('2 un Coxinha: R$ 12,00');
    expect(text).toContain('1,5 kg Laranja: R$ 8,99');
    expect(text).toContain('Gelo: R$ 3,00');
    expect(text).toContain('Desconto: − R$ 3,99');
    expect(text).toContain('*Total: R$ 20,00*');
    expect(text).toContain('Cartão de crédito: R$ 10,00 em 3x');
    expect(text).toContain('Troco: R$ 10,00');
  });

  it('resume os itens para as listas', () => {
    expect(itemsSummary(sale.items)).toBe('2 Coxinha, 1,5 Laranja e mais 1');
    expect(itemsSummary(sale.items.slice(0, 1))).toBe('2 Coxinha');
  });
});
