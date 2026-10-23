import { normalizePhone, validateCustomer, validateCustomerDeletion } from '@/domain/rules/customers.js';
import { customerFiadoSummary } from '@/domain/rules/fiado.js';
import { createId } from '@/lib/id.js';
import { assertValid, findOrFail, nowISO, request } from './api.js';

/**
 * Clientes (seção 4 de docs/regras-de-negocio.md).
 * @typedef {import('@/domain/models.js').Customer} Customer
 * @typedef {Pick<Customer, 'name'> & Partial<Pick<Customer, 'phone'|'note'|'creditLimitCents'|'fiadoBlocked'>>} CustomerInput
 */

/**
 * GET /customers — inclusive arquivados, na ordem de cadastro.
 * @returns {Promise<Customer[]>}
 */
export function listCustomers() {
  return request((db) => db.customers);
}

/**
 * GET /customers/:id
 * @param {string} id
 * @returns {Promise<Customer>}
 */
export function getCustomer(id) {
  return request((db) => findOrFail(db.customers, id));
}

/**
 * POST /customers. O cadastro rápido da venda manda só nome e WhatsApp.
 * @param {CustomerInput} input
 * @returns {Promise<Customer>}
 */
export function createCustomer(input) {
  return request((db) => {
    assertValid(validateCustomer(input));
    /** @type {Customer} */
    const customer = {
      id: createId('cli'),
      name: input.name.trim(),
      phone: normalizePhone(input.phone),
      note: input.note?.trim() ?? '',
      creditLimitCents: input.creditLimitCents ?? null,
      fiadoBlocked: input.fiadoBlocked ?? false,
      creditCents: 0,
      archived: false,
      createdAt: nowISO(),
    };
    db.customers = [...db.customers, customer];
    return customer;
  });
}

/**
 * PATCH /customers/:id. O crédito do cliente só muda por recebimento ou cancelamento.
 * @param {string} id
 * @param {Partial<CustomerInput & { archived: boolean }>} changes
 * @returns {Promise<Customer>}
 */
export function updateCustomer(id, changes) {
  return request((db) => {
    const current = findOrFail(db.customers, id);
    const { creditCents: _ignored, ...allowed } = changes;
    const next = { ...current, ...allowed, id };
    assertValid(validateCustomer(next));
    next.name = next.name.trim();
    next.phone = normalizePhone(next.phone);
    db.customers = db.customers.map((customer) => (customer.id === id ? next : customer));
    return next;
  });
}

/**
 * DELETE /customers/:id — só sem saldo em aberto e sem crédito; nos outros casos,
 * use o arquivamento (regra 4).
 * @param {string} id
 * @returns {Promise<{ customerId: string }>}
 */
export function deleteCustomer(id) {
  return request((db) => {
    const customer = findOrFail(db.customers, id);
    assertValid(validateCustomerDeletion(customerFiadoSummary(customer, db.fiadoAccounts)));
    db.customers = db.customers.filter((c) => c.id !== id);
    return { customerId: id };
  });
}
