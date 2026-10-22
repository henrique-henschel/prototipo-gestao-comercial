import { mergeSettings, validateSettings } from '@/domain/rules/settings.js';
import { resetDemo } from '@/mocks/db.js';
import { ApiError, assertValid, request } from './api.js';

/**
 * Negócio e ajustes que alteram regras.
 * @typedef {import('@/domain/models.js').Business} Business
 * @typedef {import('@/domain/models.js').Settings} Settings
 */

/**
 * GET /business
 * @returns {Promise<Business>}
 */
export function getBusiness() {
  return request((db) => db.business);
}

/**
 * PATCH /business
 * @param {Partial<Omit<Business, 'id'|'createdAt'>>} changes
 * @returns {Promise<Business>}
 */
export function updateBusiness(changes) {
  return request((db) => {
    if (changes.name !== undefined && !changes.name.trim()) throw new ApiError('nome_obrigatorio');
    db.business = { ...db.business, ...changes };
    return db.business;
  });
}

/**
 * GET /settings
 * @returns {Promise<Settings>}
 */
export function getSettings() {
  return request((db) => db.settings);
}

/**
 * PATCH /settings. `paymentMethods` e `fees` podem vir parciais.
 * @param {Partial<Settings>} changes
 * @returns {Promise<Settings>}
 */
export function updateSettings(changes) {
  return request((db) => {
    const next = mergeSettings(db.settings, changes);
    assertValid(validateSettings(next));
    db.settings = next;
    return db.settings;
  });
}

/**
 * POST /onboarding: conclui as boas-vindas.
 * Com `keepSampleData: false`, o negócio começa vazio (sem os dados de exemplo).
 * @param {{ businessName: string, sells: string[], paymentMethods: Settings['paymentMethods'], keepSampleData: boolean }} input
 * @returns {Promise<Business>}
 */
export function completeOnboarding({ businessName, sells, paymentMethods, keepSampleData }) {
  return request((db) => {
    if (!businessName?.trim()) throw new ApiError('nome_obrigatorio');
    const settings = mergeSettings(db.settings, { paymentMethods });
    assertValid(validateSettings(settings));
    if (!keepSampleData) resetDemo({ empty: true, user: db.user });
    db.business = {
      ...db.business,
      name: businessName.trim(),
      sells,
      onboarded: true,
      ownerName: db.user.name,
    };
    db.settings = mergeSettings(db.settings, { paymentMethods });
    return db.business;
  });
}

/**
 * POST /demo/reset: volta aos dados de exemplo, mantendo quem está logado.
 * @returns {Promise<void>}
 */
export function resetDemoData() {
  return request((db) => {
    resetDemo({ user: db.user });
  });
}
