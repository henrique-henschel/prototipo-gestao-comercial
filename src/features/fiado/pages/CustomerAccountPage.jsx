import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  Archive,
  ArchiveRestore,
  CircleCheck,
  MessageCircle,
  Pencil,
  PiggyBank,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  Trash,
  Undo2,
  Users,
  Wallet,
} from 'lucide-react';
import { ROUTES } from '@/app/routes.js';
import { PageHeader } from '@/components/layout';
import {
  Button,
  Card,
  CardHeader,
  Dialog,
  EmptyState,
  ProgressBar,
  Skeleton,
  StatusPill,
  Switch,
} from '@/components/ui';
import { PAYMENT_METHODS } from '@/domain/constants.js';
import { validateCustomerDeletion } from '@/domain/rules/customers.js';
import {
  accountBalance,
  accountStatus,
  compareFifo,
  customerFiadoSummary,
  customerTimeline,
  daysOverdue,
  openAccounts,
  validateUndoFiadoPayment,
} from '@/domain/rules/fiado.js';
import { formatBRL } from '@/domain/rules/money.js';
import { useCart } from '@/hooks/useCart.js';
import { useCustomers } from '@/hooks/useCustomers.js';
import { useDataStatus } from '@/hooks/useData.js';
import { useFiado } from '@/hooks/useFiado.js';
import { useSales } from '@/hooks/useSales.js';
import { useSettings } from '@/hooks/useSettings.js';
import { useToast } from '@/hooks/useToast.js';
import { formatDate, formatPhone, formatTime } from '@/lib/format.js';
import { cx } from '@/lib/cx.js';
import { CustomerFormSheet } from '@/features/customers/components/CustomerFormSheet.jsx';
import { PAYMENT_ICONS } from '@/features/sales/paymentIcons.js';
import { ChargeButton } from '../components/ChargeButton.jsx';
import { ReceivePaymentSheet } from '../components/ReceivePaymentSheet.jsx';
import { dueLabel } from '../dueLabel.js';
import styles from './CustomerAccountPage.module.css';

const RECEIVE_PARAM = 'receber';
const HISTORY_PAGE = 15;

/**
 * Conta do cliente (seções 3 e 4 de docs/regras-de-negocio.md): quanto deve, as compras em
 * aberto na ordem em que são quitadas (FIFO), o histórico de compras e recebimentos,
 * "Receber pagamento" (com "Desfazer"), "Cobrar no WhatsApp" e o cadastro do cliente
 * (limite, bloqueio, arquivar e apagar). `?receber=1` já abre o recebimento.
 */
export default function CustomerAccountPage() {
  const { customerId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { status, reload } = useDataStatus();
  const { customers, updateCustomer, archiveCustomer, deleteCustomer } = useCustomers();
  const { accounts, payments, receivePayment, undoPayment } = useFiado();
  const { sales } = useSales();
  const { settings } = useSettings();
  const { actions: cartActions } = useCart();
  const toast = useToast();

  const [receiveKey, setReceiveKey] = useState(0);
  const [receiving, setReceiving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editKey, setEditKey] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE);

  const customer = customers.find((c) => c.id === customerId);
  const own = useMemo(() => accounts.filter((a) => a.customerId === customerId), [accounts, customerId]);
  const summary = useMemo(() => (customer ? customerFiadoSummary(customer, own) : null), [customer, own]);
  const open = useMemo(() => [...openAccounts(own)].sort(compareFifo), [own]);
  const timeline = useMemo(
    () => customerTimeline(customerId, accounts, payments),
    [customerId, accounts, payments],
  );
  const saleNumbers = useMemo(() => new Map(sales.map((sale) => [sale.id, sale.number])), [sales]);

  const fromCustomers = location.state?.from === 'clientes';
  const backTo = fromCustomers ? ROUTES.customers : ROUTES.fiado;
  const backLabel = fromCustomers ? 'Voltar aos clientes' : 'Voltar a quem me deve';

  if (status === 'loading') {
    return (
      <>
        <PageHeader title="Conta do cliente" backTo={backTo} backLabel={backLabel} />
        <div className={styles.loading} aria-busy="true" aria-label="Carregando a conta do cliente">
          <Skeleton shape="rect" height="12rem" />
          <Skeleton shape="rect" height="16rem" />
        </div>
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        <PageHeader title="Conta do cliente" backTo={backTo} backLabel={backLabel} />
        <Card>
          <EmptyState
            tone="danger"
            emoji="📡"
            title="Não deu para carregar a conta"
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

  // Logo depois de apagar, a tela some antes de a navegação terminar.
  if (deleted) return null;

  if (!customer) {
    return (
      <>
        <PageHeader title="Cliente não encontrado" backTo={backTo} backLabel={backLabel} />
        <Card>
          <EmptyState
            emoji="🔎"
            title="Não encontramos esse cliente"
            description="Ele pode ter sido apagado."
            action={
              <Button as={Link} to={ROUTES.customers} icon={Users}>
                Ver todos os clientes
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  const firstName = customer.name.split(' ')[0];
  const balanceCents = summary.balanceCents;
  const creditCents = customer.creditCents || 0;
  const receiveOpen = params.get(RECEIVE_PARAM) === '1' && balanceCents > 0;
  const deletionErrors = validateCustomerDeletion(summary);
  const limitCents = customer.creditLimitCents;
  const overLimit = limitCents != null && balanceCents > limitCents;

  const setReceiveOpen = (value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(RECEIVE_PARAM, '1');
    else next.delete(RECEIVE_PARAM);
    setParams(next, { replace: true, state: location.state });
  };

  const openReceive = () => {
    setReceiveKey((key) => key + 1);
    setReceiveOpen(true);
  };

  const openEdit = () => {
    setEditKey((key) => key + 1);
    setEditOpen(true);
  };

  const undoReceipt = async (paymentId) => {
    try {
      await undoPayment(paymentId);
      toast.show({
        message: 'Recebimento desfeito',
        description: 'A dívida voltou a ser como era.',
        tone: 'info',
      });
    } catch (error) {
      toast.show({ message: error.message, tone: 'danger' });
    }
  };

  const confirmReceive = async (input) => {
    setReceiving(true);
    try {
      const { payment } = await receivePayment(customer.id, input);
      const remainingCents = Math.max(balanceCents - input.amountCents, 0);
      setReceiveOpen(false);
      toast.show({
        message: `Recebido ${formatBRL(input.amountCents)} de ${firstName}`,
        description:
          payment.creditAddedCents > 0
            ? `${formatBRL(payment.creditAddedCents)} viraram crédito para a próxima compra.`
            : remainingCents > 0
              ? `Ainda deve ${formatBRL(remainingCents)}.`
              : 'Ficou tudo pago!',
        action: { label: 'Desfazer', onClick: () => undoReceipt(payment.id) },
      });
    } catch (error) {
      toast.show({ message: error.message, tone: 'danger' });
    } finally {
      setReceiving(false);
    }
  };

  const toggleBlocked = async (fiadoBlocked) => {
    try {
      await updateCustomer(customer.id, { fiadoBlocked });
      toast.show({
        message: fiadoBlocked ? `Fiado bloqueado para ${firstName}` : `Fiado liberado para ${firstName}`,
        description: fiadoBlocked ? 'Na hora de vender fiado, vai aparecer um aviso.' : undefined,
        tone: 'info',
        action: {
          label: 'Desfazer',
          onClick: () => updateCustomer(customer.id, { fiadoBlocked: !fiadoBlocked }).catch(() => {}),
        },
      });
    } catch (error) {
      toast.show({ message: error.message, tone: 'danger' });
    }
  };

  const setArchived = async (archived) => {
    try {
      await archiveCustomer(customer.id, archived);
      toast.show({
        message: archived ? 'Cliente arquivado' : 'Cliente de volta à lista',
        description: archived ? 'Não aparece mais na hora de vender.' : undefined,
        tone: 'info',
        action: archived
          ? { label: 'Desfazer', onClick: () => archiveCustomer(customer.id, false).catch(() => {}) }
          : undefined,
      });
    } catch (error) {
      toast.show({ message: error.message, tone: 'danger' });
    }
  };

  const confirmDelete = async () => {
    setDeleteOpen(false);
    setDeleted(true);
    navigate(ROUTES.customers, { replace: true });
    try {
      await deleteCustomer(customer.id);
      toast.show({ message: 'Cliente apagado', description: customer.name, tone: 'info' });
    } catch (error) {
      toast.show({ message: error.message, tone: 'danger' });
    }
  };

  const sellTo = () => {
    cartActions.setCustomer(customer.id);
    navigate(ROUTES.sell);
  };

  return (
    <>
      <PageHeader
        title={customer.name}
        description={customer.note || undefined}
        backTo={backTo}
        backLabel={backLabel}
      />

      {customer.archived && (
        <Card variant="soft" className={styles.archived}>
          <p>
            <Archive size={20} aria-hidden="true" />
            Cliente arquivado: não aparece na hora de vender.
          </p>
          <Button variant="secondary" size="sm" icon={ArchiveRestore} onClick={() => setArchived(false)}>
            Desarquivar
          </Button>
        </Card>
      )}

      <div className={styles.layout}>
        <div className={styles.main}>
          <Card className={styles.summary}>
            {balanceCents > 0 ? (
              <>
                <p className={styles.summaryLabel}>{firstName} deve</p>
                <p className={styles.balance}>{formatBRL(balanceCents)}</p>
                <div className={styles.status}>
                  <StatusPill status={summary.status} size="lg" />
                  <span className={styles.due}>{dueLabel(summary)}</span>
                  {customer.fiadoBlocked && <StatusPill status="bloqueado" size="lg" />}
                </div>
                {creditCents > 0 && (
                  <p className={styles.muted}>Já descontado o crédito de {formatBRL(creditCents)}.</p>
                )}
              </>
            ) : balanceCents < 0 ? (
              <>
                <p className={styles.summaryLabel}>
                  <PiggyBank size={22} aria-hidden="true" /> {firstName} tem crédito
                </p>
                <p className={cx(styles.balance, styles.credit)}>{formatBRL(-balanceCents)}</p>
                <p className={styles.muted}>O crédito é descontado no próximo pagamento de fiado.</p>
              </>
            ) : (
              <p className={styles.paid}>
                <CircleCheck size={28} aria-hidden="true" /> {firstName} não deve nada
              </p>
            )}

            {limitCents != null && (
              <div className={styles.limit}>
                <ProgressBar
                  value={Math.max(balanceCents, 0)}
                  max={limitCents}
                  label="Uso do limite do fiado"
                  valueText={`${formatBRL(Math.max(balanceCents, 0))} de ${formatBRL(limitCents)}`}
                  tone={overLimit ? 'danger' : balanceCents >= limitCents * 0.8 ? 'warning' : 'primary'}
                />
                <p className={styles.muted}>
                  {overLimit
                    ? `Passou ${formatBRL(balanceCents - limitCents)} do limite de ${formatBRL(limitCents)}.`
                    : `Usou ${formatBRL(Math.max(balanceCents, 0))} do limite de ${formatBRL(limitCents)}.`}
                </p>
              </div>
            )}

            {balanceCents > 0 && (
              <div className={styles.actions}>
                <Button size="hero" icon={Wallet} fullWidth onClick={openReceive}>
                  Receber pagamento
                </Button>
                {customer.phone ? (
                  <ChargeButton customer={customer} summary={summary} fullWidth />
                ) : (
                  <Button variant="secondary" icon={MessageCircle} fullWidth onClick={openEdit}>
                    Cadastrar WhatsApp para cobrar
                  </Button>
                )}
              </div>
            )}
          </Card>

          {open.length > 0 && (
            <Card className={styles.card}>
              <CardHeader
                title="Compras para pagar"
                description="O pagamento quita primeiro as de cima, que vencem antes."
                headingLevel="h2"
              />
              <ul role="list" className={styles.rows}>
                {open.map((account) => {
                  const accountState = accountStatus(account);
                  const saleNumber = saleNumbers.get(account.saleId);
                  return (
                    <li key={account.id} className={styles.row}>
                      <span className={styles.rowText}>
                        <span className={styles.rowTitle}>Compra de {formatDate(account.createdAt)}</span>
                        <span className={styles.rowMeta}>
                          Vence {formatDate(account.dueDate)}
                          {saleNumber && (
                            <>
                              {' · '}
                              <Link to={ROUTES.sale(account.saleId)}>Venda nº {saleNumber}</Link>
                            </>
                          )}
                        </span>
                        <span className={styles.rowStatus}>
                          <StatusPill status={accountState} />
                          <span className={styles.due}>
                            {dueLabel({
                              status: accountState,
                              dueDate: account.dueDate,
                              maxDaysOverdue: daysOverdue(account),
                            })}
                          </span>
                        </span>
                      </span>
                      <span className={styles.rowValue}>
                        <span className={styles.value}>{formatBRL(accountBalance(account))}</span>
                        {account.paidCents > 0 && (
                          <span className={styles.rowMeta}>
                            de {formatBRL(account.originalCents)}, já pagou {formatBRL(account.paidCents)}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <Card className={styles.card}>
            <CardHeader title="Histórico" headingLevel="h2" />
            {timeline.length === 0 ? (
              <EmptyState
                compact
                emoji="📒"
                title={`${firstName} ainda não comprou fiado`}
                description="As compras fiado e os pagamentos aparecem aqui."
              />
            ) : (
              <>
                <ul role="list" className={styles.rows} aria-label="Histórico do fiado">
                  {timeline
                    .slice(0, historyLimit)
                    .map((entry) =>
                      entry.type === 'compra' ? (
                        <PurchaseEntry
                          key={entry.id}
                          account={entry.account}
                          saleNumber={saleNumbers.get(entry.account.saleId)}
                        />
                      ) : (
                        <PaymentEntry
                          key={entry.id}
                          payment={entry.payment}
                          canUndo={validateUndoFiadoPayment(entry.payment, payments).length === 0}
                          onUndo={() => undoReceipt(entry.payment.id)}
                        />
                      ),
                    )}
                </ul>
                {timeline.length > historyLimit && (
                  <Button
                    variant="secondary"
                    onClick={() => setHistoryLimit((limit) => limit + HISTORY_PAGE)}
                  >
                    Mostrar mais ({timeline.length - historyLimit} restantes)
                  </Button>
                )}
              </>
            )}
          </Card>
        </div>

        <div className={styles.side}>
          <Card className={styles.card}>
            <CardHeader
              title="Dados do cliente"
              headingLevel="h2"
              action={
                <Button variant="secondary" size="sm" icon={Pencil} onClick={openEdit}>
                  Editar
                </Button>
              }
            />
            <dl className={styles.facts}>
              <div>
                <dt>WhatsApp</dt>
                <dd>{customer.phone ? formatPhone(customer.phone) : 'Não cadastrado'}</dd>
              </div>
              <div>
                <dt>Limite do fiado</dt>
                <dd>{limitCents == null ? 'Sem limite' : formatBRL(limitCents)}</dd>
              </div>
              {customer.createdAt && (
                <div>
                  <dt>Cliente desde</dt>
                  <dd>{formatDate(customer.createdAt)}</dd>
                </div>
              )}
            </dl>
            <Switch
              label="Não vender fiado"
              description="Na hora de vender fiado, aparece um aviso. A decisão continua sendo sua."
              checked={customer.fiadoBlocked}
              onChange={toggleBlocked}
            />
            {!customer.archived && (
              <Button variant="secondary" icon={ShoppingCart} onClick={sellTo}>
                Nova venda para {firstName}
              </Button>
            )}
          </Card>

          <Card className={styles.card}>
            <CardHeader title="Arquivar ou apagar" headingLevel="h2" />
            <p className={styles.muted}>
              Arquivar tira o cliente da lista da venda, mas guarda a conta e o histórico.
              {deletionErrors.length > 0 &&
                (deletionErrors[0] === 'cliente_devendo'
                  ? ' Quem ainda deve não pode ser apagado.'
                  : ' Quem tem crédito com você não pode ser apagado.')}
            </p>
            <div className={styles.buttons}>
              {customer.archived ? (
                <Button variant="secondary" icon={ArchiveRestore} onClick={() => setArchived(false)}>
                  Desarquivar
                </Button>
              ) : (
                <Button variant="secondary" icon={Archive} onClick={() => setArchived(true)}>
                  Arquivar cliente
                </Button>
              )}
              {deletionErrors.length === 0 && (
                <Button
                  variant="ghost"
                  icon={Trash}
                  className={styles.danger}
                  onClick={() => setDeleteOpen(true)}
                >
                  Apagar cliente
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      <ReceivePaymentSheet
        key={receiveKey}
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        customer={customer}
        accounts={own}
        enabledMethods={settings.paymentMethods}
        loading={receiving}
        onConfirm={confirmReceive}
      />

      <CustomerFormSheet
        key={`editar-${editKey}`}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        customer={customer}
        onSaved={() => {
          setEditOpen(false);
          toast.show({ message: 'Dados do cliente salvos', tone: 'success' });
        }}
      />

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        size="sm"
        title={`Apagar ${customer.name}?`}
        description="Isso não pode ser desfeito. As vendas antigas continuam no histórico, mas sem o nome do cliente. Se só quer tirar da lista, arquive."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Não apagar
            </Button>
            <Button variant="danger" icon={Trash} onClick={confirmDelete}>
              Apagar cliente
            </Button>
          </>
        }
      />
    </>
  );
}

/** Compra fiado no histórico (com a venda de origem e se foi cancelada). */
function PurchaseEntry({ account, saleNumber }) {
  const cancelled = Boolean(account.cancelledAt);
  return (
    <li className={styles.row}>
      <ShoppingBag className={styles.entryIcon} size={22} aria-hidden="true" />
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>Comprou fiado</span>
        <span className={styles.rowMeta}>
          {formatDate(account.createdAt)}, às {formatTime(account.createdAt)}
          {saleNumber && (
            <>
              {' · '}
              <Link to={ROUTES.sale(account.saleId)}>Venda nº {saleNumber}</Link>
            </>
          )}
        </span>
        {cancelled && (
          <span className={styles.rowStatus}>
            <StatusPill status="cancelada" />
          </span>
        )}
      </span>
      <span className={cx(styles.value, cancelled && styles.struck)}>{formatBRL(account.originalCents)}</span>
    </li>
  );
}

/** Pagamento recebido no histórico, com "Desfazer" no último do dia. */
function PaymentEntry({ payment, canUndo, onUndo }) {
  const Icon = PAYMENT_ICONS[payment.method];
  const method = PAYMENT_METHODS[payment.method];
  return (
    <li className={styles.row}>
      <Icon className={cx(styles.entryIcon, styles.received)} size={22} aria-hidden="true" />
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>Pagou em {method.shortLabel ?? method.label}</span>
        <span className={styles.rowMeta}>
          {formatDate(payment.createdAt)}, às {formatTime(payment.createdAt)}
        </span>
        {payment.creditUsedCents > 0 && (
          <span className={styles.rowMeta}>Usou {formatBRL(payment.creditUsedCents)} de crédito</span>
        )}
        {payment.creditAddedCents > 0 && (
          <span className={styles.rowMeta}>{formatBRL(payment.creditAddedCents)} viraram crédito</span>
        )}
        {canUndo && (
          <Button variant="ghost" size="sm" icon={Undo2} onClick={onUndo} className={styles.undo}>
            Desfazer este recebimento
          </Button>
        )}
      </span>
      <span className={cx(styles.value, styles.receivedValue)}>+ {formatBRL(payment.amountCents)}</span>
    </li>
  );
}
