/**
 * Regras de clientes (seção 4 de docs/regras-de-negocio.md).
 * @typedef {import('../models.js').Customer} Customer
 */

/**
 * Deixa só os dígitos do WhatsApp e tira o 55 do Brasil, se vier junto.
 * @param {string|null|undefined} phone
 * @returns {string|null} DDD + número, ou nulo se vazio
 */
export function normalizePhone(phone) {
  let digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2);
  return digits || null;
}

/**
 * Um WhatsApp válido tem DDD + 8 ou 9 dígitos.
 * @param {string|null} phone já normalizado
 */
export function isValidPhone(phone) {
  return phone === null || /^\d{10,11}$/.test(phone);
}

/**
 * Valida o cadastro: nome obrigatório, WhatsApp opcional mas válido, limite não negativo.
 * @param {{ name?: string, phone?: string|null, creditLimitCents?: number|null }} input
 * @returns {('nome_obrigatorio'|'whatsapp_invalido'|'limite_invalido')[]}
 */
export function validateCustomer({ name, phone, creditLimitCents }) {
  const errors = [];
  if (!name?.trim()) errors.push('nome_obrigatorio');
  if (!isValidPhone(normalizePhone(phone))) errors.push('whatsapp_invalido');
  if (creditLimitCents != null && !(Number.isInteger(creditLimitCents) && creditLimitCents >= 0)) {
    errors.push('limite_invalido');
  }
  return errors;
}

/**
 * Cliente com saldo em aberto não pode ser excluído, só arquivado. Regra 4.
 * @param {{ openCents: number }} fiadoSummary resultado de `customerFiadoSummary`
 */
export function canDeleteCustomer(fiadoSummary) {
  return fiadoSummary.openCents === 0;
}
