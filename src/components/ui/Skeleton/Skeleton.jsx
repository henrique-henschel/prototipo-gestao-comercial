import { cx } from '@/lib/cx.js';
import styles from './Skeleton.module.css';

/**
 * Bloco de carregamento no formato do conteúdo real (evita "pulos" na tela).
 * Puramente visual: quem envolve deve marcar a região com `aria-busy="true"`.
 *
 * @param {object} props
 * @param {'text'|'rect'|'circle'} [props.shape='text']
 * @param {string} [props.width] ex.: "60%", "8rem"
 * @param {string} [props.height]
 * @param {number} [props.lines=1] para `text`, repete linhas (a última mais curta)
 */
export function Skeleton({ shape = 'text', width, height, lines = 1, className }) {
  if (shape === 'text' && lines > 1) {
    return (
      <div className={cx(styles.lines, className)} aria-hidden="true">
        {Array.from({ length: lines }, (_, index) => (
          <span
            key={index}
            className={cx(styles.skeleton, styles.text)}
            style={{ inlineSize: index === lines - 1 ? '60%' : width }}
          />
        ))}
      </div>
    );
  }

  return (
    <span
      className={cx(styles.skeleton, styles[shape], className)}
      style={{ inlineSize: width, blockSize: height }}
      aria-hidden="true"
    />
  );
}
