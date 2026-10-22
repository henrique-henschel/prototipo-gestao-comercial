import { createElement } from 'react';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppProviders } from '@/app/providers.jsx';
import { routes } from '@/app/router.js';

/**
 * Monta o app inteiro (providers + rotas reais) num roteador em memória.
 * @param {string} [path='/'] rota inicial
 * @param {{ session?: import('@/store/session-context.js').Session|null }} [options] já logado
 */
export function renderApp(path = '/', { session = null } = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const view = render(
    createElement(AppProviders, { initialSession: session }, createElement(RouterProvider, { router })),
  );
  return { ...view, router };
}

/** Sessão da conta de demonstração, para testes que começam logados. */
export const DEMO_SESSION = {
  user: { id: 'user_demo', name: 'Rosa Oliveira', email: 'rosa@exemplo.com.br' },
  token: 'demo-user_demo',
  onboarded: true,
};
