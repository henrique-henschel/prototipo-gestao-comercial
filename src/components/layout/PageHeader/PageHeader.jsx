import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { APP_NAME } from '@/app/config.js';
import { Button } from '@/components/ui';
import styles from './PageHeader.module.css';

/**
 * Cabeçalho de tela: título (h1), frase de apoio e ações. Também define o título
 * da aba do navegador ("Fiado · Caderneta").
 *
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {import('react').ReactNode} [props.actions] à direita no computador, abaixo no celular
 * @param {string} [props.backTo] mostra "Voltar" para esta rota
 * @param {string} [props.backLabel='Voltar']
 */
export function PageHeader({ title, description, actions, backTo, backLabel = 'Voltar' }) {
  return (
    <header className={styles.header}>
      <title>{`${title} · ${APP_NAME}`}</title>
      {backTo && (
        <Button as={Link} to={backTo} variant="ghost" size="sm" icon={ArrowLeft} className={styles.back}>
          {backLabel}
        </Button>
      )}
      <div className={styles.row}>
        <div className={styles.text}>
          <h1 className={styles.title}>{title}</h1>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </header>
  );
}
