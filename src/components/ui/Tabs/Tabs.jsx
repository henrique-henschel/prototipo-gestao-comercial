import { useId, useRef } from 'react';
import styles from './Tabs.module.css';

/**
 * Abas acessíveis (padrão WAI-ARIA): setas ←/→, Home e End trocam de aba.
 * Controlado: o pai guarda a aba ativa; `children(valor)` renderiza o conteúdo dela.
 *
 * @param {object} props
 * @param {string} props.label nome do conjunto de abas
 * @param {{ value: string, label: string, icon?: import('react').ComponentType<any>, count?: number }[]} props.tabs
 * @param {string} props.value aba ativa
 * @param {(value: string) => void} props.onChange
 * @param {(value: string) => import('react').ReactNode} props.children conteúdo da aba ativa
 */
export function Tabs({ label, tabs, value, onChange, children, className }) {
  const baseId = useId();
  const listRef = useRef(null);
  const tabId = (v) => `${baseId}-tab-${v}`;
  const panelId = (v) => `${baseId}-panel-${v}`;

  const handleKeyDown = (event) => {
    const index = tabs.findIndex((tab) => tab.value === value);
    const moves = { ArrowRight: 1, ArrowLeft: -1, Home: -index, End: tabs.length - 1 - index };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = tabs[(index + moves[event.key] + tabs.length) % tabs.length];
    onChange(next.value);
    listRef.current?.querySelector(`#${CSS.escape(tabId(next.value))}`)?.focus();
  };

  return (
    <div className={className}>
      <div ref={listRef} role="tablist" aria-label={label} className={styles.list}>
        {tabs.map(({ value: tabValue, label: tabLabel, icon: Icon, count }) => {
          const selected = tabValue === value;
          return (
            <button
              key={tabValue}
              id={tabId(tabValue)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={selected ? panelId(tabValue) : undefined}
              tabIndex={selected ? 0 : -1}
              className={styles.tab}
              onClick={() => onChange(tabValue)}
              onKeyDown={handleKeyDown}
            >
              {Icon && <Icon size={20} strokeWidth={2.25} aria-hidden="true" />}
              <span>{tabLabel}</span>
              {count !== undefined && <span className={styles.count}>{count}</span>}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={panelId(value)}
        aria-labelledby={tabId(value)}
        tabIndex={0}
        className={styles.panel}
      >
        {children(value)}
      </div>
    </div>
  );
}
