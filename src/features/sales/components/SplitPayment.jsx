import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import {
  BottomSheet,
  Button,
  Chip,
  ChipGroup,
  IconButton,
  MoneyInput,
  ProgressBar,
  Select,
} from '@/components/ui';
import { MAX_INSTALLMENTS, PAYMENT_METHODS } from '@/domain/constants.js';
import { formatBRL } from '@/domain/rules/money.js';
import { calcChange, paymentProgress } from '@/domain/rules/payments.js';
import { cx } from '@/lib/cx.js';
import { PAYMENT_ICONS } from '../paymentIcons.js';
import styles from './SplitPayment.module.css';
import sheetStyles from './SaleSheets.module.css';

/**
 * @typedef {object} PaymentPart parcela do pagamento dividido (o vencimento do fiado é da venda)
 * @property {string} key
 * @property {import('@/domain/models.js').PaymentMethod} method
 * @property {number} amountCents
 * @property {number} [receivedCents]
 * @property {number} [installments]
 */

/**
 * Pagamento dividido em várias formas: a soma tem que dar exatamente o total, e a barra
 * mostra quanto falta (regra 2.5). Só a parte em dinheiro pode ter troco.
 *
 * @param {object} props
 * @param {number} props.totalCents
 * @param {PaymentPart[]} props.parts
 * @param {import('@/domain/models.js').PaymentMethod[]} props.methods formas ativas
 * @param {(part: Omit<PaymentPart, 'key'>) => void} props.onAdd
 * @param {(key: string) => void} props.onRemove
 */
export function SplitPayment({ totalCents, parts, methods, onAdd, onRemove }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);
  const progress = paymentProgress(totalCents, parts);

  const openSheet = () => {
    setSheetKey((key) => key + 1);
    setSheetOpen(true);
  };

  return (
    <div className={styles.split}>
      <div className={styles.progress}>
        <p className={styles.progressText} aria-live="polite" aria-atomic="true">
          {progress.isComplete ? (
            <strong className={styles.done}>Pronto: a soma dá o total</strong>
          ) : (
            <>
              Falta <strong>{formatBRL(progress.remainingCents)}</strong>
            </>
          )}
        </p>
        <ProgressBar
          value={progress.paidCents}
          max={totalCents}
          label="Quanto já foi pago"
          valueText={`Já foi ${formatBRL(progress.paidCents)} de ${formatBRL(totalCents)}`}
          tone={progress.isComplete ? 'success' : 'primary'}
          size="lg"
        />
      </div>

      {parts.length > 0 && (
        <ul role="list" className={styles.parts} aria-label="Formas de pagamento escolhidas">
          {parts.map((part) => {
            const Icon = PAYMENT_ICONS[part.method];
            const changeCents =
              part.receivedCents !== undefined
                ? calcChange(part.receivedCents, part.amountCents).changeCents
                : 0;
            return (
              <li key={part.key} className={styles.part}>
                <Icon className={styles.partIcon} size={24} aria-hidden="true" />
                <span className={styles.partText}>
                  <span className={styles.partLabel}>
                    {PAYMENT_METHODS[part.method].label}
                    {part.installments > 1 && ` em ${part.installments}x`}
                  </span>
                  {changeCents > 0 && (
                    <span className={styles.partChange}>
                      Deu {formatBRL(part.receivedCents)}, troco de {formatBRL(changeCents)}
                    </span>
                  )}
                </span>
                <span className={styles.partValue}>{formatBRL(part.amountCents)}</span>
                <IconButton
                  label={`Tirar ${PAYMENT_METHODS[part.method].label}`}
                  icon={X}
                  onClick={() => onRemove(part.key)}
                />
              </li>
            );
          })}
        </ul>
      )}

      {!progress.isComplete && (
        <Button variant="secondary" icon={Plus} onClick={openSheet} size="lg">
          {parts.length === 0 ? 'Escolher a primeira forma' : 'Adicionar outra forma'}
        </Button>
      )}

      <AddPaymentSheet
        key={sheetKey}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        remainingCents={progress.remainingCents}
        methods={methods}
        onAdd={(part) => {
          onAdd(part);
          setSheetOpen(false);
        }}
      />
    </div>
  );
}

const INSTALLMENT_OPTIONS = Array.from({ length: MAX_INSTALLMENTS }, (_, index) => ({
  value: String(index + 1),
  label: index === 0 ? 'À vista' : `${index + 1} vezes`,
}));

/**
 * Uma parte do pagamento dividido: a forma e o valor. Em dinheiro, um valor acima
 * do que falta é o que o cliente entregou, e a diferença vira troco.
 */
function AddPaymentSheet({ open, onClose, remainingCents, methods, onAdd }) {
  const [method, setMethod] = useState(null);
  const [cents, setCents] = useState(0);
  const [installments, setInstallments] = useState(1);
  const [error, setError] = useState('');

  const isCash = method === 'dinheiro';
  const exceeds = cents > remainingCents;
  const changeCents = isCash && exceeds ? calcChange(cents, remainingCents).changeCents : 0;

  const submit = (event) => {
    event.preventDefault();
    if (!method) return setError('Escolha a forma de pagamento.');
    if (!(cents > 0)) return setError('Digite o valor.');
    if (exceeds && !isCash) return setError(`Passou do que falta. Falta só ${formatBRL(remainingCents)}.`);
    const part =
      isCash && exceeds
        ? { method, amountCents: remainingCents, receivedCents: cents }
        : { method, amountCents: cents, ...(method === 'credito' && { installments }) };
    return onAdd(part);
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Adicionar forma de pagamento"
      description={`Falta ${formatBRL(remainingCents)}.`}
      size="sm"
      footer={
        <Button type="submit" form="parte-pagamento" size="lg" icon={Check}>
          Adicionar
        </Button>
      }
    >
      <form id="parte-pagamento" className={sheetStyles.form} onSubmit={submit} noValidate>
        <fieldset className={sheetStyles.fieldset}>
          <legend className={sheetStyles.legend}>Como vai pagar esta parte?</legend>
          <div className={sheetStyles.methods}>
            {methods.map((key) => {
              const Icon = PAYMENT_ICONS[key];
              return (
                <button
                  key={key}
                  type="button"
                  className={cx(styles.method, method === key && styles.methodSelected)}
                  aria-pressed={method === key}
                  onClick={() => {
                    setMethod(key);
                    setError('');
                  }}
                >
                  <Icon size={24} aria-hidden="true" />
                  {PAYMENT_METHODS[key].shortLabel ?? PAYMENT_METHODS[key].label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {method && (
          <>
            <ChipGroup label="Atalho de valor" wrap>
              <Chip selected={cents === remainingCents} onClick={() => setCents(remainingCents)}>
                Tudo o que falta ({formatBRL(remainingCents)})
              </Chip>
            </ChipGroup>
            {changeCents > 0 && (
              <p className={sheetStyles.preview} aria-live="polite">
                <span>
                  Em dinheiro: <strong>{formatBRL(remainingCents)}</strong>
                </span>
                <span>
                  Troco: <strong>{formatBRL(changeCents)}</strong>
                </span>
              </p>
            )}
            <MoneyInput
              label={`Quanto em ${(PAYMENT_METHODS[method].shortLabel ?? PAYMENT_METHODS[method].label).toLowerCase()}?`}
              value={cents}
              onChange={(value) => {
                setCents(value);
                setError('');
              }}
              keypad
              size="hero"
              hint={isCash ? 'Pode digitar quanto o cliente deu: o troco é calculado.' : undefined}
            />
            {method === 'credito' && (
              <Select
                label="Em quantas vezes?"
                options={INSTALLMENT_OPTIONS}
                value={String(installments)}
                onChange={(event) => setInstallments(Number(event.target.value))}
              />
            )}
          </>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </form>
    </BottomSheet>
  );
}
