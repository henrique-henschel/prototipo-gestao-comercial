import DesignSystemPage from '@/features/design-system/DesignSystemPage.jsx';
import { PreferencesProvider } from '@/store/PreferencesProvider.jsx';
import { ToastProvider } from '@/store/ToastProvider.jsx';

/**
 * Raiz provisória da Fase 2: exibe o catálogo do design system.
 * Na Fase 4 o roteador assume, e esta página passa a ser a rota /design-system.
 */
export default function App() {
  return (
    <PreferencesProvider>
      <ToastProvider>
        <DesignSystemPage />
      </ToastProvider>
    </PreferencesProvider>
  );
}
