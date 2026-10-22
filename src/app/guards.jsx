import { Navigate, Outlet, useLocation } from 'react-router';
import { useSession } from '@/hooks/useSession.js';
import { CartProvider } from '@/store/CartProvider.jsx';
import { DataProvider } from '@/store/DataProvider.jsx';
import { RETURN_PARAM, ROUTES, safeReturnPath } from './routes.js';

/**
 * Área logada: sem sessão, manda para "Entrar" lembrando a tela pedida (`?voltar=`).
 * É aqui que os dados do negócio são carregados (e o carrinho da venda vive); sair descarta tudo.
 */
export function RequireAuth() {
  const { isAuthenticated } = useSession();
  const location = useLocation();

  if (!isAuthenticated) {
    const target = `${location.pathname}${location.search}`;
    const query = target === '/' ? '' : `?${RETURN_PARAM}=${encodeURIComponent(target)}`;
    return <Navigate to={`${ROUTES.login}${query}`} replace />;
  }

  return (
    <DataProvider>
      <CartProvider>
        <Outlet />
      </CartProvider>
    </DataProvider>
  );
}

/** Telas do app só depois das boas-vindas. */
export function RequireOnboarded() {
  const { session } = useSession();
  if (!session?.onboarded) return <Navigate to={ROUTES.onboarding} replace />;
  return <Outlet />;
}

/**
 * Entrar e criar conta: quem já entrou segue para as boas-vindas ou para a tela
 * que tinha pedido antes do login.
 */
export function PublicOnly() {
  const { session } = useSession();
  const location = useLocation();

  if (session) {
    const params = new URLSearchParams(location.search);
    const target = session.onboarded ? safeReturnPath(params.get(RETURN_PARAM)) : ROUTES.onboarding;
    return <Navigate to={target} replace />;
  }
  return <Outlet />;
}

/** "/" abre o início (e, sem sessão, a tela de entrar). */
export function RedirectHome() {
  return <Navigate to={ROUTES.home} replace />;
}
