import { createContext } from 'react';

/**
 * Sessão simulada: quem entrou e se já passou pelas boas-vindas.
 * Como todo o estado do protótipo, vive só em memória (recarregar a página sai da conta).
 *
 * @typedef {import('@/services/auth.service.js').Session} Session
 *
 * @typedef {object} SessionApi
 * @property {Session|null} session
 * @property {import('@/domain/models.js').User|null} user
 * @property {boolean} isAuthenticated
 * @property {(credentials: { email: string, password: string }) => Promise<Session>} login
 * @property {() => Promise<Session>} loginDemo
 * @property {(input: { name: string, email: string, password: string }) => Promise<Session>} signup
 * @property {() => Promise<void>} logout
 * @property {() => void} markOnboarded chamado ao concluir as boas-vindas
 */

/** @type {import('react').Context<SessionApi | null>} */
export const SessionContext = createContext(null);
