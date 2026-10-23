import { addDays, dateOf, diffInDays, today as todayISO } from '@/lib/date.js';
import { FIADO_SOON_DAYS, FIADO_STATUS, FIADO_STATUS_SEVERITY } from '../constants.js';
import { sumCents } from './money.js';

/**
 * Regras de fiado (seção 3 de docs/regras-de-negocio.md).
 * Todas recebem `today` (`AAAA-MM-DD`) para que o resultado não dependa do relógio.
 * @typedef {import('../models.js').Cents} Cents
 * @typedef {import('../models.js').Customer} Customer
 * @typedef {import('../models.js').FiadoAccount} FiadoAccount
 * @typedef {import('../models.js').FiadoPayment} FiadoPayment
 * @typedef {import('../models.js').FiadoStatus} FiadoStatus
 */

/**
 * Vencimento a partir de hoje. Regra 3.2.
 * @param {number} days
 * @param {string} [today]
 */
export function dueDateIn(days, today = todayISO()) {
  return addDays(today, days);
}

/**
 * Saldo de uma conta (zero se a venda foi cancelada).
 * @param {FiadoAccount} account
 * @returns {Cents}
 */
export function accountBalance(account) {
  if (account.cancelledAt) return 0;
  return Math.max(account.originalCents - account.paidCents, 0);
}

/**
 * Contas com saldo a receber.
 * @param {FiadoAccount[]} accounts
 */
export function openAccounts(accounts) {
  return accounts.filter((account) => accountBalance(account) > 0);
}

/**
 * Status calculado de uma conta. Regra 3.4.
 * @param {FiadoAccount} account
 * @param {string} [today]
 * @returns {FiadoStatus}
 */
export function accountStatus(account, today = todayISO()) {
  if (accountBalance(account) === 0) return FIADO_STATUS.QUITADO;
  const daysLeft = diffInDays(today, account.dueDate);
  if (daysLeft < 0) return FIADO_STATUS.ATRASADO;
  if (daysLeft === 0) return FIADO_STATUS.VENCE_HOJE;
  if (daysLeft <= FIADO_SOON_DAYS) return FIADO_STATUS.VENCE_EM_BREVE;
  return FIADO_STATUS.EM_DIA;
}

/**
 * Dias de atraso de uma conta aberta (0 se não está atrasada).
 * @param {FiadoAccount} account
 * @param {string} [today]
 */
export function daysOverdue(account, today = todayISO()) {
  if (accountBalance(account) === 0) return 0;
  return Math.max(diffInDays(account.dueDate, today), 0);
}

/**
 * Pior status entre as contas abertas; sem contas abertas, `quitado`. Regra 3.6.
 * @param {FiadoAccount[]} accounts contas do cliente
 * @param {string} [today]
 * @returns {FiadoStatus}
 */
export function worstStatus(accounts, today = todayISO()) {
  let worst = FIADO_STATUS.QUITADO;
  for (const account of openAccounts(accounts)) {
    const status = accountStatus(account, today);
    if (FIADO_STATUS_SEVERITY[status] > FIADO_STATUS_SEVERITY[worst]) worst = status;
  }
  return worst;
}

/**
 * Situação de um cliente no fiado. Regras 3.5 e 3.6.
 * Saldo = soma dos saldos abertos − crédito do cliente (pode ser negativo: o cliente tem crédito).
 * @param {Pick<Customer, 'id'|'creditCents'>} customer
 * @param {FiadoAccount[]} accounts todas as contas (o filtro por cliente é feito aqui)
 * @param {string} [today]
 */
export function customerFiadoSummary(customer, accounts, today = todayISO()) {
  const own = accounts.filter((account) => account.customerId === customer.id);
  const open = openAccounts(own);
  const openCents = sumCents(open.map(accountBalance));
  const overdue = open.filter((account) => accountStatus(account, today) === FIADO_STATUS.ATRASADO);
  const nextDue = open.map((account) => account.dueDate).sort()[0] ?? null;
  return {
    openCents,
    balanceCents: openCents - (customer.creditCents || 0),
    status: worstStatus(open, today),
    openCount: open.length,
    overdueCents: sumCents(overdue.map(accountBalance)),
    maxDaysOverdue: Math.max(0, ...overdue.map((account) => daysOverdue(account, today))),
    nextDueDate: nextDue,
  };
}

/**
 * Alertas ao vender fiado para um cliente. O vendedor pode confirmar mesmo assim. Regra 3.7.
 * @param {Customer} customer
 * @param {FiadoAccount[]} accounts
 * @param {Cents} amountCents valor que vai para o fiado nesta venda
 * @param {string} [today]
 */
export function fiadoAlerts(customer, accounts, amountCents, today = todayISO()) {
  const summary = customerFiadoSummary(customer, accounts, today);
  const newBalanceCents = summary.balanceCents + amountCents;
  /** @type {('bloqueado'|'atrasado'|'limite')[]} */
  const alerts = [];
  if (customer.fiadoBlocked) alerts.push('bloqueado');
  if (summary.overdueCents > 0) alerts.push('atrasado');
  if (customer.creditLimitCents != null && newBalanceCents > customer.creditLimitCents) {
    alerts.push('limite');
  }
  return {
    alerts,
    currentBalanceCents: summary.balanceCents,
    newBalanceCents,
    limitCents: customer.creditLimitCents,
    maxDaysOverdue: summary.maxDaysOverdue,
  };
}

/**
 * Ordem FIFO de abatimento: vencimento mais antigo primeiro; no empate, a compra mais antiga.
 * @param {FiadoAccount} a
 * @param {FiadoAccount} b
 */
export function compareFifo(a, b) {
  return a.dueDate.localeCompare(b.dueDate) || a.createdAt.localeCompare(b.createdAt);
}

/**
 * Distribui um valor pelas contas abertas, das mais antigas para as mais novas. Regra 3.8.
 * O que sobra (`leftoverCents`) vira crédito do cliente, após confirmação na interface.
 * @param {FiadoAccount[]} accounts contas do cliente
 * @param {Cents} amountCents
 * @returns {{ allocations: { accountId: string, amountCents: Cents }[], leftoverCents: Cents }}
 */
export function allocatePayment(accounts, amountCents) {
  let remaining = amountCents;
  const allocations = [];
  for (const account of [...openAccounts(accounts)].sort(compareFifo)) {
    if (remaining <= 0) break;
    const value = Math.min(accountBalance(account), remaining);
    allocations.push({ accountId: account.id, amountCents: value });
    remaining -= value;
  }
  return { allocations, leftoverCents: remaining };
}

/**
 * Recebimento de fiado: o valor recebido mais o crédito que o cliente já tinha abatem as
 * contas em FIFO, e o que sobrar fica como crédito do cliente. Regras 3.5 e 3.8.
 * @param {FiadoAccount[]} accounts contas do cliente
 * @param {Pick<Customer, 'creditCents'>} customer
 * @param {Cents} amountCents dinheiro novo recebido
 */
export function receiveFiado(accounts, customer, amountCents) {
  const previousCredit = customer.creditCents || 0;
  const { allocations, leftoverCents } = allocatePayment(accounts, amountCents + previousCredit);
  return {
    allocations,
    creditCents: leftoverCents,
    creditUsedCents: Math.max(previousCredit - leftoverCents, 0),
    creditAddedCents: Math.max(leftoverCents - previousCredit, 0),
  };
}

/**
 * Aplica (ou, com `direction = -1`, reverte) abatimentos nas contas.
 * @param {FiadoAccount[]} accounts
 * @param {{ accountId: string, amountCents: Cents }[]} allocations
 * @param {1|-1} [direction=1]
 * @returns {FiadoAccount[]} novas contas (as não afetadas são as mesmas instâncias)
 */
export function applyAllocations(accounts, allocations, direction = 1) {
  const byId = new Map(allocations.map((allocation) => [allocation.accountId, allocation.amountCents]));
  return accounts.map((account) =>
    byId.has(account.id)
      ? { ...account, paidCents: account.paidCents + direction * byId.get(account.id) }
      : account,
  );
}

/**
 * Pode desfazer este recebimento? Só o último do cliente, para o FIFO e o crédito voltarem
 * exatamente ao que eram, e só no mesmo dia, para não mudar o caixa de dias anteriores. Regra 3.8.
 * @param {FiadoPayment} payment
 * @param {FiadoPayment[]} payments recebimentos (o filtro por cliente é feito aqui)
 * @param {string} [today]
 * @returns {('desfazer_recebimento'|'prazo_desfazer_recebimento')[]}
 */
export function validateUndoFiadoPayment(payment, payments, today = todayISO()) {
  const last = payments
    .filter((p) => p.customerId === payment.customerId)
    .reduce((latest, p) => (!latest || p.createdAt >= latest.createdAt ? p : latest), null);
  if (last?.id !== payment.id) return ['desfazer_recebimento'];
  if (dateOf(payment.createdAt) !== today) return ['prazo_desfazer_recebimento'];
  return [];
}

/**
 * Histórico do cliente no fiado, do mais novo para o mais antigo: cada compra fiado
 * (inclusive as de vendas canceladas) e cada recebimento.
 * @param {string} customerId
 * @param {FiadoAccount[]} accounts
 * @param {FiadoPayment[]} payments
 * @returns {({ type: 'compra', id: string, createdAt: string, account: FiadoAccount }
 *   | { type: 'recebimento', id: string, createdAt: string, payment: FiadoPayment })[]}
 */
export function customerTimeline(customerId, accounts, payments) {
  const purchases = accounts
    .filter((account) => account.customerId === customerId)
    .map((account) => ({ type: 'compra', id: account.id, createdAt: account.createdAt, account }));
  const received = payments
    .filter((payment) => payment.customerId === customerId)
    .map((payment) => ({ type: 'recebimento', id: payment.id, createdAt: payment.createdAt, payment }));
  return [...purchases, ...received].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Cancela as contas geradas por uma venda. O que já foi pago vira crédito do cliente. Regra 1.8.
 * @param {FiadoAccount[]} accounts
 * @param {string} saleId
 * @param {string} cancelledAt
 * @returns {{ accounts: FiadoAccount[], refundCents: Cents }}
 */
export function cancelSaleAccounts(accounts, saleId, cancelledAt) {
  let refundCents = 0;
  const next = accounts.map((account) => {
    if (account.saleId !== saleId || account.cancelledAt) return account;
    refundCents += account.paidCents;
    return { ...account, cancelledAt };
  });
  return { accounts: next, refundCents };
}

/**
 * Ordem de "Quem me deve": mais urgente primeiro (status, dias de atraso),
 * depois o maior saldo. Regras 3.6 e 3.10.
 * @param {{ status: FiadoStatus, maxDaysOverdue: number, balanceCents: Cents }} a
 * @param {{ status: FiadoStatus, maxDaysOverdue: number, balanceCents: Cents }} b
 */
export function compareUrgency(a, b) {
  return (
    FIADO_STATUS_SEVERITY[b.status] - FIADO_STATUS_SEVERITY[a.status] ||
    b.maxDaysOverdue - a.maxDaysOverdue ||
    b.balanceCents - a.balanceCents
  );
}

/**
 * Indicadores de inadimplência. Regra 3.10.
 * @param {Customer[]} customers
 * @param {FiadoAccount[]} accounts
 * @param {string} [today]
 * @param {number} [topLimit=5]
 */
export function fiadoIndicators(customers, accounts, today = todayISO(), topLimit = 5) {
  const debtors = customers
    .map((customer) => ({ customer, ...customerFiadoSummary(customer, accounts, today) }))
    .filter((row) => row.openCents > 0);
  const receivableCents = sumCents(debtors.map((row) => row.openCents));
  const overdueCents = sumCents(debtors.map((row) => row.overdueCents));
  return {
    receivableCents,
    overdueCents,
    defaultRate: receivableCents > 0 ? overdueCents / receivableCents : 0,
    debtorsCount: debtors.length,
    overdueCount: debtors.filter((row) => row.overdueCents > 0).length,
    topDebtors: [...debtors].sort((a, b) => b.openCents - a.openCents).slice(0, topLimit),
  };
}
