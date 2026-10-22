import { useContext } from 'react';
import { PreferencesContext } from '@/store/preferences-context.js';

/**
 * Lê e altera as preferências de exibição (tema, tamanho do texto...).
 * @example
 * const { preferences, setPreference } = usePreferences();
 * setPreference('theme', 'dark');
 */
export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences precisa estar dentro de <PreferencesProvider>.');
  return context;
}
