import { DEMO_USER } from '@/mocks/seed.js';
import { createId } from '@/lib/id.js';
import { ApiError, request } from './api.js';

/**
 * Autenticação simulada: qualquer e-mail e senha entram. O token é fictício.
 * @typedef {import('@/domain/models.js').User} User
 * @typedef {{ user: User, token: string, onboarded: boolean }} Session
 */

/** Nome a partir do e-mail ("maria.silva@..." → "Maria Silva"). */
function nameFromEmail(email) {
  const local = email
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .trim();
  return local.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase()) || 'Vendedor';
}

/**
 * POST /auth/login
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<Session>}
 */
export function login({ email, password }) {
  return request((db) => {
    const cleanEmail = email?.trim().toLowerCase();
    if (!cleanEmail || !password) throw new ApiError('login_incompleto');
    if (cleanEmail !== db.user.email) {
      db.user = { id: createId('user'), name: nameFromEmail(cleanEmail), email: cleanEmail };
    }
    return { user: db.user, token: `demo-${db.user.id}`, onboarded: db.business.onboarded };
  });
}

/**
 * POST /auth/demo: entra com a conta de demonstração (dados de exemplo).
 * @returns {Promise<Session>}
 */
export function loginDemo() {
  return request((db) => {
    db.user = { ...DEMO_USER };
    db.business.onboarded = true;
    return { user: db.user, token: `demo-${db.user.id}`, onboarded: true };
  });
}

/**
 * POST /auth/signup: cria a conta. O negócio é configurado depois, nas boas-vindas.
 * @param {{ name: string, email: string, password: string }} input
 * @returns {Promise<Session>}
 */
export function signup({ name, email, password }) {
  return request((db) => {
    const cleanEmail = email?.trim().toLowerCase();
    if (!cleanEmail || !password) throw new ApiError('login_incompleto');
    if (!name?.trim()) throw new ApiError('nome_obrigatorio');
    db.user = { id: createId('user'), name: name.trim(), email: cleanEmail };
    // Conta nova: o negócio é descrito nas boas-vindas, então começa sem nome nem categorias.
    db.business = { ...db.business, name: '', sells: [], ownerName: db.user.name, onboarded: false };
    return { user: db.user, token: `demo-${db.user.id}`, onboarded: false };
  });
}

/**
 * POST /auth/logout
 * @returns {Promise<void>}
 */
export function logout() {
  return request(() => undefined);
}
