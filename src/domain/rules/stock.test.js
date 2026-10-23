import {
  applyMovement,
  calcMargin,
  compareStockUrgency,
  findStockShortages,
  isSellingAtLoss,
  movementDelta,
  parseQuantityFromDigits,
  previewMovement,
  quantityDigits,
  revertMovement,
  roundQuantity,
  stockStatus,
  stockValue,
  unitProfit,
  validateMovement,
  validateProduct,
  validateUndoMovement,
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

  it('lê a quantidade do teclado próprio, sem vírgula', () => {
    expect(parseQuantityFromDigits('12')).toBe(12);
    expect(parseQuantityFromDigits('1500', { decimal: true })).toBe(1.5);
    expect(parseQuantityFromDigits('5', { decimal: true })).toBe(0.005);
    expect(parseQuantityFromDigits('1.250 kg', { decimal: true })).toBe(1.25);
    expect(parseQuantityFromDigits('')).toBe(0);
    expect(parseQuantityFromDigits('999999', { max: 9999 })).toBe(9999);
    expect(quantityDigits(1.5, { decimal: true })).toBe('1500');
    expect(quantityDigits(12)).toBe('12');
  });

  it('5.2 calcula o lucro por unidade, que fica negativo no prejuízo', () => {
    expect(unitProfit(600, 250)).toBe(350);
    expect(unitProfit(200, 250)).toBe(-50);
    expect(unitProfit(600, null)).toBeNull();
  });

  it('5.3 mostra a prévia do movimento antes de gravar', () => {
    expect(previewMovement({ quantity: 10 }, 'entrada', 12)).toEqual({ delta: 12, balanceAfter: 22 });
    expect(previewMovement({ quantity: 10 }, 'perda', 2)).toEqual({ delta: -2, balanceAfter: 8 });
    expect(previewMovement({ quantity: 10 }, 'ajuste', 7)).toEqual({ delta: -3, balanceAfter: 7 });
    expect(previewMovement({ quantity: 0.3 }, 'entrada', 0.1)).toEqual({ delta: 0.1, balanceAfter: 0.4 });
  });

  it('5.4 ordena o que acabou, depois o que está acabando, depois pelo nome', () => {
    const items = [
      { ...product, name: 'Bala', quantity: 20 },
      { ...product, name: 'Água', quantity: 20 },
      { ...product, name: 'Coxinha', quantity: 3 },
      { ...product, name: 'Café', trackStock: false },
      { ...product, name: 'Pastel', quantity: 0 },
    ];
    expect(items.sort(compareStockUrgency).map((p) => p.name)).toEqual([
      'Pastel',
      'Coxinha',
      'Água',
      'Bala',
      'Café',
    ]);
  });

  it('5.3 desfaz só a última movimentação manual do produto, nos 5 segundos', () => {
    const at = '2026-10-21T10:00:00.000Z';
    const now = new Date(at).getTime();
    const { product: after, movement } = applyMovement(product, {
      id: 'm2',
      type: 'entrada',
      quantity: 12,
      unitCostCents: 300,
      createdAt: at,
    });
    expect(movement.previousCostCents).toBe(250);
    const older = { id: 'm1', productId: 'p1', type: 'perda', createdAt: '2026-10-21T09:59:58.000Z' };
    const history = [older, movement];
    expect(validateUndoMovement(movement, history, now + 4000)).toEqual([]);
    expect(validateUndoMovement(movement, history, now + 6000)).toEqual(['prazo_desfazer_movimento']);
    expect(validateUndoMovement(older, history, now)).toEqual(['prazo_desfazer_movimento']);
    expect(
      validateUndoMovement({ ...movement, type: 'venda' }, [{ ...movement, type: 'venda' }], now),
    ).toEqual(['prazo_desfazer_movimento']);

    const reverted = revertMovement(after, movement, at);
    expect(reverted).toMatchObject({ quantity: 10, costCents: 250 });
  });
});
