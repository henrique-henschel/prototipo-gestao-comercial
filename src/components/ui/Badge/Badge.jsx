import { cx } from '@/lib/cx.js';
import styles from './Badge.module.css';

/**
 * Selo pequeno para contagens e rótulos curtos (ex.: quantidade no carrinho, "Novo").
 * Para estados com significado (fiado, estoque), use `StatusPill`.
 *
 * @param {object} props
 * @param {'neutral'|'primary'|'accent'|'success'|'warning'|'danger'|'info'} [props.tone='neutral']
 * @param {'soft'|'solid'} [props.appearance='soft']
 */
export function Badge({ tone = 'neutral', appearance = 'soft', className, children, ...rest }) {
  return (
    <span className={cx(styles.badge, styles[tone], styles[appearance], className)} {...rest}>
      {children}
    </span>
  );
}
