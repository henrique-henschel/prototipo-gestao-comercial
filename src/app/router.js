import { createBrowserRouter } from 'react-router';
import { AppShell } from '@/components/layout';
import NotFoundPage from '@/features/errors/pages/NotFoundPage.jsx';
import RouteErrorPage from '@/features/errors/pages/RouteErrorPage.jsx';
import { PublicOnly, RedirectHome, RequireAuth, RequireOnboarded } from './guards.jsx';
import { AppLoading, RootLayout } from './RootLayout.jsx';

/**
 * Carrega a tela sob demanda: cada área vira um arquivo JavaScript separado,
 * baixado só quando a pessoa abre a tela pela primeira vez.
 * @param {() => Promise<{ default: import('react').ComponentType }>} load
 */
function page(load) {
  return async () => ({ Component: (await load()).default });
}

/**
 * Árvore de rotas (caminhos em `routes.js`). Os nomes de parâmetro (`:saleId`...)
 * são lidos pelas telas com `useParams`.
 * @type {import('react-router').RouteObject[]}
 */
export const routes = [
  {
    Component: RootLayout,
    ErrorBoundary: RouteErrorPage,
    HydrateFallback: AppLoading,
    children: [
      { index: true, Component: RedirectHome },
      {
        Component: PublicOnly,
        children: [
          { path: 'entrar', lazy: page(() => import('@/features/auth/pages/LoginPage.jsx')) },
          { path: 'cadastro', lazy: page(() => import('@/features/auth/pages/SignupPage.jsx')) },
        ],
      },
      { path: 'design-system', lazy: page(() => import('@/features/design-system/DesignSystemPage.jsx')) },
      {
        Component: RequireAuth,
        children: [
          { path: 'boas-vindas', lazy: page(() => import('@/features/auth/pages/OnboardingPage.jsx')) },
          {
            Component: RequireOnboarded,
            children: [
              {
                Component: AppShell,
                children: [
                  { path: 'inicio', lazy: page(() => import('@/features/dashboard/pages/HomePage.jsx')) },
                  { path: 'vender', lazy: page(() => import('@/features/sales/pages/SellPage.jsx')) },
                  { path: 'vendas', lazy: page(() => import('@/features/sales/pages/SalesPage.jsx')) },
                  {
                    path: 'vendas/:saleId',
                    lazy: page(() => import('@/features/sales/pages/SaleDetailPage.jsx')),
                  },
                  { path: 'fiado', lazy: page(() => import('@/features/fiado/pages/FiadoPage.jsx')) },
                  {
                    path: 'fiado/:customerId',
                    lazy: page(() => import('@/features/fiado/pages/CustomerAccountPage.jsx')),
                  },
                  {
                    path: 'clientes',
                    lazy: page(() => import('@/features/customers/pages/CustomersPage.jsx')),
                  },
                  {
                    path: 'estoque',
                    lazy: page(() => import('@/features/inventory/pages/ProductsPage.jsx')),
                  },
                  {
                    path: 'estoque/novo',
                    lazy: page(() => import('@/features/inventory/pages/ProductFormPage.jsx')),
                  },
                  {
                    path: 'estoque/:productId',
                    lazy: page(() => import('@/features/inventory/pages/ProductFormPage.jsx')),
                  },
                  { path: 'caixa', lazy: page(() => import('@/features/cash/pages/CashPage.jsx')) },
                  {
                    path: 'relatorios',
                    lazy: page(() => import('@/features/reports/pages/ReportsPage.jsx')),
                  },
                  { path: 'ajustes', lazy: page(() => import('@/features/settings/pages/SettingsPage.jsx')) },
                  { path: 'ajuda', lazy: page(() => import('@/features/help/pages/HelpPage.jsx')) },
                  { path: 'mais', lazy: page(() => import('@/features/more/pages/MorePage.jsx')) },
                ],
              },
            ],
          },
        ],
      },
      // Fica no pacote principal: a tela de erro também a usa.
      { path: '*', Component: NotFoundPage },
    ],
  },
];

/** Roteador do navegador (no app). Os testes usam `createMemoryRouter(routes)`. */
export function createAppRouter() {
  return createBrowserRouter(routes);
}
