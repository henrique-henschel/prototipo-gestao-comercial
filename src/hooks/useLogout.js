import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ROUTES } from '@/app/routes.js';
import { useSession } from './useSession.js';
import { useToast } from './useToast.js';

/**
 * Sai da conta e volta para a tela de entrar, com um aviso.
 * @returns {() => Promise<void>}
 */
export function useLogout() {
  const { logout } = useSession();
  const navigate = useNavigate();
  const toast = useToast();

  return useCallback(async () => {
    await logout();
    navigate(ROUTES.login, { replace: true });
    toast.show({ message: 'Você saiu da conta', tone: 'info' });
  }, [logout, navigate, toast]);
}
