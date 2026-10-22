/**
 * Ajustes (tabela 9 de docs/regras-de-negocio.md).
 * @typedef {import('../models.js').Settings} Settings
 */

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

/**
 * Pelo menos uma forma de pagamento precisa ficar ativa. Regra 2.
 * @param {Settings} settings
 * @returns {('forma_inativa')[]}
 */
export function validateSettings(settings) {
  return Object.values(settings.paymentMethods).some(Boolean) ? [] : ['forma_inativa'];
}
