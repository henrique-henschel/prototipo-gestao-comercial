import styles from './SkipLink.module.css';
import { cx } from '@/lib/cx.js';

/**
 * "Pular para o conteúdo": primeiro item do teclado, aparece só ao receber foco.
 * @param {{ targetId?: string }} props id do `<main>`
 */
export function SkipLink({ targetId = 'conteudo' }) {
  return (
    <a href={`#${targetId}`} className={cx(styles.skipLink, 'no-print')}>
      Pular para o conteúdo
    </a>
  );
}
