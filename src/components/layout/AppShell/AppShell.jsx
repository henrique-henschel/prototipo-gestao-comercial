import { useEffect, useRef, ViewTransition } from 'react';
import { Outlet, useLocation } from 'react-router';
import { BottomNav } from '../BottomNav/BottomNav.jsx';
import { NavigationProgress } from '../NavigationProgress/NavigationProgress.jsx';
import { Sidebar } from '../Sidebar/Sidebar.jsx';
import { SkipLink } from '../SkipLink/SkipLink.jsx';
import { TopBar } from '../TopBar/TopBar.jsx';
import styles from './AppShell.module.css';

/**
 * Esqueleto da área logada.
 * - Celular: TopBar + conteúdo + BottomNav (os avisos sobem acima dela via `--toast-offset`).
 * - Tablet e computador: Sidebar + conteúdo.
 *
 * A troca de tela anima com o `<ViewTransition>` do React (o roteador já navega dentro
 * de transições), e o foco vai para o conteúdo, para o leitor de tela anunciar a tela nova.
 */
export function AppShell() {
  const { pathname } = useLocation();
  const mainRef = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className={styles.shell}>
      <SkipLink targetId="conteudo" />
      <NavigationProgress />
      <TopBar />
      <Sidebar />
      <main id="conteudo" ref={mainRef} tabIndex={-1} className={styles.main}>
        <ViewTransition>
          <div className={styles.page}>
            <Outlet />
          </div>
        </ViewTransition>
      </main>
      <BottomNav />
    </div>
  );
}
