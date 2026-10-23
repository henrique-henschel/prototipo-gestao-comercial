import { cx } from '@/lib/cx.js';
import styles from './Skeleton.module.css';

/**
 * Bloco de carregamento no formato do conteúdo real (evita "pulos" na tela).
 * Puramente visual: agrupe os blocos de uma região num `SkeletonGroup`.
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

/**
 * Região "carregando": marca `aria-busy` e diz ao leitor de tela o que está chegando
 * (um texto escondido, porque `aria-label` não vale num `<div>` sem papel).
 *
 * @example
 * <SkeletonGroup label="Carregando as vendas" className={styles.list}>
 *   <Skeleton shape="rect" height="5rem" />
 * </SkeletonGroup>
 *
 * @param {object} props
 * @param {string} props.label ex.: "Carregando as vendas"
 * @param {import('react').ElementType} [props.as='div'] ex.: `Card` (as outras props vão para ele)
 */
export function SkeletonGroup({ label, as: Component = 'div', children, ...rest }) {
  return (
    <Component {...rest} aria-busy="true">
      <span className="visually-hidden">{label}</span>
      {children}
    </Component>
  );
}
