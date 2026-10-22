import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { ROUTES } from '@/app/routes.js';
import { Card, StatusPill } from '@/components/ui';
import { PAYMENT_METHODS } from '@/domain/constants.js';
import { formatBRL } from '@/domain/rules/money.js';
import { formatTime } from '@/lib/format.js';
import { cx } from '@/lib/cx.js';
import { PAYMENT_ICONS } from '../paymentIcons.js';
import { itemsSummary } from '../receipt.js';
import styles from './SaleRow.module.css';

/**
 * Uma venda no histórico: hora, número, itens, formas de pagamento e total.
 * O card inteiro abre o detalhe.
 *
 * @param {object} props
 * @param {import('@/domain/models.js').Sale} props.sale
 * @param {string|null} [props.customerName]
 */
export function SaleRow({ sale, customerName }) {
  const cancelled = sale.status === 'cancelada';
  const methods = [...new Set(sale.payments.map((payment) => payment.method))];

  return (
    <Card as={Link} to={ROUTES.sale(sale.id)} interactive padding="sm" className={styles.row}>
      <span className={styles.main}>
        <span className={styles.title}>
          <span className={styles.time}>{formatTime(sale.createdAt)}</span> ·{' '}
          <span className={styles.nowrap}>Venda nº {sale.number}</span>
          {customerName && <span className={styles.customer}> · {customerName}</span>}
        </span>
        <span className={styles.items}>{itemsSummary(sale.items)}</span>
        <span className={styles.methods}>
          {methods.length === 0 && <span className={styles.method}>Brinde</span>}
          {methods.map((method) => {
            const Icon = PAYMENT_ICONS[method];
            return (
              <span key={method} className={cx(styles.method, method === 'fiado' && styles.fiado)}>
                <Icon size={16} aria-hidden="true" />
                {PAYMENT_METHODS[method].shortLabel ?? PAYMENT_METHODS[method].label}
              </span>
            );
          })}
        </span>
      </span>
      <span className={styles.end}>
        <span className={cx(styles.total, cancelled && styles.cancelledTotal)}>
          {formatBRL(sale.totalCents)}
        </span>
        {cancelled && <StatusPill status="cancelada" />}
      </span>
      <ChevronRight className={styles.chevron} size={22} aria-hidden="true" />
    </Card>
  );
}
