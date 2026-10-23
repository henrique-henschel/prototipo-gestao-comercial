import { MAX_PERCENT } from './money.js';
import { isValidPhone, normalizePhone } from './customers.js';

/**
 * Ajustes (tabela 9 de docs/regras-de-negocio.md).
 * @typedef {import('../models.js').Settings} Settings
 */

/** Vencimento padrão do fiado: de 1 dia a 1 ano. */
export const FIADO_DAYS_RANGE = { min: 1, max: 365 };

/**
 * Aplica uma alteração parcial aos ajustes: `paymentMethods` e `fees` podem vir pela metade.
 * @param {Settings} settings
 * @param {Partial<Settings>} changes
 * @returns {Settings}
 */
export function mergeSettings(settings, changes) {
  return {
    ...settings,
    ...changes,
    paymentMethods: { ...settings.paymentMethods, ...changes.paymentMethods },
    fees: { ...settings.fees, ...changes.fees },
  };
}

const isValidFee = (fee) => Number.isFinite(fee) && fee >= 0 && fee <= MAX_PERCENT;

/**
 * Valida os ajustes. Regra 9:
 * - pelo menos uma forma de pagamento ativa (`forma_inativa`);
 * - taxas da maquininha de 0% a 99,99% (`taxa_invalida`);
 * - vencimento padrão do fiado em dias inteiros, de 1 a 365 (`prazo_invalido`);
 * - troco inicial padrão em centavos inteiros, sem valor negativo (`troco_invalido`).
 * @param {Settings} settings
 * @returns {('forma_inativa'|'taxa_invalida'|'prazo_invalido'|'troco_invalido')[]}
 */
export function validateSettings(settings) {
  const errors = [];
  if (!Object.values(settings.paymentMethods).some(Boolean)) errors.push('forma_inativa');
  if (!Object.values(settings.fees).every(isValidFee)) errors.push('taxa_invalida');
  const days = settings.fiadoDefaultDays;
  if (!(Number.isInteger(days) && days >= FIADO_DAYS_RANGE.min && days <= FIADO_DAYS_RANGE.max)) {
    errors.push('prazo_invalido');
  }
  if (!(Number.isInteger(settings.defaultOpeningCents) && settings.defaultOpeningCents >= 0)) {
    errors.push('troco_invalido');
  }
  return errors;
}

/**
 * Valida os dados do negócio: nome obrigatório e WhatsApp opcional, mas com DDD. Regra 9.
 * @param {{ name?: string, phone?: string|null }} business só os campos que mudam
 * @returns {('nome_obrigatorio'|'whatsapp_invalido')[]}
 */
export function validateBusiness({ name, phone }) {
  const errors = [];
  if (name !== undefined && !name.trim()) errors.push('nome_obrigatorio');
  if (phone !== undefined && !isValidPhone(normalizePhone(phone))) errors.push('whatsapp_invalido');
  return errors;
}

/**
 * A forma pode ser desligada? Não, se for a última ligada. Regra 2.
 * @param {Settings} settings
 * @param {string} method
 */
export function canDisablePaymentMethod(settings, method) {
  return validateSettings(mergeSettings(settings, { paymentMethods: { [method]: false } })).length === 0;
}
