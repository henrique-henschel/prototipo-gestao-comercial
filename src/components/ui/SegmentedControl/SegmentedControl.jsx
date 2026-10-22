import { useId } from 'react';
import { cx } from '@/lib/cx.js';
import styles from './SegmentedControl.module.css';

/**
 * Escolha única entre 2–4 opções curtas (ex.: "R$" / "%", "Hoje" / "Semana" / "Mês").
 * Usa rádios nativos: setas do teclado e leitores de tela funcionam sem código extra.
 *
 * @param {object} props
 * @param {string} props.label nome do grupo (visível se `showLabel`)
 * @param {{ value: string, label: string, icon?: import('react').ComponentType<any> }[]} props.options
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {boolean} [props.showLabel=false]
 * @param {boolean} [props.fullWidth=false]
 */
export function SegmentedControl({
  label,
  options,
  value,
  onChange,
  showLabel = false,
  fullWidth = false,
  className,
}) {
  const name = useId();

  return (
    <fieldset className={cx(styles.fieldset, className)}>
      <legend className={showLabel ? styles.legend : 'visually-hidden'}>{label}</legend>
      <div className={cx(styles.track, fullWidth && styles.fullWidth)} style={{ '--count': options.length }}>
        {options.map(({ value: optionValue, label: optionLabel, icon: Icon }) => (
          <label key={optionValue} className={styles.option}>
            <input
              type="radio"
              name={name}
              value={optionValue}
              checked={value === optionValue}
              onChange={() => onChange(optionValue)}
              className="visually-hidden"
            />
            {Icon && <Icon size={18} strokeWidth={2.25} aria-hidden="true" />}
            <span>{optionLabel}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
