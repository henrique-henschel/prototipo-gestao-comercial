import { useRef } from 'react';
import { Search, X } from 'lucide-react';
import { cx } from '@/lib/cx.js';
import styles from './SearchBar.module.css';

/**
 * Campo de busca com lupa e botão de limpar.
 *
 * @param {object} props
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {string} [props.label='Buscar'] rótulo para leitores de tela
 * @param {string} [props.placeholder]
 */
export function SearchBar({
  value,
  onChange,
  label = 'Buscar',
  placeholder = 'Buscar…',
  className,
  ...rest
}) {
  const inputRef = useRef(null);

  return (
    <div className={cx(styles.search, className)} role="search">
      <Search className={styles.icon} size={22} aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        className={styles.input}
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        enterKeyHint="search"
        {...rest}
      />
      {value && (
        <button
          type="button"
          className={styles.clear}
          aria-label="Limpar busca"
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
        >
          <X size={20} strokeWidth={2.5} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
