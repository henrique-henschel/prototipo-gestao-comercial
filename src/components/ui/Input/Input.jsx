import { Field } from '../Field/Field.jsx';
import { cx } from '@/lib/cx.js';
import styles from './Input.module.css';

/**
 * Campo de texto com rótulo. Aceita todas as props de `<input>`.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.hint]
 * @param {string} [props.error]
 * @param {boolean} [props.optional]
 * @param {import('react').ComponentType<any>} [props.icon] ícone à esquerda
 * @param {string} [props.suffix] texto fixo à direita (ex.: "%", "kg")
 */
export function Input({ label, hint, error, optional, icon: Icon, suffix, id, className, ...inputProps }) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} id={id} className={className}>
      {(control) => (
        <div className={styles.control}>
          {Icon && <Icon className={styles.icon} size={22} aria-hidden="true" />}
          <input className={cx(styles.input, Icon && styles.withIcon)} {...control} {...inputProps} />
          {suffix && (
            <span className={styles.suffix} aria-hidden="true">
              {suffix}
            </span>
          )}
        </div>
      )}
    </Field>
  );
}

/**
 * Lista de opções nativa (melhor no celular que listas customizadas).
 * @param {object} props
 * @param {string} props.label
 * @param {{ value: string, label: string }[]} props.options
 */
export function Select({ label, hint, error, optional, options, id, className, ...selectProps }) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} id={id} className={className}>
      {(control) => (
        <div className={cx(styles.control, styles.selectControl)}>
          <select className={cx(styles.input, styles.select)} {...control} {...selectProps}>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </Field>
  );
}

/**
 * Texto longo (observações). Cresce conforme o conteúdo (`field-sizing`).
 * @param {object} props
 * @param {string} props.label
 */
export function Textarea({ label, hint, error, optional, id, className, ...textareaProps }) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} id={id} className={className}>
      {(control) => (
        <textarea className={cx(styles.input, styles.textarea)} {...control} {...textareaProps} />
      )}
    </Field>
  );
}
