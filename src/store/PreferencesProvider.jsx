import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { DEFAULT_PREFERENCES, PreferencesContext } from './preferences-context.js';

/**
 * Aplica tema e tamanho do texto no `<html>`:
 * - `data-theme` força claro/escuro/alto contraste (ausente = segue o sistema);
 * - `--font-scale` multiplica o tamanho base, e tudo em rem cresce junto.
 */
export function PreferencesProvider({ children, initial }) {
  const [preferences, setPreferences] = useState({ ...DEFAULT_PREFERENCES, ...initial });

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (preferences.theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = preferences.theme;
    root.style.setProperty('--font-scale', String(preferences.fontScale));
  }, [preferences.theme, preferences.fontScale]);

  const setPreference = useCallback((key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  }, []);

  const value = useMemo(() => ({ preferences, setPreference }), [preferences, setPreference]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
