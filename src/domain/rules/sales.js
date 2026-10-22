import { DISCOUNT_TYPES, SALE_STATUS, UNDO_WINDOW_MS } from '../constants.js';
import { percentOf, sumCents } from './money.js';

/**
 * Regras de venda (seção 1 de docs/regras-de-negocio.md).
 * @typedef {import('../models.js').Cents} Cents
 * @typedef {import('../models.js').Discount} Discount
 * @typedef {import('../models.js').Payment} Payment
 * @typedef {import('../models.js').Sale} Sale
 */

/**
 * Total de uma linha: preço × quantidade, arredondado ao centavo (quantidades em kg). Regra 1.2.
 * @param {{ unitPriceCents: Cents, quantity: number }} item
 * @returns {Cents}
 */
export function lineTotal({ unitPriceCents, quantity }) {
  return Math.round(unitPriceCents * quantity);
}

/**
 * Subtotal = soma das linhas. Regra 1.2.
 * @param {{ unitPriceCents: Cents, quantity: number }[]} items
 * @returns {Cents}
 */
export function calcSubtotal(items) {
  return sumCents(items.map(lineTotal));
}

/**
 * Valor do desconto em centavos, limitado ao subtotal (o total nunca fica negativo)
 * e a 100% quando percentual. Regra 1.3.
 * @param {Cents} subtotalCents
 * @param {Discount|null|undefined} discount
 * @returns {Cents}
 */
export function calcDiscount(subtotalCents, discount) {
  if (!discount || !(discount.value > 0)) return 0;
  if (discount.type === DISCOUNT_TYPES.PERCENTUAL) {
    return percentOf(subtotalCents, Math.min(discount.value, 100));
  }
  return Math.min(Math.round(discount.value), subtotalCents);
}

/**
 * Subtotal, desconto e total de um carrinho. Regras 1.2 a 1.4.
 * @param {{ unitPriceCents: Cents, quantity: number }[]} items
 * @param {Discount|null} [discount]
 * @returns {{ subtotalCents: Cents, discountCents: Cents, totalCents: Cents }}
 */
export function calcSaleTotals(items, discount = null) {
  const subtotalCents = calcSubtotal(items);
  const discountCents = calcDiscount(subtotalCents, discount);
  return { subtotalCents, discountCents, totalCents: subtotalCents - discountCents };
}

/**
 * Cliente é obrigatório quando qualquer parcela é fiado. Regra 1.5.
 * @param {Pick<Payment, 'method'>[]} payments
 */
export function requiresCustomer(payments) {
  return payments.some((payment) => payment.method === 'fiado');
}

/**
 * Problemas que impedem concluir a venda (sem contar pagamentos, ver `validatePayments`).
 * - `sem_itens`: carrinho vazio;
 * - `total_zero`: total zero sem a confirmação de "brinde" (regra 1.4);
 * - `cliente_obrigatorio`: fiado sem cliente (regra 1.5).
 * @param {{ items: unknown[], totalCents: Cents, payments: Pick<Payment, 'method'>[], customerId?: string|null, allowZeroTotal?: boolean }} sale
 * @returns {('sem_itens'|'total_zero'|'cliente_obrigatorio')[]}
 */
export function validateSale({ items, totalCents, payments, customerId, allowZeroTotal = false }) {
  const errors = [];
  if (items.length === 0) errors.push('sem_itens');
  if (items.length > 0 && totalCents === 0 && !allowZeroTotal) errors.push('total_zero');
  if (requiresCustomer(payments) && !customerId) errors.push('cliente_obrigatorio');
  return errors;
}

/**
 * Quantidade vendida de cada produto do estoque (soma linhas repetidas). Itens avulsos ficam de fora.
 * @param {{ productId?: string|null, quantity: number }[]} items
 * @returns {Map<string, number>}
 */
export function quantitiesByProduct(items) {
  const totals = new Map();
  for (const item of items) {
    if (!item.productId) continue;
    totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
  }
  return totals;
}

/**
 * "Desfazer" vale por 5 segundos depois de concluir. Regra 1.7.
 * @param {Pick<Sale, 'createdAt'|'status'>} sale
 * @param {number} [now] Date.now()
 */
export function canUndoSale(sale, now = Date.now()) {
  return sale.status === SALE_STATUS.CONCLUIDA && now - new Date(sale.createdAt).getTime() <= UNDO_WINDOW_MS;
}

/**
 * Só vendas concluídas podem ser canceladas, e o motivo é obrigatório. Regra 1.8.
 * @param {Pick<Sale, 'status'>} sale
 * @param {string|null|undefined} reason
 * @returns {('ja_cancelada'|'motivo_obrigatorio')[]}
 */
export function validateCancellation(sale, reason) {
  const errors = [];
  if (sale.status === SALE_STATUS.CANCELADA) errors.push('ja_cancelada');
  if (!reason) errors.push('motivo_obrigatorio');
  return errors;
}

/**
 * Vendas que contam para faturamento, lucro e caixa (as canceladas saem). Regra 1.8.
 * @param {Sale[]} sales
 */
export function activeSales(sales) {
  return sales.filter((sale) => sale.status !== SALE_STATUS.CANCELADA);
}
