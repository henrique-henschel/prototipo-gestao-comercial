import { CASH_BILLS } from '../constants.js';
import { percentOf, sumCents } from './money.js';

/**
 * Regras de pagamento (seção 2 de docs/regras-de-negocio.md).
 * @typedef {import('../models.js').Cents} Cents
 * @typedef {import('../models.js').Payment} Payment
 * @typedef {import('../models.js').Settings} Settings
 */

/**
 * Troco de uma parcela em dinheiro. Nunca negativo: se o valor recebido não cobre
 * a parcela, `missingCents` diz quanto falta. Regra 2.1.
 * @param {Cents} receivedCents
 * @param {Cents} dueCents
 * @returns {{ changeCents: Cents, missingCents: Cents }}
 */
export function calcChange(receivedCents, dueCents) {
  const difference = (receivedCents || 0) - dueCents;
  return { changeCents: Math.max(difference, 0), missingCents: Math.max(-difference, 0) };
}

/**
 * Atalhos de valor recebido em dinheiro: o valor certo e as cédulas e somas
 * "redondas" que cobrem a parcela, em ordem crescente e sem repetição. Regra 2.1.
 * @param {Cents} dueCents
 * @param {number} [limit=4]
 * @returns {Cents[]}
 */
export function suggestCashAmounts(dueCents, limit = 4) {
  if (!(dueCents > 0)) return [];
  const roundUps = CASH_BILLS.map((bill) => Math.ceil(dueCents / bill) * bill);
  const options = [...new Set([dueCents, ...roundUps])].filter((value) => value >= dueCents);
  return options.sort((a, b) => a - b).slice(0, limit);
}

/**
 * Situação de um pagamento dividido: quanto já foi coberto e quanto falta. Regra 2.5.
 * @param {Cents} totalCents
 * @param {Pick<Payment, 'amountCents'>[]} payments
 */
export function paymentProgress(totalCents, payments) {
  const paidCents = sumCents(payments.map((payment) => payment.amountCents));
  return {
    paidCents,
    remainingCents: Math.max(totalCents - paidCents, 0),
    exceedingCents: Math.max(paidCents - totalCents, 0),
    isComplete: paidCents === totalCents,
  };
}

/**
 * Valida as parcelas de uma venda. Regras 2.1 e 2.5.
 * - `sem_pagamento`: nenhuma parcela;
 * - `forma_inativa`: forma desativada em Ajustes;
 * - `valor_invalido`: parcela com valor ≤ 0;
 * - `soma_diferente`: a soma não é exatamente o total;
 * - `dinheiro_insuficiente`: recebido menor que a parcela em dinheiro;
 * - `troco_fora_do_dinheiro`: valor recebido informado em outra forma.
 * @param {Cents} totalCents
 * @param {Pick<Payment, 'method'|'amountCents'|'receivedCents'>[]} payments
 * @param {Pick<Settings, 'paymentMethods'>} [settings]
 */
export function validatePayments(totalCents, payments, settings) {
  const errors = new Set();
  if (totalCents > 0 && payments.length === 0) errors.add('sem_pagamento');
  for (const payment of payments) {
    if (settings && !settings.paymentMethods[payment.method]) errors.add('forma_inativa');
    if (!(payment.amountCents > 0)) errors.add('valor_invalido');
    if (payment.receivedCents !== undefined) {
      if (payment.method !== 'dinheiro') errors.add('troco_fora_do_dinheiro');
      else if (payment.receivedCents < payment.amountCents) errors.add('dinheiro_insuficiente');
    }
  }
  if (payments.length > 0 && !paymentProgress(totalCents, payments).isComplete) {
    errors.add('soma_diferente');
  }
  return [...errors];
}

/**
 * Percentual de taxa da maquininha para uma parcela. Regra 2.3.
 * @param {Pick<Payment, 'method'|'installments'>} payment
 * @param {Settings['fees']} fees
 * @returns {number} percentual (1.99 = 1,99%)
 */
export function feeRate(payment, fees) {
  if (payment.method === 'debito') return fees.debito;
  if (payment.method === 'credito') {
    return (payment.installments ?? 1) > 1 ? fees.creditoParcelado : fees.creditoAVista;
  }
  return 0;
}

/**
 * Taxa da maquininha em centavos. É custo do vendedor: não altera o valor cobrado. Regra 2.3.
 * @param {Pick<Payment, 'method'|'installments'|'amountCents'>} payment
 * @param {Settings['fees']} fees
 * @returns {Cents}
 */
export function calcFee(payment, fees) {
  return percentOf(payment.amountCents, feeRate(payment, fees));
}

/**
 * Completa as parcelas informadas pelo vendedor com troco e taxa, no formato gravado na venda.
 * @param {Omit<Payment, 'feeCents'|'changeCents'>[]} payments
 * @param {Settings['fees']} fees
 * @returns {{ payments: Payment[], changeCents: Cents }}
 */
export function finalizePayments(payments, fees) {
  let changeCents = 0;
  const finalized = payments.map((payment) => {
    const result = { ...payment, feeCents: calcFee(payment, fees) };
    if (payment.method === 'dinheiro' && payment.receivedCents !== undefined) {
      result.changeCents = calcChange(payment.receivedCents, payment.amountCents).changeCents;
      changeCents += result.changeCents;
    }
    return result;
  });
  return { payments: finalized, changeCents };
}

/**
 * Soma das parcelas de uma forma de pagamento.
 * @param {Pick<Payment, 'method'|'amountCents'>[]} payments
 * @param {import('../models.js').PaymentMethod} method
 * @returns {Cents}
 */
export function amountByMethod(payments, method) {
  return sumCents(payments.filter((payment) => payment.method === method).map((p) => p.amountCents));
}
