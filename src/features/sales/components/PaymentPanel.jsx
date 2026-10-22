import { useMemo, useState } from 'react';
import { Check, Gift, Split, UserRound } from 'lucide-react';
import { Avatar, Button, SpeakButton } from '@/components/ui';
import { PAYMENT_METHOD_KEYS, PAYMENT_METHODS } from '@/domain/constants.js';
import { customerFiadoSummary, dueDateIn, fiadoAlerts } from '@/domain/rules/fiado.js';
import { formatBRL } from '@/domain/rules/money.js';
import { amountByMethod, validatePayments } from '@/domain/rules/payments.js';
import { requiresCustomer } from '@/domain/rules/sales.js';
import { useCustomers } from '@/hooks/useCustomers.js';
import { useFiado } from '@/hooks/useFiado.js';
import { today } from '@/lib/date.js';
import { createId } from '@/lib/id.js';
import { plural } from '@/lib/format.js';
import { cx } from '@/lib/cx.js';
import { PAYMENT_ICONS } from '../paymentIcons.js';
import { CustomerPicker } from './CustomerPicker.jsx';
import { FiadoAlertDialog } from './FiadoAlertDialog.jsx';
import { CardPayment, CashPayment, FiadoDetails, PixPayment } from './PaymentMethods.jsx';
import { SplitPayment } from './SplitPayment.jsx';
import styles from './PaymentPanel.module.css';

const SPLIT = 'dividido';

/** Texto do botão de concluir, no vocabulário de cada forma. */
const CONFIRM_LABEL = {
  dinheiro: 'Concluir venda',
  pix: 'Recebi o Pix',
  debito: 'Cartão aprovado',
  credito: 'Cartão aprovado',
  fiado: 'Anotar no fiado',
  [SPLIT]: 'Concluir venda',
};

/**
 * Cobrar: escolha da forma de pagamento (ou várias), troco, Pix, cartão e fiado.
 * Monta as parcelas no formato de `createSale` e confere tudo com as regras de
 * `domain/rules` antes de liberar o botão de concluir.
 *
 * @param {object} props
 * @param {number} props.totalCents
 * @param {number} props.itemCount
 * @param {string|null} props.customerId
 * @param {(customerId: string|null) => void} props.onCustomerChange
 * @param {import('@/domain/models.js').Settings} props.settings
 * @param {import('@/domain/models.js').Business|null} props.business
 * @param {boolean} props.submitting
 * @param {(payments: import('@/services/sales.service.js').PaymentInput[]) => void} props.onConfirm
 */
export function PaymentPanel({
  totalCents,
  itemCount,
  customerId,
  onCustomerChange,
  settings,
  business,
  submitting,
  onConfirm,
}) {
  const { customers } = useCustomers();
  const { accounts } = useFiado();
  const methods = PAYMENT_METHOD_KEYS.filter((key) => settings.paymentMethods[key]);

  const [choice, setChoice] = useState(methods.length === 1 ? methods[0] : null);
  const [receivedCents, setReceivedCents] = useState(0);
  const [installments, setInstallments] = useState(1);
  const [dueDate, setDueDate] = useState(() => dueDateIn(settings.fiadoDefaultDays));
  const [parts, setParts] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  const [alert, setAlert] = useState(null);

  const customer = customers.find((c) => c.id === customerId) ?? null;
  const summary = useMemo(
    () => (customer ? customerFiadoSummary(customer, accounts, today()) : null),
    [customer, accounts],
  );
  const isGift = totalCents === 0;

  /** Parcelas no formato do serviço (troco e taxa são calculados por ele). */
  const payments = useMemo(() => {
    if (isGift || !choice) return [];
    if (choice === SPLIT) {
      return parts.map(({ key: _key, ...part }) => (part.method === 'fiado' ? { ...part, dueDate } : part));
    }
    const payment = { method: choice, amountCents: totalCents };
    if (choice === 'dinheiro' && receivedCents > 0) payment.receivedCents = receivedCents;
    if (choice === 'credito') payment.installments = installments;
    if (choice === 'fiado') payment.dueDate = dueDate;
    return [payment];
  }, [isGift, choice, parts, dueDate, totalCents, receivedCents, installments]);

  const problems = [
    ...(isGift ? [] : validatePayments(totalCents, payments, settings)),
    ...(requiresCustomer(payments) && !customer ? ['cliente_obrigatorio'] : []),
    ...(!isGift && !choice ? ['sem_pagamento'] : []),
  ];
  const hasFiado = requiresCustomer(payments) || choice === 'fiado';

  const openPicker = () => {
    setPickerKey((key) => key + 1);
    setPickerOpen(true);
  };

  const confirm = () => {
    if (problems.length > 0) return;
    const fiadoCents = amountByMethod(payments, 'fiado');
    if (fiadoCents > 0 && customer) {
      const result = fiadoAlerts(customer, accounts, fiadoCents, today());
      if (result.alerts.length > 0) {
        setAlert(result);
        return;
      }
    }
    onConfirm(payments);
  };

  const confirmLabel = isGift ? 'Confirmar brinde' : (CONFIRM_LABEL[choice] ?? 'Concluir venda');

  return (
    <div className={styles.panel}>
      <section className={styles.total} aria-label="Total a pagar">
        <p className={styles.totalLabel}>Total a pagar · {plural(itemCount, 'item', 'itens')}</p>
        <p className={styles.totalValue}>{formatBRL(totalCents)}</p>
        <SpeakButton text={`Total: ${formatBRL(totalCents)}`} className={styles.speak} />
      </section>

      <section className={styles.customerRow} aria-label="Cliente">
        {customer ? <Avatar name={customer.name} size="sm" /> : <UserRound size={24} aria-hidden="true" />}
        <p className={styles.customerText}>
          <span className={styles.customerLabel}>Cliente</span>
          <span className={styles.customerName}>
            {customer ? customer.name : hasFiado ? 'Escolha quem compra' : 'Nenhum (opcional)'}
          </span>
        </p>
        <Button variant={hasFiado && !customer ? 'accent' : 'secondary'} size="sm" onClick={openPicker}>
          {customer ? 'Trocar' : 'Escolher'}
        </Button>
      </section>

      {isGift ? (
        <div className={styles.gift}>
          <Gift size={28} aria-hidden="true" />
          <p>
            Com o desconto, esta venda ficou <strong>de graça</strong>. Confirme se é um brinde.
          </p>
        </div>
      ) : (
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Como o cliente vai pagar?</legend>
          <div className={styles.methods}>
            {methods.map((key) => {
              const Icon = PAYMENT_ICONS[key];
              return (
                <button
                  key={key}
                  type="button"
                  className={cx(
                    styles.method,
                    choice === key && styles.selected,
                    key === 'fiado' && styles.fiado,
                  )}
                  aria-pressed={choice === key}
                  onClick={() => setChoice(key)}
                >
                  <Icon size={28} strokeWidth={2.25} aria-hidden="true" />
                  <span>{PAYMENT_METHODS[key].label}</span>
                </button>
              );
            })}
            {methods.length > 1 && (
              <button
                type="button"
                className={cx(styles.method, styles.splitMethod, choice === SPLIT && styles.selected)}
                aria-pressed={choice === SPLIT}
                onClick={() => setChoice(SPLIT)}
              >
                <Split size={28} strokeWidth={2.25} aria-hidden="true" />
                <span>Dividir em mais de uma forma</span>
              </button>
            )}
          </div>
        </fieldset>
      )}

      {!isGift && choice && (
        <section className={styles.details} aria-label="Detalhes do pagamento">
          {choice === 'dinheiro' && (
            <CashPayment totalCents={totalCents} receivedCents={receivedCents} onChange={setReceivedCents} />
          )}
          {choice === 'pix' && (
            <PixPayment totalCents={totalCents} pixKey={settings.pixKey} businessName={business?.name} />
          )}
          {(choice === 'debito' || choice === 'credito') && (
            <CardPayment
              method={choice}
              totalCents={totalCents}
              fees={settings.fees}
              installments={installments}
              onInstallmentsChange={setInstallments}
            />
          )}
          {choice === 'fiado' && (
            <FiadoDetails
              customer={customer}
              summary={summary}
              dueDate={dueDate}
              onDueDateChange={setDueDate}
              onPickCustomer={openPicker}
            />
          )}
          {choice === SPLIT && (
            <SplitPayment
              totalCents={totalCents}
              parts={parts}
              methods={methods}
              onAdd={(part) => setParts((current) => [...current, { key: createId('parte'), ...part }])}
              onRemove={(key) => setParts((current) => current.filter((part) => part.key !== key))}
            />
          )}
          {choice === SPLIT && requiresCustomer(payments) && (
            <FiadoDetails
              customer={customer}
              summary={summary}
              dueDate={dueDate}
              onDueDateChange={setDueDate}
              onPickCustomer={openPicker}
            />
          )}
        </section>
      )}

      <Button
        size="hero"
        fullWidth
        icon={Check}
        variant={choice === 'fiado' ? 'accent' : 'primary'}
        disabled={problems.length > 0}
        loading={submitting}
        onClick={confirm}
        className={styles.confirm}
      >
        {confirmLabel}
      </Button>

      <CustomerPicker
        key={pickerKey}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedId={customerId}
        onSelect={(id) => {
          onCustomerChange(id);
          setPickerOpen(false);
        }}
      />
      <FiadoAlertDialog
        open={Boolean(alert)}
        customerName={customer?.name ?? ''}
        result={alert}
        loading={submitting}
        onClose={() => setAlert(null)}
        onConfirm={() => {
          setAlert(null);
          onConfirm(payments);
        }}
      />
    </div>
  );
}
