import {
  applyMovement,
  calcMargin,
  findStockShortages,
  isSellingAtLoss,
  movementDelta,
  roundQuantity,
  stockStatus,
  stockValue,
  validateMovement,
  validateProduct,
} from './stock.js';

const product = {
  id: 'p1',
  name: 'Coxinha',
  trackStock: true,
  active: true,
  quantity: 10,
  minQuantity: 5,
  priceCents: 600,
  costCents: 250,
  updatedAt: '2026-10-01T10:00:00Z',
};

describe('estoque', () => {
  it('5.4 calcula a situação, e sem controle não há situação', () => {
    expect(stockStatus(product)).toBe('ok');
    expect(stockStatus({ ...product, quantity: 5 })).toBe('acabando');
    expect(stockStatus({ ...product, quantity: 0 })).toBe('acabou');
    expect(stockStatus({ ...product, quantity: -2 })).toBe('acabou');
    expect(stockStatus({ ...product, trackStock: false, quantity: 0 })).toBeNull();
  });

  it('5.2 calcula a margem e o alerta de prejuízo', () => {
    expect(calcMargin(600, 250)).toBeCloseTo(0.5833, 4);
    expect(calcMargin(600, null)).toBeNull();
    expect(calcMargin(0, 100)).toBeNull();
    expect(isSellingAtLoss(500, 600)).toBe(true);
    expect(isSellingAtLoss(500, null)).toBe(false);
  });

  it('5.3 aplica cada tipo de movimento', () => {
    expect(movementDelta('entrada', 12, 10)).toBe(12);
    expect(movementDelta('venda', 3, 10)).toBe(-3);
    expect(movementDelta('estorno', 3, 10)).toBe(3);
    expect(movementDelta('perda', 1, 10)).toBe(-1);
    expect(movementDelta('ajuste', 7, 10)).toBe(-3);
    expect(movementDelta('ajuste', 0.3, 0.1)).toBe(0.2);
    expect(() => movementDelta('outro', 1, 1)).toThrow();
    expect(roundQuantity(0.1 + 0.2)).toBe(0.3);
  });

  it('5.3 registra o movimento e a entrada atualiza o custo', () => {
    const createdAt = '2026-10-21T10:00:00Z';
    const entrada = applyMovement(product, {
      id: 'm1',
      type: 'entrada',
      quantity: 20,
      unitCostCents: 280,
      createdAt,
    });
    expect(entrada.product).toMatchObject({ quantity: 30, costCents: 280, updatedAt: createdAt });
    expect(entrada.movement).toMatchObject({
      delta: 20,
      balanceAfter: 30,
      unitCostCents: 280,
      productId: 'p1',
    });

    const perda = applyMovement(product, {
      id: 'm2',
      type: 'perda',
      quantity: 2,
      reason: 'vencido',
      createdAt,
    });
    expect(perda.product).toMatchObject({ quantity: 8, costCents: 250 });
    expect(perda.movement).toMatchObject({ delta: -2, reason: 'vencido', unitCostCents: null });

    const ajuste = applyMovement(product, { id: 'm3', type: 'ajuste', quantity: 4, createdAt });
    expect(ajuste.movement).toMatchObject({ delta: -6, balanceAfter: 4 });
  });

  it('5.1 valida o cadastro do produto', () => {
    const valid = { name: 'Coxinha', priceCents: 600, costCents: null, unit: 'un', category: 'salgados' };
    expect(validateProduct(valid)).toEqual([]);
    expect(
      validateProduct({
        name: '',
        priceCents: 6.5,
        costCents: -1,
        unit: 'saco',
        category: 'x',
        quantity: -1,
      }),
    ).toEqual([
      'nome_obrigatorio',
      'preco_invalido',
      'custo_invalido',
      'unidade_invalida',
      'categoria_invalida',
      'quantidade_invalida',
    ]);
  });

  it('valida movimentos manuais', () => {
    expect(validateMovement({ type: 'entrada', quantity: 5 })).toEqual([]);
    expect(validateMovement({ type: 'entrada', quantity: 0 })).toEqual(['quantidade_invalida']);
    expect(validateMovement({ type: 'ajuste', quantity: 0 })).toEqual([]);
    expect(validateMovement({ type: 'perda', quantity: 1 })).toEqual(['motivo_obrigatorio']);
  });

  it('1.9 encontra produtos sem estoque suficiente, ignorando os sem controle', () => {
    const products = [product, { ...product, id: 'p2', name: 'Bala', trackStock: false, quantity: 0 }];
    const items = [
      { productId: 'p1', quantity: 6 },
      { productId: 'p1', quantity: 6 },
      { productId: 'p2', quantity: 50 },
      { productId: null, quantity: 1 },
    ];
    expect(findStockShortages(items, products)).toEqual([
      { productId: 'p1', name: 'Coxinha', requested: 12, available: 10 },
    ]);
    expect(findStockShortages([{ productId: 'p1', quantity: 10 }], products)).toEqual([]);
  });

  it('calcula o valor parado no estoque', () => {
    const products = [
      product,
      { ...product, id: 'p2', costCents: null, quantity: 2 },
      { ...product, id: 'p3', quantity: -1 },
      { ...product, id: 'p4', active: false },
    ];
    expect(stockValue(products)).toEqual({ costCents: 2500, saleCents: 7200, missingCostCount: 1 });
  });
});
