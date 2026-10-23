import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { ROUTES } from '@/app/routes.js';
import { Avatar, Badge, Card, StatusPill } from '@/components/ui';
import { formatBRL } from '@/domain/rules/money.js';
import { dueLabel } from '../dueLabel.js';
import { ChargeButton } from './ChargeButton.jsx';
import styles from './DebtorRow.module.css';

/**
 * Um cliente em "Quem me deve": quanto deve, a situação do prazo e "Cobrar no WhatsApp".
 * O nome e o valor abrem a conta do cliente.
 *
 * @param {object} props
 * @param {{ customer: import('@/domain/models.js').Customer } &
 *   ReturnType<typeof import('@/domain/rules/fiado.js').customerFiadoSummary>} props.row
 */
export function DebtorRow({ row }) {
  const { customer } = row;
  const label = dueLabel(row);

  return (
    <Card padding="sm" className={styles.row}>
      <Link to={ROUTES.fiadoCustomer(customer.id)} className={styles.link}>
        <Avatar name={customer.name} />
        <span className={styles.text}>
          <span className={styles.name}>{customer.name}</span>
          {customer.note && <span className={styles.note}>{customer.note}</span>}
        </span>
        <span className={styles.amount}>
          <span className="visually-hidden">Deve </span>
          {formatBRL(Math.max(row.balanceCents, 0))}
        </span>
        <ChevronRight className={styles.chevron} size={22} aria-hidden="true" />
      </Link>
      <div className={styles.footer}>
        <span className={styles.status}>
          <StatusPill status={row.status} />
          {label && <span className={styles.due}>{label}</span>}
          {customer.fiadoBlocked && <StatusPill status="bloqueado" />}
          {customer.archived && <Badge>Arquivado</Badge>}
        </span>
        <ChargeButton customer={customer} summary={row} variant="ghost" size="sm" />
      </div>
    </Card>
  );
}
