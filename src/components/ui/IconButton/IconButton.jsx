import { cx } from '@/lib/cx.js';
import styles from './IconButton.module.css';

/**
 * Botão só com ícone. Use apenas em ações secundárias óbvias (fechar, limpar,
 * +/−). O `label` é obrigatório: vira `aria-label` e dica ao passar o mouse.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {import('react').ComponentType<any>} props.icon
 * @param {'ghost'|'soft'|'primary'|'danger'} [props.variant='ghost']
 * @param {'md'|'lg'} [props.size='md']
 */
export function IconButton({ label, icon: Icon, variant = 'ghost', size = 'md', className, type, ...rest }) {
  return (
    <button
      type={type ?? 'button'}
      aria-label={label}
      title={label}
      className={cx(styles.iconButton, styles[variant], styles[size], className)}
      {...rest}
    >
      <Icon size={size === 'lg' ? 26 : 22} strokeWidth={2.25} aria-hidden="true" />
    </button>
  );
}
