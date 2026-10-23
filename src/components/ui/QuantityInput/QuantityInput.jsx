import { useRef } from 'react';
import { Field } from '../Field/Field.jsx';
import { NumericKeypad } from '../NumericKeypad/NumericKeypad.jsx';
import { UNITS } from '@/domain/constants.js';
import { parseQuantityFromDigits, quantityDigits } from '@/domain/rules/stock.js';
import { formatQuantity } from '@/lib/format.js';
import { cx } from '@/lib/cx.js';
// Mesma aparência do campo de dinheiro, de propósito: os dois são "valores" no mesmo formulário.
import styles from '../MoneyInput/MoneyInput.module.css';

/**
 * Campo de quantidade no estilo do `MoneyInput`, sem vírgula: em unidades inteiras cada
 * dígito é uma unidade ("12 un"); em kg e litros os dígitos entram pela direita com 3 casas
 * (digitar 1, 5, 0, 0 mostra "1,500 kg"). Funciona com o teclado próprio (`keypad`), com
 * o teclado físico e com o do celular.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {number} props.value
 * @param {(value: number) => void} props.onChange
 * @param {string} props.unit uma das chaves de `UNITS`
 * @param {boolean} [props.keypad=false] mostra o teclado próprio e evita abrir o do celular
 * @param {'md'|'lg'|'hero'} [props.size='lg']
 * @param {number} [props.max=99999]
 * @param {string} [props.hint]
 * @param {string} [props.error]
 */
export function QuantityInput({
  label,
  value,
  onChange,
  unit,
  keypad = false,
  size = 'lg',
  max = 99_999,
  hint,
  error,
  optional,
  id,
  className,
  ...rest
}) {
  const inputRef = useRef(null);
  const decimal = Boolean(UNITS[unit]?.decimal);
  const short = UNITS[unit]?.short ?? unit;
  const parse = (text) => parseQuantityFromDigits(text, { decimal, max });
  const digits = quantityDigits(value, { decimal });

  const moveCaretBeforeUnit = () => {
    const input = inputRef.current;
    if (!input) return;
    requestAnimationFrame(() => {
      const end = input.value.length - short.length - 1;
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
            value={formatQuantity(value, short, { fixed: decimal })}
            onChange={(event) => onChange(parse(event.target.value))}
            onFocus={moveCaretBeforeUnit}
            onClick={moveCaretBeforeUnit}
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
