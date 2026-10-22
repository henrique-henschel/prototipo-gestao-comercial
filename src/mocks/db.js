import { createEmptyData, createSeed } from './seed.js';

/**
 * Banco em memória do protótipo. Só os serviços (`src/services/`) podem importá-lo:
 * componentes nunca leem daqui. Recarregar a página volta aos dados de exemplo.
 *
 * @typedef {ReturnType<typeof createSeed>} Database
 */

/** @type {Database} */
export const db = createSeed();

/**
 * Restaura os dados de exemplo (ou começa um negócio vazio), mantendo a mesma referência de `db`.
 * @param {{ empty?: boolean, now?: Date, user?: import('@/domain/models.js').User }} [options]
 */
export function resetDemo({ empty = false, now = new Date(), user } = {}) {
  const fresh = empty ? createEmptyData({ now, user }) : createSeed({ now });
  if (user && !empty) fresh.user = { ...user };
  for (const key of Object.keys(db)) delete db[key];
  Object.assign(db, fresh);
}
