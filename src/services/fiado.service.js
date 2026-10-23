import { applyAllocations, receiveFiado, validateUndoFiadoPayment } from '@/domain/rules/fiado.js';
import { today } from '@/lib/date.js';
import { createId } from '@/lib/id.js';
import { ApiError, assertValid, findOrFail, nowISO, request } from './api.js';

/**
 * Contas de fiado e recebimentos (seção 3 de docs/regras-de-negocio.md).
 * @typedef {import('@/domain/models.js').Customer} Customer
 * @typedef {import('@/domain/models.js').FiadoAccount} FiadoAccount
 * @typedef {import('@/domain/models.js').FiadoPayment} FiadoPayment
 */

/**
 * GET /fiado/accounts?customerId= — em ordem cronológica.
 * @param {{ customerId?: string }} [filters]
 * @returns {Promise<FiadoAccount[]>}
 */
export function listFiadoAccounts({ customerId } = {}) {
  return request((db) =>
    customerId ? db.fiadoAccounts.filter((account) => account.customerId === customerId) : db.fiadoAccounts,
  );
}

/**
 * GET /fiado/payments?customerId= — em ordem cronológica.
 * @param {{ customerId?: string }} [filters]
 * @returns {Promise<FiadoPayment[]>}
 */
export function listFiadoPayments({ customerId } = {}) {
  return request((db) =>
    customerId ? db.fiadoPayments.filter((payment) => payment.customerId === customerId) : db.fiadoPayments,
  );
}

/**
 * POST /customers/:id/fiado-payments — recebe um pagamento de fiado (regra 3.8):
 * abate as contas mais antigas primeiro e guarda o excedente como crédito do cliente.
 * @param {string} customerId
 * @param {{ amountCents: number, method: Exclude<FiadoPayment['method'], 'fiado'> }} input
 * @returns {Promise<{ payment: FiadoPayment, fiadoAccounts: FiadoAccount[], customer: Customer }>}
 */
export function receiveFiadoPayment(customerId, { amountCents, method }) {
  return request((db) => {
    const customer = findOrFail(db.customers, customerId);
    if (method === 'fiado') throw new ApiError('fiado_nao_permitido');
    if (!db.settings.paymentMethods[method]) throw new ApiError('forma_inativa');
    if (!(Number.isInteger(amountCents) && amountCents > 0)) throw new ApiError('valor_invalido');

    const own = db.fiadoAccounts.filter((account) => account.customerId === customerId);
    const result = receiveFiado(own, customer, amountCents);
    /** @type {FiadoPayment} */
    const payment = {
      id: createId('receb'),
      customerId,
      amountCents,
      method,
      allocations: result.allocations,
      creditUsedCents: result.creditUsedCents,
      creditAddedCents: result.creditAddedCents,
      createdAt: nowISO(),
    };
    db.fiadoAccounts = applyAllocations(db.fiadoAccounts, result.allocations);
    const updatedCustomer = { ...customer, creditCents: result.creditCents };
    db.customers = db.customers.map((c) => (c.id === customerId ? updatedCustomer : c));
    db.fiadoPayments = [...db.fiadoPayments, payment];

    const changedIds = new Set(result.allocations.map((allocation) => allocation.accountId));
    return {
      payment,
      fiadoAccounts: db.fiadoAccounts.filter((account) => changedIds.has(account.id)),
      customer: updatedCustomer,
    };
  });
}

/**
 * DELETE /fiado/payments/:id — "Desfazer" de um recebimento: só o último do cliente
 * e só no mesmo dia (`validateUndoFiadoPayment`).
 * @param {string} paymentId
 * @returns {Promise<{ paymentId: string, fiadoAccounts: FiadoAccount[], customer: Customer }>}
 */
export function undoFiadoPayment(paymentId) {
  return request((db) => {
    const payment = findOrFail(db.fiadoPayments, paymentId);
    assertValid(validateUndoFiadoPayment(payment, db.fiadoPayments, today()));

    const customer = findOrFail(db.customers, payment.customerId);
    const restoredCustomer = {
      ...customer,
      creditCents: customer.creditCents - payment.creditAddedCents + payment.creditUsedCents,
    };
    db.fiadoAccounts = applyAllocations(db.fiadoAccounts, payment.allocations, -1);
    db.customers = db.customers.map((c) => (c.id === customer.id ? restoredCustomer : c));
    db.fiadoPayments = db.fiadoPayments.filter((p) => p.id !== paymentId);

    const changedIds = new Set(payment.allocations.map((allocation) => allocation.accountId));
    return {
      paymentId,
      fiadoAccounts: db.fiadoAccounts.filter((account) => changedIds.has(account.id)),
      customer: restoredCustomer,
    };
  });
}
