import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { Check, Eye, Plus, Send } from 'lucide-react';
import { ROUTES } from '@/app/routes.js';
import { Button, SpeakButton } from '@/components/ui';
import { PAYMENT_METHODS } from '@/domain/constants.js';
import { formatBRL } from '@/domain/rules/money.js';
import { whatsappLink } from '@/lib/whatsapp.js';
import { formatDate, formatRelativeDay } from '@/lib/format.js';
import { receiptText } from '../receipt.js';
import styles from './SaleCompleted.module.css';

/**
 * Venda concluída: animação, valor e troco enormes, "Nova venda" (a ação principal)
 * e recibo pelo WhatsApp. O "Desfazer" da regra 1.7 fica no aviso que aparece por cima
 * desta tela: ele continua valendo se o vendedor já tocar em "Nova venda".
 *
 * @param {object} props
 * @param {import('@/domain/models.js').Sale} props.sale
 * @param {import('@/domain/models.js').Customer|null} props.customer
 * @param {string} [props.businessName]
 * @param {() => void} props.onNewSale
 */
export function SaleCompleted({ sale, customer, businessName, onNewSale }) {
  const titleRef = useRef(null);
  // O botão de concluir some da tela: o foco vai para o título, que o leitor de tela anuncia.
  useEffect(() => titleRef.current?.focus(), []);
  const fiado = sale.payments.find((payment) => payment.method === 'fiado');
  const methods = sale.payments.map((payment) => PAYMENT_METHODS[payment.method].label).join(' + ');
  const receipt = whatsappLink({
    phone: customer?.phone,
    text: receiptText(sale, { businessName, customerName: customer?.name }),
  });

  return (
    <section className={styles.done} aria-labelledby="venda-concluida">
      <title>{`Venda concluída · ${formatBRL(sale.totalCents)}`}</title>
      <div className={styles.badge} aria-hidden="true">
        <Check size={56} strokeWidth={3} />
      </div>
      <h1 id="venda-concluida" ref={titleRef} className={styles.title} tabIndex={-1}>
        Venda concluída!
      </h1>
      <p className={styles.number}>
        Venda nº {sale.number} · {methods || 'Brinde'}
      </p>
      <p className={styles.total}>{formatBRL(sale.totalCents)}</p>

      {sale.changeCents > 0 && (
        <div className={styles.change} role="status">
          <span className={styles.changeLabel}>Troco</span>
          <span className={styles.changeValue}>{formatBRL(sale.changeCents)}</span>
          <SpeakButton text={`Troco: ${formatBRL(sale.changeCents)}`} />
        </div>
      )}
      {fiado && customer && (
        <p className={styles.fiado} role="status">
          Anotado no fiado de <strong>{customer.name}</strong>: {formatBRL(fiado.amountCents)}, para pagar{' '}
          {formatRelativeDay(fiado.dueDate)} ({formatDate(fiado.dueDate)}).
        </p>
      )}

      <div className={styles.actions}>
        <Button size="hero" icon={Plus} onClick={onNewSale} fullWidth>
          Nova venda
        </Button>
        <div className={styles.secondary}>
          <Button as="a" href={receipt} target="_blank" rel="noreferrer" variant="secondary" icon={Send}>
            Enviar recibo
          </Button>
          <Button as={Link} to={ROUTES.sale(sale.id)} variant="secondary" icon={Eye}>
            Ver a venda
          </Button>
        </div>
      </div>
    </section>
  );
}
