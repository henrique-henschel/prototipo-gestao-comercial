import { useCallback, useSyncExternalStore } from 'react';

/**
 * A media query vale agora? Atualiza quando a janela muda de tamanho.
 * Use só quando a estrutura da tela muda (renderizar um painel ou outro);
 * para estilo, prefira CSS (container ou media queries).
 * Sem `matchMedia` (testes no jsdom), devolve `false`: vale o layout do celular.
 * @param {string} query ex.: "(width >= 64rem)"
 */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  const getSnapshot = () => (typeof window !== 'undefined' && window.matchMedia?.(query).matches) || false;
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
