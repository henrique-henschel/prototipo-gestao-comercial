import { cx } from '@/lib/cx.js';
import { STATUS_PRESETS } from './statusPresets.js';
import styles from './StatusPill.module.css';

/**
 * Pílula de status: cor + ícone + texto. Use `status` com um preset de domínio
 * (ex.: "atrasado", "acabando") ou monte manualmente com `tone`, `icon` e `children`.
 *
 * @param {object} props
 * @param {keyof typeof STATUS_PRESETS} [props.status]
 * @param {'neutral'|'success'|'warning'|'danger'|'info'} [props.tone]
 * @param {import('react').ComponentType<any>} [props.icon]
 * @param {import('react').ReactNode} [props.children] substitui o texto do preset
 *   (ex.: "Atrasado 5 dias")
 * @param {'md'|'lg'} [props.size='md']
 */
export function StatusPill({ status, tone, icon, size = 'md', children, className }) {
  const preset = status ? STATUS_PRESETS[status] : undefined;
  const finalTone = tone ?? preset?.tone ?? 'neutral';
  const Icon = icon ?? preset?.icon;

  return (
    <span className={cx(styles.pill, styles[finalTone], styles[size], className)}>
      {Icon && <Icon size={size === 'lg' ? 20 : 16} strokeWidth={2.5} aria-hidden="true" />}
      <span>{children ?? preset?.label}</span>
    </span>
  );
}
