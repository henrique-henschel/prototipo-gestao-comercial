import { useCallback, useMemo, useState } from 'react';
import * as authService from '@/services/auth.service.js';
import { SessionContext } from './session-context.js';

/**
 * Guarda a sessão simulada e expõe entrar, criar conta e sair.
 * @param {{ children: import('react').ReactNode, initialSession?: import('./session-context.js').Session|null }} props
 *   `initialSession` serve aos testes, que começam já logados.
 */
export function SessionProvider({ children, initialSession = null }) {
  const [session, setSession] = useState(initialSession);

  const login = useCallback(async (credentials) => {
    const next = await authService.login(credentials);
    setSession(next);
    return next;
  }, []);

  const loginDemo = useCallback(async () => {
    const next = await authService.loginDemo();
    setSession(next);
    return next;
  }, []);

  const signup = useCallback(async (input) => {
    const next = await authService.signup(input);
    setSession(next);
    return next;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      // Sair sempre funciona, mesmo sem conexão: a sessão é deste aparelho.
      setSession(null);
    }
  }, []);

  const markOnboarded = useCallback(() => {
    setSession((current) => current && { ...current, onboarded: true });
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: session !== null,
      login,
      loginDemo,
      signup,
      logout,
      markOnboarded,
    }),
    [session, login, loginDemo, signup, logout, markOnboarded],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
