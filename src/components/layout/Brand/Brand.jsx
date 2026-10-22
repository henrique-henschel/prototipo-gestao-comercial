import { NotebookPen } from 'lucide-react';
import { APP_NAME } from '@/app/config.js';
import { cx } from '@/lib/cx.js';
import styles from './Brand.module.css';

/**
 * Marca do app: ícone da caderneta + nome. Com `subtitle`, mostra uma segunda linha
 * (ex.: o nome do negócio).
 * @param {object} props
 * @param {string} [props.title] padrão: nome do app
 * @param {string} [props.subtitle]
 * @param {'md'|'lg'} [props.size='md']
 * @param {boolean} [props.wrap] o título pode ocupar até duas linhas (espaços estreitos)
 */
export function Brand({ title = APP_NAME, subtitle, size = 'md', wrap = false, className }) {
  return (
    <span className={cx(styles.brand, styles[size], wrap && styles.wrap, className)}>
      <span className={styles.logo} aria-hidden="true">
        <NotebookPen size={size === 'lg' ? 30 : 22} strokeWidth={2.25} />
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </span>
    </span>
  );
}
