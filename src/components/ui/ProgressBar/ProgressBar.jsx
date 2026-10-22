import { cx } from '@/lib/cx.js';
import styles from './ProgressBar.module.css';

/**
 * Barra de progresso (ex.: "quanto falta pagar", uso do limite de fiado).
 * O preenchimento anima suavemente graças à propriedade registrada `--progress`.
 *
 * @param {object} props
 * @param {number} props.value
 * @param {number} [props.max=100]
 * @param {string} props.label descrição para leitores de tela
 * @param {string} [props.valueText] texto falado no lugar do número (ex.: "Faltam R$ 10,00")
 * @param {'primary'|'success'|'warning'|'danger'|'info'} [props.tone='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  valueText,
  tone = 'primary',
  size = 'md',
  className,
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      aria-valuetext={valueText}
      className={cx(styles.track, styles[tone], styles[size], className)}
      style={{ '--progress': `${ratio * 100}%` }}
    >
      <span className={styles.fill} />
    </div>
  );
}
