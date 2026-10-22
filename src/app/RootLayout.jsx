import { LoaderCircle } from 'lucide-react';
import { Outlet, ScrollRestoration } from 'react-router';
import styles from './RootLayout.module.css';

/** Raiz de todas as rotas: restaura a rolagem ao voltar e rola para o topo ao avançar. */
export function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

/** Mostrado enquanto a primeira tela (carregada sob demanda) ainda chega. */
export function AppLoading() {
  return (
    <div className={styles.loading} role="status">
      <LoaderCircle className={styles.spinner} size={40} aria-hidden="true" />
      <span>Carregando…</span>
    </div>
  );
}
