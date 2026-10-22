import { cx } from '@/lib/cx.js';
import styles from './Chip.module.css';

/**
 * Filtro em formato de pílula, liga/desliga (`aria-pressed`).
 *
 * @param {object} props
 * @param {boolean} props.selected
 * @param {() => void} props.onClick
 * @param {import('react').ComponentType<any>} [props.icon]
 * @param {string} [props.emoji] alternativa ao ícone (categorias de produto)
 * @param {number} [props.count] contador à direita
 */
export function Chip({ selected, onClick, icon: Icon, emoji, count, children, className, ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx(styles.chip, className)}
      onClick={onClick}
      {...rest}
    >
      {emoji && (
        <span className={styles.emoji} aria-hidden="true">
          {emoji}
        </span>
      )}
      {Icon && <Icon size={18} strokeWidth={2.25} aria-hidden="true" />}
      <span>{children}</span>
      {count !== undefined && <span className={styles.count}>{count}</span>}
    </button>
  );
}

/**
 * Faixa de chips com rolagem horizontal e encaixe (`scroll-snap`) no celular.
 * @param {object} props
 * @param {string} props.label nome do grupo para leitores de tela
 * @param {boolean} [props.wrap] quebra linha em vez de rolar
 */
export function ChipGroup({ label, wrap = false, children, className }) {
  return (
    <div role="group" aria-label={label} className={cx(styles.group, wrap && styles.wrap, className)}>
      {children}
    </div>
  );
}
