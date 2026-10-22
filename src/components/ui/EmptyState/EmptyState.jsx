import { cx } from '@/lib/cx.js';
import styles from './EmptyState.module.css';

/**
 * Tela vazia que ensina o próximo passo: ilustração, frase curta e uma ação.
 *
 * @param {object} props
 * @param {string} props.title ex.: "Você ainda não tem produtos"
 * @param {string} [props.description] ex.: "Cadastre o que você vende para vender mais rápido."
 * @param {import('react').ComponentType<any>} [props.icon]
 * @param {string} [props.emoji] alternativa mais amigável ao ícone
 * @param {import('react').ReactNode} [props.action] normalmente um `Button`
 * @param {'neutral'|'danger'} [props.tone='neutral'] `danger` para estados de erro
 * @param {boolean} [props.compact]
 */
export function EmptyState({
  title,
  description,
  icon: Icon,
  emoji,
  action,
  tone = 'neutral',
  compact,
  className,
}) {
  return (
    <div className={cx(styles.empty, styles[tone], compact && styles.compact, className)}>
      {(emoji || Icon) && (
        <div className={styles.art} aria-hidden="true">
          {emoji ? <span className={styles.emoji}>{emoji}</span> : <Icon size={40} strokeWidth={1.75} />}
        </div>
      )}
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
