import { LoaderCircle } from 'lucide-react';
import { cx } from '@/lib/cx.js';
import styles from './Button.module.css';

const ICON_SIZE = { sm: 18, md: 22, lg: 24, hero: 28 };

/**
 * Botão padrão. Sempre com texto; o ícone é opcional e fica à esquerda.
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'|'danger'|'accent'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'|'hero'} [props.size='md'] `hero` para a ação principal da tela
 * @param {import('react').ComponentType<any>} [props.icon] ícone do lucide-react
 * @param {import('react').ComponentType<any>} [props.iconRight]
 * @param {boolean} [props.fullWidth]
 * @param {boolean} [props.loading] mostra spinner, desabilita e anuncia "carregando"
 * @param {import('react').ElementType} [props.as='button'] ex.: Link do roteador
 */
export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  fullWidth = false,
  loading = false,
  as: Component = 'button',
  className,
  children,
  disabled,
  type,
  ...rest
}) {
  const iconSize = ICON_SIZE[size];
  const isButton = Component === 'button';

  return (
    <Component
      className={cx(styles.button, styles[variant], styles[size], fullWidth && styles.fullWidth, className)}
      type={isButton ? (type ?? 'button') : type}
      disabled={isButton ? disabled || loading : undefined}
      aria-disabled={!isButton && (disabled || loading) ? true : undefined}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <LoaderCircle className={styles.spinner} size={iconSize} aria-hidden="true" />
      ) : (
        Icon && <Icon size={iconSize} strokeWidth={2.25} aria-hidden="true" />
      )}
      <span className={styles.label}>{children}</span>
      {IconRight && !loading && <IconRight size={iconSize} strokeWidth={2.25} aria-hidden="true" />}
    </Component>
  );
}
