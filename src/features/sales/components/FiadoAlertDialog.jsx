import { ArrowLeft, Ban, CircleAlert, Gauge } from 'lucide-react';
import { Button, Dialog } from '@/components/ui';
import { formatBRL } from '@/domain/rules/money.js';
import { plural } from '@/lib/format.js';
import styles from './SaleDialogs.module.css';

/**
 * Alerta ao vender fiado (regra 3.7): cliente bloqueado, com conta atrasada ou passando
 * do limite. Mostra o saldo, o limite e os dias de atraso; a decisão é do vendedor.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.customerName
 * @param {ReturnType<typeof import('@/domain/rules/fiado.js').fiadoAlerts>|null} props.result
 * @param {boolean} [props.loading]
 * @param {() => void} props.onClose escolher outra forma de pagamento
 * @param {() => void} props.onConfirm vender fiado mesmo assim
 */
export function FiadoAlertDialog({ open, customerName, result, loading, onClose, onConfirm }) {
  const firstName = customerName.split(' ')[0];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={`Cuidado com o fiado de ${firstName}`}
      description="Você pode vender assim mesmo. A decisão é sua."
      footer={
        <>
          <Button variant="secondary" icon={ArrowLeft} onClick={onClose}>
            Escolher outra forma
          </Button>
          <Button variant="accent" loading={loading} onClick={onConfirm}>
            Vender fiado assim mesmo
          </Button>
        </>
      }
    >
      {result && (
        <>
          <ul role="list" className={styles.list}>
            {result.alerts.includes('bloqueado') && (
              <li className={styles.item}>
                <Ban className={styles.danger} size={22} aria-hidden="true" />
                <span>Você marcou para não vender fiado para {firstName}.</span>
              </li>
            )}
            {result.alerts.includes('atrasado') && (
              <li className={styles.item}>
                <CircleAlert className={styles.danger} size={22} aria-hidden="true" />
                <span>
                  Tem conta atrasada há <strong>{plural(result.maxDaysOverdue, 'dia')}</strong>.
                </span>
              </li>
            )}
            {result.alerts.includes('limite') && (
              <li className={styles.item}>
                <Gauge className={styles.warning} size={22} aria-hidden="true" />
                <span>
                  Com esta venda, a dívida vai para <strong>{formatBRL(result.newBalanceCents)}</strong> e
                  passa do limite de <strong>{formatBRL(result.limitCents)}</strong>.
                </span>
              </li>
            )}
          </ul>
          <dl className={styles.facts}>
            <div>
              <dt>Deve hoje</dt>
              <dd>{formatBRL(Math.max(result.currentBalanceCents, 0))}</dd>
            </div>
            <div>
              <dt>Limite</dt>
              <dd>{result.limitCents == null ? 'Sem limite' : formatBRL(result.limitCents)}</dd>
            </div>
          </dl>
        </>
      )}
    </Dialog>
  );
}
