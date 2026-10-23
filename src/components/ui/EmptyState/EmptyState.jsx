import { RotateCcw } from 'lucide-react';
import { cx } from '@/lib/cx.js';
import { Button } from '../Button/Button.jsx';
import { Card } from '../Card/Card.jsx';
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
 * @param {'h1'|'h2'|'h3'} [props.titleAs='h3'] `h1` quando o estado é a própria página (404, erro)
 */
export function EmptyState({
  title,
  titleAs: Title = 'h3',
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
      <Title className={styles.title}>{title}</Title>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}

/**
 * Estado de erro de uma tela com dados: o que não carregou e "Tentar de novo".
 * É anunciado pelo leitor de tela (`role="alert"`) assim que aparece.
 *
 * @example
 * if (status === 'error') return <LoadError title="Não deu para carregar as vendas" onRetry={reload} />;
 *
 * @param {object} props
 * @param {string} props.title ex.: "Não deu para carregar as vendas"
 * @param {string} [props.description='Confira a internet e tente de novo.']
 * @param {() => void} props.onRetry
 */
export function LoadError({
  title,
  description = 'Confira a internet e tente de novo.',
  onRetry,
  className,
}) {
  return (
    <Card role="alert" className={className}>
      <EmptyState
        tone="danger"
        emoji="📡"
        title={title}
        description={description}
        action={
          <Button icon={RotateCcw} onClick={onRetry}>
            Tentar de novo
          </Button>
        }
      />
    </Card>
  );
}
