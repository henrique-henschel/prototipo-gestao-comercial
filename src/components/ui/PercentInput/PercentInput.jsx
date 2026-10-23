import { useRef } from 'react';
import { Field } from '../Field/Field.jsx';
import { NumericKeypad } from '../NumericKeypad/NumericKeypad.jsx';
import { MAX_PERCENT, parsePercentFromDigits, percentDigits } from '@/domain/rules/money.js';
import { cx } from '@/lib/cx.js';
// Mesma aparência do campo de dinheiro, de propósito: os dois são "valores" no mesmo formulário.
import styles from '../MoneyInput/MoneyInput.module.css';

/**
 * Campo de porcentagem no estilo do `MoneyInput`, sem vírgula: os dígitos entram pela
 * direita com 2 casas (digitar 1, 9, 9 mostra "1,99%"). Usado nas taxas da maquininha.
 * Funciona com o teclado próprio (`keypad`), com o teclado físico e com o do celular.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {number} props.value porcentagem (1.99 = 1,99%)
 * @param {(value: number) => void} props.onChange
 * @param {boolean} [props.keypad=false] mostra o teclado próprio e evita abrir o do celular
 * @param {'md'|'lg'|'hero'} [props.size='lg']
 * @param {number} [props.max=99.99]
 * @param {string} [props.hint]
 * @param {string} [props.error]
 */
export function PercentInput({
  label,
  value,
  onChange,
  keypad = false,
  size = 'lg',
  max = MAX_PERCENT,
  hint,
  error,
  optional,
  id,
  className,
  ...rest
}) {
  const inputRef = useRef(null);
  const parse = (text) => parsePercentFromDigits(text, { max });
  const digits = percentDigits(value);

  const moveCaretBeforeSign = () => {
    const input = inputRef.current;
    if (!input) return;
    requestAnimationFrame(() => {
      const end = input.value.length - 1;
      input.setSelectionRange(end, end);
    });
  };

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
            // Sempre com 2 casas enquanto se digita ("1,90%"), como no dinheiro.
            value={`${(value || 0).toFixed(2).replace('.', ',')}%`}
            onChange={(event) => onChange(parse(event.target.value))}
            onFocus={moveCaretBeforeSign}
            onClick={moveCaretBeforeSign}
            {...control}
            {...rest}
          />
        )}
      </Field>
      {keypad && (
        <NumericKeypad
          label={`Teclado para ${label.toLowerCase()}`}
          onDigit={(digit) => onChange(parse(`${digits}${digit}`))}
          onBackspace={() => onChange(parse(digits.slice(0, -1)))}
          onClear={() => onChange(0)}
        />
      )}
    </div>
  );
}
