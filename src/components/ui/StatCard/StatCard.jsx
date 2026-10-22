import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { cx } from '@/lib/cx.js';
import styles from './StatCard.module.css';

/**
 * Indicador numérico (KPI): rótulo, valor grande, variação e dica.
 * O layout se adapta à largura do próprio card (container query), não da tela.
 *
 * @param {object} props
 * @param {string} props.label ex.: "Vendido hoje"
 * @param {string} props.value valor já formatado (ex.: "R$ 1.250,00")
 * @param {import('react').ComponentType<any>} [props.icon]
 * @param {'primary'|'accent'|'success'|'warning'|'danger'|'info'} [props.tone='primary']
 * @param {{ text: string, direction: 'up'|'down'|'flat', positive?: boolean }} [props.delta]
 *   `positive` diz se a mudança é boa (vender mais é bom; dívida subir é ruim)
 * @param {string} [props.hint] texto pequeno abaixo do valor
 * @param {import('react').ElementType} [props.as='div']
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'primary',
  delta,
  hint,
  as: Component = 'div',
  className,
  ...rest
}) {
  const DeltaIcon =
    delta?.direction === 'up' ? TrendingUp : delta?.direction === 'down' ? TrendingDown : Minus;
  const deltaTone = delta?.direction === 'flat' ? 'flat' : delta?.positive ? 'good' : 'bad';

  return (
    <Component className={cx(styles.stat, styles[tone], className)} {...rest}>
      <div className={styles.inner}>
        {Icon && (
          <span className={styles.icon} aria-hidden="true">
            <Icon size={24} strokeWidth={2.25} />
          </span>
        )}
        <div className={styles.body}>
          <p className={styles.label}>{label}</p>
          <p className={styles.value}>{value}</p>
          {(delta || hint) && (
            <div className={styles.footer}>
              {delta && (
                <span className={cx(styles.delta, styles[deltaTone])}>
                  <DeltaIcon size={16} strokeWidth={2.5} aria-hidden="true" />
                  {delta.text}
                </span>
              )}
              {hint && <span className={styles.hint}>{hint}</span>}
            </div>
          )}
        </div>
      </div>
    </Component>
  );
}
