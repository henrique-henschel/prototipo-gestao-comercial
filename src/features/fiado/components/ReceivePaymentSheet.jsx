import { useMemo, useState } from 'react';
import { CircleCheck, Info, PiggyBank, Wallet } from 'lucide-react';
import { BottomSheet, Button, Chip, ChipGroup, MoneyInput } from '@/components/ui';
import { PAYMENT_METHOD_KEYS, PAYMENT_METHODS } from '@/domain/constants.js';
import { accountBalance, customerFiadoSummary, receiveFiado } from '@/domain/rules/fiado.js';
import { formatBRL } from '@/domain/rules/money.js';
import { formatDate } from '@/lib/format.js';
import { cx } from '@/lib/cx.js';
import { PAYMENT_ICONS } from '@/features/sales/paymentIcons.js';
import styles from './ReceivePaymentSheet.module.css';

/**
 * Receber pagamento de fiado (regra 3.8): valor no teclado próprio, forma de pagamento
 * (qualquer uma ativa, menos fiado) e a prévia de quais compras o valor quita, das mais
 * antigas para as mais novas. O crédito que o cliente já tinha entra junto (regra 3.5).
 * Um valor acima do que deve só vira crédito com o botão "Receber e guardar crédito".
 * Remonte com `key` ao abrir, para começar zerado.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {import('@/domain/models.js').Customer} props.customer
 * @param {import('@/domain/models.js').FiadoAccount[]} props.accounts contas do cliente
 * @param {Record<string, boolean>} props.enabledMethods `settings.paymentMethods`
 * @param {boolean} [props.loading]
 * @param {(input: { amountCents: number, method: string }) => void} props.onConfirm
 */
export function ReceivePaymentSheet({
  open,
  onClose,
  customer,
  accounts,
  enabledMethods,
  loading,
  onConfirm,
}) {
  const methods = PAYMENT_METHOD_KEYS.filter((key) => key !== 'fiado' && enabledMethods[key]);
  const [amountCents, setAmountCents] = useState(0);
  const [method, setMethod] = useState(methods[0] ?? null);
  const [error, setError] = useState('');

  const summary = customerFiadoSummary(customer, accounts);
  const dueCents = Math.max(summary.balanceCents, 0);
  const result = useMemo(
    () => (amountCents > 0 ? receiveFiado(accounts, customer, amountCents) : null),
    [accounts, customer, amountCents],
  );
  const byId = new Map(accounts.map((account) => [account.id, account]));
  const remainingCents = Math.max(dueCents - amountCents, 0);
  const firstName = customer.name.split(' ')[0];

  const submit = (event) => {
    event.preventDefault();
    if (!(amountCents > 0)) {
      setError('Digite quanto está pagando.');
      return;
    }
    if (!method) {
      setError('Ligue uma forma de pagamento nos Ajustes.');
      return;
    }
    onConfirm({ amountCents, method });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`Receber de ${firstName}`}
      description={`Deve ${formatBRL(dueCents)}. O pagamento quita primeiro as compras mais antigas.`}
      footer={
        <Button
          type="submit"
          form="receber-fiado"
          size="lg"
          variant="primary"
          icon={Wallet}
          loading={loading}
        >
          {result?.creditAddedCents > 0
            ? 'Receber e guardar crédito'
            : `Receber ${amountCents > 0 ? formatBRL(amountCents) : ''}`.trim()}
        </Button>
      }
    >
      <form id="receber-fiado" className={styles.form} onSubmit={submit} noValidate>
        <ChipGroup label="Atalhos de valor" wrap>
          <Chip selected={amountCents === dueCents} onClick={() => setAmountCents(dueCents)}>
            Tudo: {formatBRL(dueCents)}
          </Chip>
        </ChipGroup>

        <MoneyInput
          label="Quanto está pagando?"
          value={amountCents}
          onChange={(value) => {
            setAmountCents(value);
            setError('');
          }}
          keypad
          size="hero"
          error={error}
        />

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Como pagou?</legend>
          <ChipGroup label="Forma de pagamento" wrap>
            {methods.map((key) => (
              <Chip
                key={key}
                icon={PAYMENT_ICONS[key]}
                selected={method === key}
                onClick={() => setMethod(key)}
              >
                {PAYMENT_METHODS[key].shortLabel ?? PAYMENT_METHODS[key].label}
              </Chip>
            ))}
          </ChipGroup>
        </fieldset>

        <div className={styles.preview} aria-live="polite">
          {result && (
            <>
              <h3 className={styles.previewTitle}>O que este pagamento faz</h3>
              <ul role="list" className={styles.allocations}>
                {result.creditUsedCents > 0 && (
                  <li className={styles.allocation}>
                    <PiggyBank size={20} aria-hidden="true" />
                    <span>Usa {formatBRL(result.creditUsedCents)} do crédito que já tinha</span>
                  </li>
                )}
                {result.allocations.map((allocation) => {
                  const account = byId.get(allocation.accountId);
                  const settles = allocation.amountCents === accountBalance(account);
                  return (
                    <li key={allocation.accountId} className={styles.allocation}>
                      <CircleCheck
                        size={20}
                        aria-hidden="true"
                        className={cx(settles ? styles.success : styles.partial)}
                      />
                      <span>
                        {settles ? 'Quita a compra' : `Abate ${formatBRL(allocation.amountCents)} da compra`}{' '}
                        de {formatDate(account.createdAt)}
                        {settles
                          ? ` (${formatBRL(allocation.amountCents)})`
                          : `: ficam ${formatBRL(accountBalance(account) - allocation.amountCents)}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {result.creditAddedCents > 0 ? (
                <div className={cx(styles.note, styles.warning)}>
                  <Info size={20} aria-hidden="true" />
                  <div className={styles.noteText}>
                    <p>
                      Passou <strong>{formatBRL(result.creditAddedCents)}</strong> do que {firstName} deve.
                      Esse valor vira crédito para a próxima compra.
                    </p>
                    <p>Se você vai dar troco, receba só o que deve.</p>
                    <Button variant="secondary" size="sm" onClick={() => setAmountCents(dueCents)}>
                      Receber só {formatBRL(dueCents)}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className={styles.after}>
                  {remainingCents > 0 ? (
                    <>
                      Depois disso, {firstName} ainda deve <strong>{formatBRL(remainingCents)}</strong>.
                    </>
                  ) : (
                    <>Fica tudo pago!</>
                  )}
                </p>
              )}
            </>
          )}
        </div>
      </form>
    </BottomSheet>
  );
}
