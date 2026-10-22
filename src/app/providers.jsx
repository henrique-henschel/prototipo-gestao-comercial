import { PreferencesProvider } from '@/store/PreferencesProvider.jsx';
import { SessionProvider } from '@/store/SessionProvider.jsx';
import { ToastProvider } from '@/store/ToastProvider.jsx';

/**
 * Providers globais, de fora para dentro: preferências de exibição (tema e letra),
 * avisos e sessão. Os dados do negócio (`DataProvider`) ficam só na área logada
 * (ver `RequireAuth` em `guards.jsx`).
 *
 * @param {{ children: import('react').ReactNode, initialSession?: import('@/store/session-context.js').Session|null }} props
 */
export function AppProviders({ children, initialSession = null }) {
  return (
    <PreferencesProvider>
      <ToastProvider>
        <SessionProvider initialSession={initialSession}>{children}</SessionProvider>
      </ToastProvider>
    </PreferencesProvider>
  );
}
