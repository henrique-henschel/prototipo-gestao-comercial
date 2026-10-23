import { CircleAlert, CircleCheck, CirclePlus } from 'lucide-react';
import { formatBRL } from '@/domain/rules/money.js';
import { cx } from '@/lib/cx.js';
import styles from './ClosingResult.module.css';

const RESULT_UI = {
  certo: { icon: CircleCheck, tone: 'success', text: () => 'Bateu certinho' },
  sobrou: { icon: CirclePlus, tone: 'info', text: (cents) => `Sobrou ${formatBRL(cents)}` },
  faltou: { icon: CircleAlert, tone: 'danger', text: (cents) => `Faltou ${formatBRL(-cents)}` },
};

/**
 * Resultado da conferência da gaveta (regra 6.5): "Bateu certinho", "Sobrou R$ 2,00" ou
 * "Faltou R$ 5,00", sempre com ícone e texto (a cor nunca fala sozinha).
 * @param {object} props
 * @param {'certo'|'sobrou'|'faltou'} props.result
 * @param {number} props.differenceCents contado − esperado
 * @param {'md'|'sm'} [props.size='md']
 */
export function ClosingResult({ result, differenceCents, size = 'md' }) {
  const ui = RESULT_UI[result];
  const Icon = ui.icon;
  return (
    <p className={cx(styles.result, styles[ui.tone], styles[size])}>
      <Icon size={size === 'sm' ? 18 : 24} strokeWidth={2.25} aria-hidden="true" />
      {ui.text(differenceCents)}
    </p>
  );
}
