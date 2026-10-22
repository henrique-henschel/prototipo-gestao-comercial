import { cx } from '@/lib/cx.js';
import styles from './Card.module.css';

/**
 * Superfície de conteúdo. Com `interactive`, ganha realce ao passar o mouse
 * e ao tocar; use junto com `as="button"` ou `as={Link}`.
 *
 * @param {object} props
 * @param {import('react').ElementType} [props.as='div']
 * @param {'default'|'outlined'|'soft'} [props.variant='default']
 * @param {'none'|'sm'|'md'|'lg'} [props.padding='md']
 * @param {boolean} [props.interactive]
 */
export function Card({
  as: Component = 'div',
  variant = 'default',
  padding = 'md',
  interactive = false,
  className,
  children,
  ...rest
}) {
  return (
    <Component
      className={cx(
        styles.card,
        styles[variant],
        styles[`pad-${padding}`],
        interactive && styles.interactive,
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}

/**
 * Cabeçalho de card: título, descrição opcional e ação à direita.
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {import('react').ComponentType<any>} [props.icon]
 * @param {import('react').ReactNode} [props.action]
 * @param {'h2'|'h3'|'h4'} [props.headingLevel='h3']
 */
export function CardHeader({ title, description, icon: Icon, action, headingLevel: Heading = 'h3' }) {
  return (
    <div className={styles.header}>
      {Icon && (
        <span className={styles.headerIcon} aria-hidden="true">
          <Icon size={22} strokeWidth={2.25} />
        </span>
      )}
      <div className={styles.headerText}>
        <Heading className={styles.title}>{title}</Heading>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
