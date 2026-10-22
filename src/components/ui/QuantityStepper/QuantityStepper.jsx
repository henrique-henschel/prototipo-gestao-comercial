import { Minus, Plus } from 'lucide-react';
import { formatNumber } from '@/lib/format.js';
import { cx } from '@/lib/cx.js';
import styles from './QuantityStepper.module.css';

/**
 * Controle − quantidade +. Para produtos por peso, use `step` decimal (ex.: 0.1 kg).
 *
 * @param {object} props
 * @param {number} props.value
 * @param {(value: number) => void} props.onChange
 * @param {string} props.label descrição para leitores de tela (ex.: "Quantidade de Coxinha")
 * @param {number} [props.min=0]
 * @param {number} [props.max=9999]
 * @param {number} [props.step=1]
 * @param {string} [props.unit] exibido depois do número (ex.: "kg")
 * @param {'md'|'sm'} [props.size='md']
 */
export function QuantityStepper({
  value,
  onChange,
  label,
  min = 0,
  max = 9999,
  step = 1,
  unit,
  size = 'md',
  className,
}) {
  // Arredonda para evitar 0.30000000000000004 em passos decimais.
  const round = (n) => Math.round(n * 1000) / 1000;
  const change = (delta) => onChange(Math.min(max, Math.max(min, round(value + delta))));

  return (
    <div className={cx(styles.stepper, styles[size], className)} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.button}
        onClick={() => change(-step)}
        disabled={value <= min}
        aria-label="Diminuir"
      >
        <Minus size={22} strokeWidth={2.5} aria-hidden="true" />
      </button>
      <output className={styles.value} aria-live="polite">
        {formatNumber(value)}
        {unit && <span className={styles.unit}> {unit}</span>}
      </output>
      <button
        type="button"
        className={styles.button}
        onClick={() => change(step)}
        disabled={value >= max}
        aria-label="Aumentar"
      >
        <Plus size={22} strokeWidth={2.5} aria-hidden="true" />
      </button>
    </div>
  );
}
