import { useNavigation } from 'react-router';
import styles from './NavigationProgress.module.css';
import { cx } from '@/lib/cx.js';

/**
 * Faixa fina no topo enquanto a próxima tela carrega (rotas carregadas sob demanda).
 * O texto "Carregando…" é anunciado a leitores de tela.
 */
export function NavigationProgress() {
  const navigation = useNavigation();
  const busy = navigation.state !== 'idle';

  return (
    <>
      <div className={cx(styles.bar, 'no-print')} data-active={busy} aria-hidden="true" />
      <span role="status" className="visually-hidden">
        {busy ? 'Carregando…' : ''}
      </span>
    </>
  );
}
