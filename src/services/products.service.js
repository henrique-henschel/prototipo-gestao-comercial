import {
  applyMovement,
  revertMovement,
  validateMovement,
  validateProduct,
  validateUndoMovement,
} from '@/domain/rules/stock.js';
import { createId } from '@/lib/id.js';
import { ApiError, assertValid, findOrFail, nowISO, request } from './api.js';

/**
 * Produtos e movimentações de estoque.
 * @typedef {import('@/domain/models.js').Product} Product
 * @typedef {import('@/domain/models.js').StockMovement} StockMovement
 */

/** Movimentos que o vendedor faz à mão; `venda` e `estorno` são automáticos. */
const MANUAL_MOVEMENTS = ['entrada', 'ajuste', 'perda'];

/**
 * GET /products — todos, inclusive inativos, na ordem de cadastro.
 * @returns {Promise<Product[]>}
 */
export function listProducts() {
  return request((db) => db.products);
}

/**
 * GET /products/:id
 * @param {string} id
 * @returns {Promise<Product>}
 */
export function getProduct(id) {
  return request((db) => findOrFail(db.products, id));
}

/**
 * POST /products. Uma quantidade inicial vira uma movimentação de entrada.
 * @param {Omit<Product, 'id'|'createdAt'|'updatedAt'|'quantity'> & { quantity?: number }} input
 * @returns {Promise<{ product: Product, movement: StockMovement|null }>}
 */
export function createProduct(input) {
  return request((db) => {
    assertValid(validateProduct(input));
    const createdAt = nowISO();
    let product = {
      id: createId('prod'),
      name: input.name.trim(),
      emoji: input.emoji || '📦',
      color: input.color || 'verde',
      category: input.category,
      unit: input.unit,
      priceCents: input.priceCents,
      costCents: input.costCents ?? null,
      quantity: 0,
      minQuantity: input.minQuantity ?? 0,
      code: input.code || null,
      trackStock: input.trackStock ?? true,
      active: input.active ?? true,
      createdAt,
      updatedAt: createdAt,
    };
    let movement = null;
    if (product.trackStock && input.quantity > 0) {
      ({ product, movement } = applyMovement(product, {
        id: createId('mov'),
        type: 'entrada',
        quantity: input.quantity,
        unitCostCents: product.costCents,
        note: 'Estoque inicial',
        createdAt,
      }));
    }
    db.products = [...db.products, product];
    if (movement) db.stockMovements = [...db.stockMovements, movement];
    return { product, movement };
  });
}

/**
 * PATCH /products/:id. A quantidade só muda por movimentação (`addStockMovement`).
 * @param {string} id
 * @param {Partial<Omit<Product, 'id'|'quantity'|'createdAt'|'updatedAt'>>} changes
 * @returns {Promise<Product>}
 */
export function updateProduct(id, changes) {
  return request((db) => {
    const current = findOrFail(db.products, id);
    const { quantity: _ignored, ...allowed } = changes;
    const next = { ...current, ...allowed, id, updatedAt: nowISO() };
    assertValid(validateProduct(next));
    db.products = db.products.map((product) => (product.id === id ? next : product));
    return next;
  });
}

/**
 * GET /stock-movements?productId= — em ordem cronológica.
 * @param {{ productId?: string }} [filters]
 * @returns {Promise<StockMovement[]>}
 */
export function listStockMovements({ productId } = {}) {
  return request((db) =>
    productId ? db.stockMovements.filter((movement) => movement.productId === productId) : db.stockMovements,
  );
}

/**
 * POST /products/:id/movements — entrada de mercadoria, ajuste (contagem) ou perda.
 * @param {string} productId
 * @param {{ type: 'entrada'|'ajuste'|'perda', quantity: number, unitCostCents?: number|null, reason?: string|null, note?: string }} input
 * @returns {Promise<{ product: Product, movement: StockMovement }>}
 */
export function addStockMovement(productId, input) {
  return request((db) => {
    const current = findOrFail(db.products, productId);
    if (!MANUAL_MOVEMENTS.includes(input.type)) throw new ApiError('movimento_invalido');
    if (!current.trackStock) throw new ApiError('sem_controle_estoque');
    assertValid(validateMovement(input));
    const result = applyMovement(current, { ...input, id: createId('mov'), createdAt: nowISO() });
    db.products = db.products.map((product) => (product.id === productId ? result.product : product));
    db.stockMovements = [...db.stockMovements, result.movement];
    return result;
  });
}

/**
 * DELETE /stock-movements/:id — "Desfazer" de uma entrada, ajuste ou perda nos 5 segundos
 * seguintes (`validateUndoMovement`): a movimentação some do histórico e o produto volta
 * à quantidade (e, numa entrada, ao custo) de antes. O prazo conta a partir do toque.
 * @param {string} movementId
 * @returns {Promise<{ movementId: string, product: Product }>}
 */
export function undoStockMovement(movementId) {
  const requestedAt = Date.now();
  return request((db) => {
    const movement = findOrFail(db.stockMovements, movementId);
    assertValid(validateUndoMovement(movement, db.stockMovements, requestedAt));
    const product = revertMovement(findOrFail(db.products, movement.productId), movement, nowISO());
    db.products = db.products.map((p) => (p.id === product.id ? product : p));
    db.stockMovements = db.stockMovements.filter((m) => m.id !== movementId);
    return { movementId, product };
  });
}
