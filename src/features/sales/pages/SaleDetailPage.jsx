import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Ban, NotebookText, RotateCcw, Send, ShoppingBag } from 'lucide-react';
import { ROUTES } from '@/app/routes.js';
import { PageHeader } from '@/components/layout';
import { Avatar, Button, Card, CardHeader, EmptyState, Skeleton, StatusPill } from '@/components/ui';
import { CANCEL_REASONS, PAYMENT_METHODS, UNITS } from '@/domain/constants.js';
import { cancelSaleAccounts } from '@/domain/rules/fiado.js';
import { formatBRL } from '@/domain/rules/money.js';
import { useCustomers } from '@/hooks/useCustomers.js';
import { useDataStatus } from '@/hooks/useData.js';
import { useFiado } from '@/hooks/useFiado.js';
import { useSales } from '@/hooks/useSales.js';
import { useSettings } from '@/hooks/useSettings.js';
import { useToast } from '@/hooks/useToast.js';
import { formatDate, formatDateLong, formatNumber, formatTime } from '@/lib/format.js';
import { whatsappLink } from '@/lib/whatsapp.js';
import { CancelSaleDialog } from '../components/CancelSaleDialog.jsx';
import { PAYMENT_ICONS } from '../paymentIcons.js';
import { receiptText } from '../receipt.js';
import styles from './SaleDetailPage.module.css';

/** "2 un × R$ 6,00", "1,25 kg × R$ 5,99" */
function quantityLabel(item) {
  const unit = UNITS[item.unit]?.short ?? item.unit;
  return `${formatNumber(item.quantity)} ${unit} × ${formatBRL(item.unitPriceCents)}`;
}

/**
 * Detalhe de uma venda: itens, valores, pagamentos, cliente e observação, com
 * "Enviar recibo" e "Cancelar venda" (regra 1.8).
 */
export default function SaleDetailPage() {
  const { saleId } = useParams();
  const { status, reload } = useDataStatus();
  const { sales, cancelSale } = useSales();
  const { customers } = useCustomers();
  const { accounts } = useFiado();
  const { business } = useSettings();
  const toast = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelKey, setCancelKey] = useState(0);
  const [cancelling, setCancelling] = useState(false);

  const sale = sales.find((s) => s.id === saleId);
  const customer = customers.find((c) => c.id === sale?.customerId) ?? null;
  const refundCents = useMemo(
    () => (sale ? cancelSaleAccounts(accounts, sale.id, sale.createdAt).refundCents : 0),
    [accounts, sale],
  );

  if (status === 'loading') {
    return (
      <>
        <PageHeader title="Venda" backTo={ROUTES.sales} />
        <Card aria-busy="true" aria-label="Carregando a venda">
          <Skeleton lines={6} />
        </Card>
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        <PageHeader title="Venda" backTo={ROUTES.sales} />
        <Card>
          <EmptyState
            tone="danger"
            emoji="📡"
            title="Não deu para carregar a venda"
            description="Confira a internet e tente de novo."
            action={
              <Button icon={RotateCcw} onClick={reload}>
                Tentar de novo
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  if (!sale) {
    return (
      <>
        <PageHeader title="Venda não encontrada" backTo={ROUTES.sales} />
        <Card>
          <EmptyState
            emoji="🔎"
            title="Não encontramos essa venda"
            description="Ela pode ter sido desfeita logo depois de concluída."
            action={
              <Button as={Link} to={ROUTES.sales} icon={ShoppingBag}>
                Ver todas as vendas
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  const cancelled = sale.status === 'cancelada';
  const receipt = whatsappLink({
    phone: customer?.phone,
    text: receiptText(sale, { businessName: business?.name, customerName: customer?.name }),
  });

  const confirmCancel = async (input) => {
    setCancelling(true);
    try {
      const result = await cancelSale(sale.id, input);
      setCancelOpen(false);
      toast.show({
        message: `Venda nº ${sale.number} cancelada`,
        description:
          result.refundCents > 0
            ? `${formatBRL(result.refundCents)} viraram crédito de ${customer?.name ?? 'cliente'}.`
            : result.movements.length > 0
              ? 'Os produtos voltaram para o estoque.'
              : undefined,
        tone: result.refundCents > 0 ? 'warning' : 'success',
      });
    } catch (error) {
      toast.show({ message: error.message, tone: 'danger' });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <PageHeader
        title={`Venda nº ${sale.number}`}
        description={`${formatDateLong(sale.createdAt)}, às ${formatTime(sale.createdAt)}`}
        backTo={ROUTES.sales}
        backLabel="Voltar às vendas"
        actions={
          <Button as="a" href={receipt} target="_blank" rel="noreferrer" variant="secondary" icon={Send}>
            Enviar recibo
          </Button>
        }
      />

      <div className={styles.layout}>
        <Card className={styles.card}>
          <CardHeader
            title="O que foi vendido"
            headingLevel="h2"
            action={<StatusPill status={sale.status} />}
          />
          <ul role="list" className={styles.items}>
            {sale.items.map((item) => (
              <li key={item.id} className={styles.item}>
                <span className={styles.emoji} aria-hidden="true">
                  {item.emoji ?? '🧮'}
                </span>
                <span className={styles.itemText}>
                  <span className={styles.itemName}>{item.name}</span>
                  {item.productId && <span className={styles.itemQty}>{quantityLabel(item)}</span>}
                </span>
                <span className={styles.value}>{formatBRL(item.totalCents)}</span>
              </li>
            ))}
          </ul>
          <dl className={styles.totals}>
            {sale.discountCents > 0 && (
              <>
                <div>
                  <dt>Subtotal</dt>
                  <dd>{formatBRL(sale.subtotalCents)}</dd>
                </div>
                <div>
                  <dt>Desconto{sale.discount?.type === 'percentual' && ` (${sale.discount.value}%)`}</dt>
                  <dd className={styles.discount}>{formatBRL(-sale.discountCents)}</dd>
                </div>
              </>
            )}
            <div className={styles.grandTotal}>
              <dt>Total</dt>
              <dd className={cancelled ? styles.cancelledTotal : undefined}>{formatBRL(sale.totalCents)}</dd>
            </div>
          </dl>
        </Card>

        <div className={styles.side}>
          <Card className={styles.card}>
            <CardHeader title="Como pagou" headingLevel="h2" />
            {sale.payments.length === 0 ? (
              <p className={styles.muted}>Brinde: não teve cobrança.</p>
            ) : (
              <ul role="list" className={styles.payments}>
                {sale.payments.map((payment, index) => {
                  const Icon = PAYMENT_ICONS[payment.method];
                  return (
                    <li key={index} className={styles.payment}>
                      <Icon className={styles.paymentIcon} size={24} aria-hidden="true" />
                      <span className={styles.itemText}>
                        <span className={styles.itemName}>
                          {PAYMENT_METHODS[payment.method].label}
                          {payment.installments > 1 && ` em ${payment.installments}x`}
                        </span>
                        {payment.receivedCents !== undefined && payment.changeCents > 0 && (
                          <span className={styles.itemQty}>
                            Recebeu {formatBRL(payment.receivedCents)} e deu {formatBRL(payment.changeCents)}{' '}
                            de troco
                          </span>
                        )}
                        {payment.dueDate && (
                          <span className={styles.itemQty}>Para pagar até {formatDate(payment.dueDate)}</span>
                        )}
                        {payment.feeCents > 0 && (
                          <span className={styles.itemQty}>
                            Taxa da maquininha: {formatBRL(payment.feeCents)}
                          </span>
                        )}
                      </span>
                      <span className={styles.value}>{formatBRL(payment.amountCents)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {customer && (
            <Card className={styles.card}>
              <CardHeader title="Cliente" headingLevel="h2" />
              <div className={styles.customer}>
                <Avatar name={customer.name} />
                <span className={styles.itemName}>{customer.name}</span>
              </div>
              <Button
                as={Link}
                to={ROUTES.fiadoCustomer(customer.id)}
                variant="secondary"
                icon={NotebookText}
              >
                Ver a conta do fiado
              </Button>
            </Card>
          )}

          {sale.note && (
            <Card className={styles.card}>
              <CardHeader title="Observação" headingLevel="h2" />
              <p>{sale.note}</p>
            </Card>
          )}

          {cancelled ? (
            <Card variant="soft" className={styles.card}>
              <CardHeader title="Venda cancelada" headingLevel="h2" icon={Ban} />
              <p>
                {CANCEL_REASONS.find((r) => r.value === sale.cancellation?.reason)?.label ?? 'Sem motivo'}
                {sale.cancellation?.note && `: ${sale.cancellation.note}`}
              </p>
              {sale.cancellation?.at && (
                <p className={styles.muted}>
                  Em {formatDate(sale.cancellation.at)}, às {formatTime(sale.cancellation.at)}
                </p>
              )}
            </Card>
          ) : (
            <Button
              variant="danger"
              icon={Ban}
              onClick={() => {
                setCancelKey((key) => key + 1);
                setCancelOpen(true);
              }}
            >
              Cancelar venda
            </Button>
          )}
        </div>
      </div>

      <CancelSaleDialog
        key={cancelKey}
        open={cancelOpen}
        sale={sale}
        refundCents={refundCents}
        customerName={customer?.name}
        loading={cancelling}
        onClose={() => setCancelOpen(false)}
        onConfirm={confirmCancel}
      />
    </>
  );
}
