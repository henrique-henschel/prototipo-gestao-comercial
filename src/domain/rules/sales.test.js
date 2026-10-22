import {
  activeSales,
  calcDiscount,
  calcSaleTotals,
  calcSubtotal,
  canUndoSale,
  lineTotal,
  quantitiesByProduct,
  requiresCustomer,
  validateCancellation,
  validateSale,
} from './sales.js';

describe('vendas', () => {
  it('1.2 calcula a linha e o subtotal, arredondando quantidades em kg', () => {
    expect(lineTotal({ unitPriceCents: 350, quantity: 3 })).toBe(1050);
    expect(lineTotal({ unitPriceCents: 1299, quantity: 0.755 })).toBe(981);
    expect(
      calcSubtotal([
        { unitPriceCents: 350, quantity: 2 },
        { unitPriceCents: 1000, quantity: 1 },
      ]),
    ).toBe(1700);
    expect(calcSubtotal([])).toBe(0);
  });

  it('1.3 aplica desconto em R$ ou % sem deixar o total negativo', () => {
    expect(calcDiscount(2000, { type: 'valor', value: 500 })).toBe(500);
    expect(calcDiscount(2000, { type: 'valor', value: 5000 })).toBe(2000);
    expect(calcDiscount(2000, { type: 'percentual', value: 10 })).toBe(200);
    expect(calcDiscount(2000, { type: 'percentual', value: 150 })).toBe(2000);
    expect(calcDiscount(999, { type: 'percentual', value: 33.3 })).toBe(333);
    expect(calcDiscount(2000, null)).toBe(0);
    expect(calcDiscount(2000, { type: 'valor', value: -100 })).toBe(0);
  });

  it('1.4 total = subtotal − desconto', () => {
    const items = [{ unitPriceCents: 1250, quantity: 2 }];
    expect(calcSaleTotals(items, { type: 'valor', value: 500 })).toEqual({
      subtotalCents: 2500,
      discountCents: 500,
      totalCents: 2000,
    });
  });

  it('1.4 e 1.5 exigem confirmação para total zero e cliente no fiado', () => {
    const base = { items: [{}], totalCents: 1000, payments: [{ method: 'dinheiro' }] };
    expect(validateSale(base)).toEqual([]);
    expect(validateSale({ ...base, items: [] })).toEqual(['sem_itens']);
    expect(validateSale({ ...base, totalCents: 0, payments: [] })).toEqual(['total_zero']);
    expect(validateSale({ ...base, totalCents: 0, payments: [], allowZeroTotal: true })).toEqual([]);
    expect(validateSale({ ...base, payments: [{ method: 'fiado' }] })).toEqual(['cliente_obrigatorio']);
    expect(validateSale({ ...base, payments: [{ method: 'fiado' }], customerId: 'c1' })).toEqual([]);
    expect(requiresCustomer([{ method: 'pix' }, { method: 'fiado' }])).toBe(true);
  });

  it('soma as quantidades por produto e ignora itens avulsos', () => {
    const totals = quantitiesByProduct([
      { productId: 'a', quantity: 1 },
      { productId: null, quantity: 1 },
      { productId: 'a', quantity: 2 },
      { productId: 'b', quantity: 0.5 },
    ]);
    expect([...totals]).toEqual([
      ['a', 3],
      ['b', 0.5],
    ]);
  });

  it('1.7 permite desfazer só nos 5 segundos seguintes', () => {
    const createdAt = '2026-10-21T12:00:00.000Z';
    const at = (ms) => new Date(createdAt).getTime() + ms;
    expect(canUndoSale({ createdAt, status: 'concluida' }, at(4000))).toBe(true);
    expect(canUndoSale({ createdAt, status: 'concluida' }, at(6000))).toBe(false);
    expect(canUndoSale({ createdAt, status: 'cancelada' }, at(1000))).toBe(false);
  });

  it('1.8 cancela só com motivo, e canceladas saem das contas', () => {
    expect(validateCancellation({ status: 'concluida' }, 'outro')).toEqual([]);
    expect(validateCancellation({ status: 'concluida' }, '')).toEqual(['motivo_obrigatorio']);
    expect(validateCancellation({ status: 'cancelada' }, 'outro')).toEqual(['ja_cancelada']);
    expect(activeSales([{ status: 'concluida' }, { status: 'cancelada' }])).toHaveLength(1);
  });
});
