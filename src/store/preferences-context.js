import { createContext } from 'react';

/**
 * Preferências de exibição e acessibilidade deste aparelho.
 * Como todo o estado do protótipo, vivem só em memória.
 *
 * @typedef {'system'|'light'|'dark'|'contrast'} ThemePreference
 *
 * @typedef {object} Preferences
 * @property {ThemePreference} theme
 * @property {number} fontScale 1 a 1.5
 * @property {boolean} vibration vibrar ao concluir ações (celular)
 * @property {boolean} speech mostrar botões "Ouvir"
 */

/** @type {Preferences} */
export const DEFAULT_PREFERENCES = {
  theme: 'system',
  fontScale: 1,
  vibration: true,
  speech: true,
};

export const FONT_SCALES = [
  { value: 1, label: 'Normal' },
  { value: 1.15, label: 'Grande' },
  { value: 1.3, label: 'Maior' },
  { value: 1.5, label: 'Enorme' },
];

/**
 * @type {import('react').Context<{
 *   preferences: Preferences,
 *   setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void,
 * } | null>}
 */
export const PreferencesContext = createContext(null);
