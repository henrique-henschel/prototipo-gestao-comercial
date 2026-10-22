import { useContext } from 'react';
import { SessionContext } from '@/store/session-context.js';

/**
 * Sessão simulada: usuário, entrar, criar conta e sair.
 * @example
 * const { user, loginDemo, logout } = useSession();
 * @returns {import('@/store/session-context.js').SessionApi}
 */
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession precisa estar dentro de <SessionProvider>.');
  return context;
}
