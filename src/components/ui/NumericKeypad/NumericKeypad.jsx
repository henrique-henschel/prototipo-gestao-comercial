import { useRef } from 'react';
import { Delete } from 'lucide-react';
import { cx } from '@/lib/cx.js';
import styles from './NumericKeypad.module.css';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'];
const HOLD_TO_CLEAR_MS = 600;

/**
 * Teclado numérico estilo calculadora, com teclas grandes.
 * Não guarda estado: emite cada tecla para o componente pai (ex.: MoneyInput).
 *
 * @param {object} props
 * @param {(digit: string) => void} props.onDigit
 * @param {() => void} props.onBackspace
 * @param {() => void} [props.onClear] chamado ao segurar a tecla apagar
 * @param {string} [props.label='Teclado numérico']
 */
export function NumericKeypad({ onDigit, onBackspace, onClear, label = 'Teclado numérico', className }) {
  const holdTimer = useRef(undefined);
  const cleared = useRef(false);

  const startHold = () => {
    if (!onClear) return;
    cleared.current = false;
    holdTimer.current = setTimeout(() => {
      cleared.current = true;
      onClear();
      navigator.vibrate?.(30);
    }, HOLD_TO_CLEAR_MS);
  };

  const endHold = () => clearTimeout(holdTimer.current);

  const backspaceLabel = onClear ? 'Apagar (segure para limpar tudo)' : 'Apagar';

  return (
    <div className={cx(styles.keypad, className)} role="group" aria-label={label}>
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          className={styles.key}
          onClick={() => onDigit(key)}
          // Mantém o foco no campo de valor enquanto o usuário toca no teclado.
          onPointerDown={(event) => event.preventDefault()}
        >
          {key}
        </button>
      ))}
      <button
        type="button"
        className={cx(styles.key, styles.backspace)}
        aria-label={backspaceLabel}
        title={backspaceLabel}
        onClick={() => {
          // Depois de segurar para limpar, o clique ao soltar não apaga de novo.
          if (cleared.current) {
            cleared.current = false;
            return;
          }
          onBackspace();
        }}
        onPointerDown={(event) => {
          event.preventDefault();
          startHold();
        }}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
      >
        <Delete size={28} strokeWidth={2.25} aria-hidden="true" />
      </button>
    </div>
  );
}
