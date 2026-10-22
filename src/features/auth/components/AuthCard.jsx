import { APP_NAME } from '@/app/config.js';
import { Card } from '@/components/ui';
import styles from './AuthCard.module.css';

/**
 * Cartão das telas de acesso: título (h1), frase de apoio, conteúdo e rodapé.
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {import('react').ReactNode} props.children
 * @param {import('react').ReactNode} [props.footer]
 */
export function AuthCard({ title, description, children, footer }) {
  return (
    <>
      <title>{`${title} · ${APP_NAME}`}</title>
      <Card padding="lg" className={styles.card}>
        <div className={styles.heading}>
          <h1 className={styles.title}>{title}</h1>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {children}
      </Card>
      {footer && <div className={styles.footer}>{footer}</div>}
    </>
  );
}

/** Separador "ou" entre duas formas de fazer a mesma coisa. */
export function OrDivider() {
  return (
    <p className={styles.divider}>
      <span>ou</span>
    </p>
  );
}
