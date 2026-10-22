import { useId } from 'react';
import { CalendarDays } from 'lucide-react';
import { Chip, ChipGroup } from '../Chip/Chip.jsx';
import { addDays, today } from '@/lib/date.js';
import { formatDateLong, formatRelativeDay } from '@/lib/format.js';
import { cx } from '@/lib/cx.js';
import styles from './DateShortcuts.module.css';

const DEFAULT_SHORTCUTS = [7, 15, 30];

/**
 * Escolha de data com atalhos grandes ("Em 7 dias", "Em 15 dias"...) e
 * calendário nativo como alternativa. Usado no vencimento do fiado.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {string} props.value data `AAAA-MM-DD`
 * @param {(value: string) => void} props.onChange
 * @param {number[]} [props.shortcuts=[7, 15, 30]] dias a partir de hoje
 * @param {string} [props.min] data mínima `AAAA-MM-DD` (padrão: hoje)
 */
export function DateShortcuts({
  label,
  value,
  onChange,
  shortcuts = DEFAULT_SHORTCUTS,
  min = today(),
  className,
}) {
  const dateId = useId();
  const base = today();
  const shortcutDates = shortcuts.map((days) => ({ days, date: addDays(base, days) }));
  const isCustom = value && !shortcutDates.some(({ date }) => date === value);

  return (
    <fieldset className={cx(styles.fieldset, className)}>
      <legend className={styles.legend}>{label}</legend>
      <ChipGroup label="Atalhos de data" wrap>
        {shortcutDates.map(({ days, date }) => (
          <Chip key={days} selected={value === date} onClick={() => onChange(date)}>
            Em {days} dias
          </Chip>
        ))}
      </ChipGroup>
      <div className={styles.custom} data-active={isCustom || undefined}>
        <CalendarDays size={22} aria-hidden="true" />
        <label htmlFor={dateId} className={styles.customLabel}>
          Outra data
        </label>
        <input
          id={dateId}
          type="date"
          className={styles.date}
          value={value ?? ''}
          min={min}
          onChange={(event) => event.target.value && onChange(event.target.value)}
        />
      </div>
      {value && (
        <p className={styles.summary} aria-live="polite">
          Vence <strong>{formatRelativeDay(value)}</strong>, {formatDateLong(value)}
        </p>
      )}
    </fieldset>
  );
}
