import { useRef } from 'react';
import { Field } from '../Field/Field.jsx';
import { NumericKeypad } from '../NumericKeypad/NumericKeypad.jsx';
import { formatBRL, parseCentsFromDigits } from '@/domain/rules/money.js';
import { cx } from '@/lib/cx.js';
import styles from './MoneyInput.module.css';

const DEFAULT_MAX = 99_999_999; // R$ 999.999,99

/**
 * Campo de dinheiro estilo calculadora: os dígitos entram pela direita
 * (digitar 1, 2, 5, 0 mostra R$ 12,50), então ninguém precisa digitar vírgula.
 *
 * Funciona com o teclado numérico próprio (`keypad`), com o teclado físico
 * e com o teclado do celular. O valor é sempre em **centavos**.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {number} props.value centavos
 * @param {(cents: number) => void} props.onChange
 * @param {boolean} [props.keypad=false] mostra o teclado próprio e evita abrir o do celular
 * @param {'md'|'lg'|'hero'} [props.size='lg']
 * @param {number} [props.max] limite em centavos
 * @param {string} [props.hint]
 * @param {string} [props.error]
 */
export function MoneyInput({
  label,
  value,
  onChange,
  keypad = false,
  size = 'lg',
  max = DEFAULT_MAX,
  hint,
  error,
  optional,
  id,
  className,
  autoFocus,
  ...rest
}) {
  const inputRef = useRef(null);

  const moveCaretToEnd = () => {
    const input = inputRef.current;
    if (!input) return;
    requestAnimationFrame(() => {
      const end = input.value.length;
      input.setSelectionRange(end, end);
    });
  };

  const handleDigit = (digit) => onChange(parseCentsFromDigits(`${value}${digit}`, { max }));
  const handleBackspace = () => onChange(Math.floor(value / 10));
  const handleClear = () => onChange(0);

  return (
    <div className={cx(styles.wrapper, className)}>
      <Field label={label} hint={hint} error={error} optional={optional} id={id}>
        {(control) => (
          <input
            ref={inputRef}
            type="text"
            inputMode={keypad ? 'none' : 'numeric'}
            autoComplete="off"
            spellCheck={false}
            className={cx(styles.input, styles[size], value === 0 && styles.empty)}
            value={formatBRL(value)}
            onChange={(event) => onChange(parseCentsFromDigits(event.target.value, { max }))}
            onFocus={moveCaretToEnd}
            onClick={moveCaretToEnd}
            // eslint-disable-next-line jsx-a11y/no-autofocus -- usado só em telas de valor dedicadas
            autoFocus={autoFocus}
            {...control}
            {...rest}
          />
        )}
      </Field>
      {keypad && (
        <NumericKeypad
          label={`Teclado para ${label.toLowerCase()}`}
          onDigit={handleDigit}
          onBackspace={handleBackspace}
          onClear={handleClear}
        />
      )}
    </div>
  );
}
