import { useCallback } from 'react';
import { usePreferences } from './usePreferences.js';

/** Padrões de vibração: toque curto (adicionou) e "deu certo" (concluiu). */
export const VIBRATION = { tap: 15, success: [30, 60, 30] };

/**
 * Vibra o celular, se a pessoa não desligou a vibração nas preferências.
 * @returns {(pattern?: number | number[]) => void}
 */
export function useVibrate() {
  const { preferences } = usePreferences();
  const enabled = preferences.vibration;
  return useCallback(
    (pattern = VIBRATION.tap) => {
      if (enabled) navigator.vibrate?.(pattern);
    },
    [enabled],
  );
}
