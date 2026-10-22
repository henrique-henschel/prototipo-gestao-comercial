import { useId } from 'react';
import { cx } from '@/lib/cx.js';
import styles from './Switch.module.css';

/**
 * Liga/desliga. É um checkbox nativo com `role="switch"`, então funciona
 * com teclado (espaço) e leitores de tela sem código extra.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.description]
 * @param {boolean} props.checked
 * @param {(checked: boolean) => void} props.onChange
 */
export function Switch({ label, description, checked, onChange, disabled, className }) {
  const id = useId();
  const descriptionId = description ? `${id}-desc` : undefined;

  return (
    <div className={cx(styles.row, className)}>
      <label htmlFor={id} className={styles.text}>
        <span className={styles.label}>{label}</span>
        {description && (
          <span id={descriptionId} className={styles.description}>
            {description}
          </span>
        )}
      </label>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className={styles.switch}
        checked={checked}
        disabled={disabled}
        aria-describedby={descriptionId}
        onChange={(event) => onChange(event.target.checked)}
      />
    </div>
  );
}
