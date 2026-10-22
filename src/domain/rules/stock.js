import { PRODUCT_CATEGORIES, STOCK_STATUS, UNITS } from '../constants.js';
import { sumCents } from './money.js';
import { quantitiesByProduct } from './sales.js';

/**
 * Regras de estoque (seção 5 de docs/regras-de-negocio.md).
 * @typedef {import('../models.js').Cents} Cents
 * @typedef {import('../models.js').Product} Product
 * @typedef {import('../models.js').StockMovement} StockMovement
 * @typedef {import('../models.js').StockMovementType} StockMovementType
 * @typedef {import('../models.js').StockStatus} StockStatus
 */

/**
 * Quantidades com no máximo 3 casas decimais, sem resíduo de ponto flutuante (0,1 + 0,2 kg).
 * @param {number} value
 */
export function roundQuantity(value) {
  return Math.round(value * 1000) / 1000;
}

/**
 * Situação do estoque; produtos sem controle de estoque não têm situação. Regra 5.4.
 * @param {Pick<Product, 'trackStock'|'quantity'|'minQuantity'>} product
 * @returns {StockStatus|null}
 */
export function stockStatus(product) {
  if (!product.trackStock) return null;
  if (product.quantity <= 0) return STOCK_STATUS.ACABOU;
  if (product.quantity <= product.minQuantity) return STOCK_STATUS.ACABANDO;
  return STOCK_STATUS.OK;
}

/**
 * Margem = (preço − custo) ÷ preço, como fração. Sem custo (ou preço zero), não há margem. Regra 5.2.
 * @param {Cents} priceCents
 * @param {Cents|null|undefined} costCents
 * @returns {number|null}
 */
export function calcMargin(priceCents, costCents) {
  if (costCents == null || !(priceCents > 0)) return null;
  return (priceCents - costCents) / priceCents;
}

/**
 * Preço menor que o custo: a interface alerta "vendendo no prejuízo". Regra 5.2.
 * @param {Cents} priceCents
 * @param {Cents|null|undefined} costCents
 */
export function isSellingAtLoss(priceCents, costCents) {
  return costCents != null && priceCents < costCents;
}

/**
 * Valida o cadastro de um produto. Regra 5.1.
 * @param {{ name?: string, priceCents?: number, costCents?: number|null, unit?: string,
 *   category?: string, quantity?: number, minQuantity?: number }} input
 * @returns {string[]} códigos: `nome_obrigatorio`, `preco_invalido`, `custo_invalido`,
 *   `unidade_invalida`, `categoria_invalida`, `quantidade_invalida`
 */
export function validateProduct({
  name,
  priceCents,
  costCents,
  unit,
  category,
  quantity = 0,
  minQuantity = 0,
}) {
  const errors = [];
  const isCents = (value) => Number.isInteger(value) && value >= 0;
  if (!name?.trim()) errors.push('nome_obrigatorio');
  if (!isCents(priceCents)) errors.push('preco_invalido');
  if (costCents != null && !isCents(costCents)) errors.push('custo_invalido');
  if (!(unit in UNITS)) errors.push('unidade_invalida');
  if (!PRODUCT_CATEGORIES.some((option) => option.value === category)) errors.push('categoria_invalida');
  if (!(quantity >= 0 && minQuantity >= 0)) errors.push('quantidade_invalida');
  return errors;
}

/**
 * Variação que um movimento causa na quantidade. Regra 5.3.
 * `quantity` é sempre positiva, exceto no `ajuste`, em que é a quantidade contada.
 * @param {StockMovementType} type
 * @param {number} quantity
 * @param {number} currentQuantity
 */
export function movementDelta(type, quantity, currentQuantity) {
  switch (type) {
    case 'entrada':
    case 'estorno':
      return roundQuantity(quantity);
    case 'venda':
    case 'perda':
      return roundQuantity(-quantity);
    case 'ajuste':
      return roundQuantity(quantity - currentQuantity);
    default:
      throw new Error(`Tipo de movimento desconhecido: ${type}`);
  }
}

/**
 * Valida os dados de um movimento manual (entrada, ajuste ou perda).
 * @param {{ type: StockMovementType, quantity: number, reason?: string|null }} input
 * @returns {('quantidade_invalida'|'motivo_obrigatorio')[]}
 */
export function validateMovement({ type, quantity, reason }) {
  const errors = [];
  const valid = Number.isFinite(quantity) && (type === 'ajuste' ? quantity >= 0 : quantity > 0);
  if (!valid) errors.push('quantidade_invalida');
  if (type === 'perda' && !reason) errors.push('motivo_obrigatorio');
  return errors;
}

/**
 * Aplica um movimento ao produto e devolve o produto atualizado e o registro do histórico.
 * A entrada pode atualizar o custo do produto. Regra 5.3.
 * @param {Product} product
 * @param {{ id: string, type: StockMovementType, quantity: number, unitCostCents?: Cents|null,
 *   reason?: string|null, saleId?: string|null, note?: string, createdAt: string }} input
 * @returns {{ product: Product, movement: StockMovement }}
 */
export function applyMovement(product, input) {
  const delta = movementDelta(input.type, input.quantity, product.quantity);
  const balanceAfter = roundQuantity(product.quantity + delta);
  const unitCostCents = input.type === 'entrada' ? (input.unitCostCents ?? null) : null;
  const movement = {
    id: input.id,
    productId: product.id,
    type: input.type,
    delta,
    balanceAfter,
    unitCostCents,
    reason: input.reason ?? null,
    saleId: input.saleId ?? null,
    note: input.note ?? '',
    createdAt: input.createdAt,
  };
  const updated = {
    ...product,
    quantity: balanceAfter,
    costCents: unitCostCents ?? product.costCents,
    updatedAt: input.createdAt,
  };
  return { product: updated, movement };
}

/**
 * Produtos com controle de estoque que não têm quantidade suficiente para os itens. Regra 1.9.
 * @param {{ productId?: string|null, quantity: number }[]} items
 * @param {Product[]} products
 * @returns {{ productId: string, name: string, requested: number, available: number }[]}
 */
export function findStockShortages(items, products) {
  const byId = new Map(products.map((product) => [product.id, product]));
  const shortages = [];
  for (const [productId, requested] of quantitiesByProduct(items)) {
    const product = byId.get(productId);
    if (!product?.trackStock) continue;
    if (roundQuantity(requested) > product.quantity) {
      shortages.push({ productId, name: product.name, requested, available: product.quantity });
    }
  }
  return shortages;
}

/**
 * Valor parado no estoque (a custo e a preço de venda), só de produtos ativos com controle
 * e quantidade positiva. Produtos sem custo ficam de fora do valor a custo.
 * @param {Product[]} products
 */
export function stockValue(products) {
  const counted = products.filter((p) => p.active && p.trackStock && p.quantity > 0);
  return {
    costCents: sumCents(counted.map((p) => Math.round((p.costCents ?? 0) * p.quantity))),
    saleCents: sumCents(counted.map((p) => Math.round(p.priceCents * p.quantity))),
    missingCostCount: counted.filter((p) => p.costCents == null).length,
  };
}
