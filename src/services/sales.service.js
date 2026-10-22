import { cancelSaleAccounts, dueDateIn } from '@/domain/rules/fiado.js';
import { finalizePayments, validatePayments } from '@/domain/rules/payments.js';
import { filterByPeriod } from '@/domain/rules/period.js';
import {
  calcSaleTotals,
  canUndoSale,
  lineTotal,
  validateCancellation,
  validateSale,
} from '@/domain/rules/sales.js';
import { applyMovement, findStockShortages } from '@/domain/rules/stock.js';
import { dateOf } from '@/lib/date.js';
import { createId } from '@/lib/id.js';
import { ApiError, assertValid, findOrFail, nowISO, request } from './api.js';

/**
 * Vendas: registrar, desfazer e cancelar (seção 1 de docs/regras-de-negocio.md).
 * @typedef {import('@/domain/models.js').CashDay} CashDay
 * @typedef {import('@/domain/models.js').Customer} Customer
 * @typedef {import('@/domain/models.js').Discount} Discount
 * @typedef {import('@/domain/models.js').FiadoAccount} FiadoAccount
 * @typedef {import('@/domain/models.js').Period} Period
 * @typedef {import('@/domain/models.js').Product} Product
 * @typedef {import('@/domain/models.js').Sale} Sale
 * @typedef {import('@/domain/models.js').StockMovement} StockMovement
 *
 * @typedef {object} SaleItemInput item do carrinho
 * @property {string|null} [productId] produto do estoque; nulo/ausente = valor avulso
 * @property {number} quantity
 * @property {number} [unitPriceCents] só para valor avulso (produtos usam o preço cadastrado)
 * @property {string} [description] só para valor avulso
 *
 * @typedef {object} PaymentInput parcela informada pelo vendedor (troco e taxa são calculados)
 * @property {import('@/domain/models.js').PaymentMethod} method
 * @property {number} amountCents
 * @property {number} [receivedCents] dinheiro
 * @property {number} [installments] crédito
 * @property {string} [dueDate] fiado; padrão: vencimento configurado em Ajustes
 *
 * @typedef {object} CreateSaleInput
 * @property {SaleItemInput[]} items
 * @property {Discount|null} [discount]
 * @property {PaymentInput[]} payments
 * @property {string|null} [customerId]
 * @property {string} [note]
 * @property {boolean} [allowZeroTotal] confirmação de "brinde" (regra 1.4)
 */

/**
 * GET /sales?start=&end=&status= — em ordem cronológica.
 * @param {{ period?: Period, status?: Sale['status'] }} [filters]
 * @returns {Promise<Sale[]>}
 */
export function listSales({ period, status } = {}) {
  return request((db) => {
    let sales = period ? filterByPeriod(db.sales, period) : db.sales;
    if (status) sales = sales.filter((sale) => sale.status === status);
    return sales;
  });
}

/**
 * GET /sales/:id
 * @param {string} id
 * @returns {Promise<Sale>}
 */
export function getSale(id) {
  return request((db) => findOrFail(db.sales, id));
}

/** Monta os itens copiando nome, preço e custo do produto (regra 1.1). */
function buildItems(db, inputs) {
  return inputs.map((input) => {
    if (!input.productId) {
      const unitPriceCents = Math.round(input.unitPriceCents ?? 0);
      if (!(unitPriceCents > 0)) throw new ApiError('valor_invalido');
      return {
        id: createId('item'),
        productId: null,
        name: input.description?.trim() || 'Valor avulso',
        emoji: null,
        unit: 'un',
        quantity: 1,
        unitPriceCents,
        unitCostCents: null,
        totalCents: unitPriceCents,
      };
    }
    const product = findOrFail(db.products, input.productId);
    if (!product.active) throw new ApiError('produto_inativo');
    if (!(input.quantity > 0)) throw new ApiError('quantidade_invalida');
    return {
      id: createId('item'),
      productId: product.id,
      name: product.name,
      emoji: product.emoji,
      unit: product.unit,
      quantity: input.quantity,
      unitPriceCents: product.priceCents,
      unitCostCents: product.costCents,
      totalCents: lineTotal({ unitPriceCents: product.priceCents, quantity: input.quantity }),
    };
  });
}

/** Aplica movimentos de estoque aos produtos com controle e devolve o que mudou. */
function moveStock(db, items, type, saleId, createdAt) {
  const products = [];
  const movements = [];
  for (const item of items) {
    const product = item.productId && db.products.find((p) => p.id === item.productId);
    if (!product?.trackStock) continue;
    const result = applyMovement(product, {
      id: createId('mov'),
      type,
      quantity: item.quantity,
      saleId,
      createdAt,
    });
    db.products = db.products.map((p) => (p.id === product.id ? result.product : p));
    products.push(result.product);
    movements.push(result.movement);
  }
  db.stockMovements = [...db.stockMovements, ...movements];
  return { products, movements };
}

/**
 * POST /sales — conclui uma venda (regra 1.6): baixa o estoque, registra os pagamentos,
 * cria as contas de fiado e abre o caixa do dia, se ainda não estiver aberto (regra 6.1).
 * Falta de estoque só impede a venda com "Bloquear venda sem estoque" ligado (regra 1.9).
 * @param {CreateSaleInput} input
 * @returns {Promise<{ sale: Sale, products: Product[], movements: StockMovement[], fiadoAccounts: FiadoAccount[], cashDay: CashDay|null }>}
 */
export function createSale(input) {
  return request((db) => {
    const items = buildItems(db, input.items ?? []);
    const discount = input.discount ?? null;
    const totals = calcSaleTotals(items, discount);
    const payments = input.payments ?? [];
    const customerId = input.customerId ?? null;

    assertValid([
      ...validateSale({ items, ...totals, payments, customerId, allowZeroTotal: input.allowZeroTotal }),
      ...validatePayments(totals.totalCents, payments, db.settings),
    ]);
    if (customerId && findOrFail(db.customers, customerId).archived) throw new ApiError('cliente_arquivado');
    const shortages = findStockShortages(items, db.products);
    if (shortages.length > 0 && db.settings.blockSaleWithoutStock) {
      throw new ApiError('sem_estoque', { details: shortages });
    }

    const createdAt = nowISO();
    const finalized = finalizePayments(
      payments.map((payment) =>
        payment.method === 'fiado'
          ? {
              ...payment,
              dueDate: payment.dueDate ?? dueDateIn(db.settings.fiadoDefaultDays, dateOf(createdAt)),
            }
          : payment,
      ),
      db.settings.fees,
    );
    /** @type {Sale} */
    const sale = {
      id: createId('venda'),
      number: db.nextSaleNumber,
      createdAt,
      items,
      ...totals,
      discount: totals.discountCents > 0 ? discount : null,
      payments: finalized.payments,
      changeCents: finalized.changeCents,
      customerId,
      note: input.note?.trim() ?? '',
      status: 'concluida',
      cancellation: null,
    };

    const { products, movements } = moveStock(db, items, 'venda', sale.id, createdAt);
    const fiadoAccounts = sale.payments
      .filter((payment) => payment.method === 'fiado')
      .map((payment) => ({
        id: createId('fiado'),
        customerId,
        saleId: sale.id,
        originalCents: payment.amountCents,
        paidCents: 0,
        createdAt,
        dueDate: payment.dueDate,
        cancelledAt: null,
      }));

    let cashDay = null;
    const day = dateOf(createdAt);
    if (!db.cashDays.some((cash) => cash.date === day)) {
      cashDay = {
        date: day,
        openingCents: db.settings.defaultOpeningCents,
        openedAt: createdAt,
        closedAt: null,
        countedCents: null,
        expectedCents: null,
        note: '',
      };
      db.cashDays = [...db.cashDays, cashDay];
    }

    db.sales = [...db.sales, sale];
    db.fiadoAccounts = [...db.fiadoAccounts, ...fiadoAccounts];
    db.nextSaleNumber += 1;
    return { sale, products, movements, fiadoAccounts, cashDay };
  });
}

/**
 * DELETE /sales/:id — "Desfazer" nos 5 segundos seguintes (regra 1.7): reverte todos os
 * efeitos e a venda some do histórico. O prazo conta a partir do toque em "Desfazer".
 * @param {string} id
 * @returns {Promise<{ saleId: string, products: Product[], removedMovementIds: string[], removedAccountIds: string[] }>}
 */
export function undoSale(id) {
  const requestedAt = Date.now();
  return request((db) => {
    const sale = findOrFail(db.sales, id);
    const accounts = db.fiadoAccounts.filter((account) => account.saleId === id);
    if (!canUndoSale(sale, requestedAt) || accounts.some((account) => account.paidCents > 0)) {
      throw new ApiError('prazo_desfazer');
    }

    const movements = db.stockMovements.filter((movement) => movement.saleId === id);
    const products = [];
    for (const movement of movements) {
      const product = db.products.find((p) => p.id === movement.productId);
      const restored = { ...product, quantity: product.quantity - movement.delta };
      db.products = db.products.map((p) => (p.id === product.id ? restored : p));
      products.push(restored);
    }
    const removedMovementIds = movements.map((movement) => movement.id);
    const removedAccountIds = accounts.map((account) => account.id);
    db.stockMovements = db.stockMovements.filter((movement) => movement.saleId !== id);
    db.fiadoAccounts = db.fiadoAccounts.filter((account) => account.saleId !== id);
    db.sales = db.sales.filter((s) => s.id !== id);
    if (sale.number === db.nextSaleNumber - 1) db.nextSaleNumber -= 1;
    return { saleId: id, products, removedMovementIds, removedAccountIds };
  });
}

/**
 * POST /sales/:id/cancel — cancela com motivo (regra 1.8): devolve o estoque, cancela
 * as contas de fiado e transforma o que já foi pago nelas em crédito do cliente.
 * @param {string} id
 * @param {{ reason: string, note?: string }} input
 * @returns {Promise<{ sale: Sale, products: Product[], movements: StockMovement[], fiadoAccounts: FiadoAccount[], customer: Customer|null, refundCents: number }>}
 */
export function cancelSale(id, { reason, note = '' }) {
  return request((db) => {
    const current = findOrFail(db.sales, id);
    assertValid(validateCancellation(current, reason));
    const at = nowISO();
    const sale = { ...current, status: 'cancelada', cancellation: { reason, note: note.trim(), at } };
    db.sales = db.sales.map((s) => (s.id === id ? sale : s));

    const { products, movements } = moveStock(db, sale.items, 'estorno', sale.id, at);
    const { accounts, refundCents } = cancelSaleAccounts(db.fiadoAccounts, id, at);
    const fiadoAccounts = accounts.filter((account, index) => account !== db.fiadoAccounts[index]);
    db.fiadoAccounts = accounts;

    let customer = null;
    if (refundCents > 0 && sale.customerId) {
      customer = findOrFail(db.customers, sale.customerId);
      customer = { ...customer, creditCents: customer.creditCents + refundCents };
      db.customers = db.customers.map((c) => (c.id === customer.id ? customer : c));
    }
    return { sale, products, movements, fiadoAccounts, customer, refundCents };
  });
}
