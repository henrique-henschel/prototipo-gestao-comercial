import { useId } from 'react';
import { CircleAlert } from 'lucide-react';
import { cx } from '@/lib/cx.js';
import styles from './Field.module.css';

/**
 * Moldura de campo: rótulo sempre visível, dica e mensagem de erro abaixo.
 * `children` é uma função que recebe as props de acessibilidade do controle.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.hint]
 * @param {string} [props.error]
 * @param {boolean} [props.optional] mostra "(opcional)" no rótulo
 * @param {string} [props.id]
 * @param {(control: { id: string, 'aria-describedby'?: string, 'aria-invalid'?: boolean }) => import('react').ReactNode} props.children
 */
export function Field({ label, hint, error, optional = false, id: idProp, className, children }) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cx(styles.field, error && styles.invalid, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {optional && <span className={styles.optional}> (opcional)</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
