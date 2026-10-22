import { Link } from 'react-router';
import { Copy, Info, Settings, UserRound } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ROUTES } from '@/app/routes.js';
import {
  Avatar,
  Button,
  Chip,
  ChipGroup,
  DateShortcuts,
  MoneyInput,
  SegmentedControl,
  Select,
  SpeakButton,
  StatusPill,
} from '@/components/ui';
import { FIADO_DUE_SHORTCUTS, MAX_INSTALLMENTS } from '@/domain/constants.js';
import { formatBRL } from '@/domain/rules/money.js';
import { calcChange, calcFee, feeRate, suggestCashAmounts } from '@/domain/rules/payments.js';
import { useToast } from '@/hooks/useToast.js';
import { formatNumber } from '@/lib/format.js';
import { cx } from '@/lib/cx.js';
import styles from './PaymentMethods.module.css';

/**
 * Detalhes de cada forma de pagamento na tela de cobrar (seção 2 de docs/regras-de-negocio.md).
 * Cada bloco só mostra e coleta dados; quem monta as parcelas é o `PaymentPanel`.
 */

/**
 * Troco em destaque, com "Ouvir". Sem valor recebido, explica que dá para concluir direto.
 * @param {{ dueCents: number, receivedCents: number }} props
 */
export function ChangeDisplay({ dueCents, receivedCents }) {
  if (!(receivedCents > 0)) {
    return (
      <p className={styles.note}>
        <Info size={20} aria-hidden="true" />
        Se o cliente deu o valor certo, é só concluir.
      </p>
    );
  }
  const { changeCents, missingCents } = calcChange(receivedCents, dueCents);
  if (missingCents > 0) {
    return (
      <div className={cx(styles.change, styles.missing)} aria-live="polite" aria-atomic="true">
        <span className={styles.changeLabel}>Ainda faltam</span>
        <span className={styles.changeValue}>{formatBRL(missingCents)}</span>
      </div>
    );
  }
  return (
    <div className={styles.change} aria-live="polite" aria-atomic="true">
      <span className={styles.changeLabel}>{changeCents > 0 ? 'Troco' : 'Sem troco'}</span>
      <span className={styles.changeValue}>{formatBRL(changeCents)}</span>
      {changeCents > 0 && <SpeakButton text={`Troco: ${formatBRL(changeCents)}`} className={styles.speak} />}
    </div>
  );
}

/**
 * Dinheiro: quanto o cliente deu (teclado próprio + atalhos de cédulas) e o troco. Regra 2.1.
 * @param {{ totalCents: number, receivedCents: number, onChange: (cents: number) => void }} props
 */
export function CashPayment({ totalCents, receivedCents, onChange }) {
  const shortcuts = suggestCashAmounts(totalCents);
  return (
    <div className={styles.method}>
      <ChipGroup label="Atalhos de valor recebido" wrap>
        {shortcuts.map((value, index) => (
          <Chip key={value} selected={receivedCents === value} onClick={() => onChange(value)}>
            {index === 0 ? 'Valor certo' : formatBRL(value)}
          </Chip>
        ))}
      </ChipGroup>
      <ChangeDisplay dueCents={totalCents} receivedCents={receivedCents} />
      <MoneyInput
        label="Quanto o cliente deu?"
        value={receivedCents}
        onChange={onChange}
        keypad
        size="hero"
      />
    </div>
  );
}

/**
 * Pix: QR e chave do negócio (simulados). O vendedor confirma com "Recebi o Pix". Regra 2.2.
 * @param {{ totalCents: number, pixKey: string, businessName?: string }} props
 */
export function PixPayment({ totalCents, pixKey, businessName }) {
  const toast = useToast();

  if (!pixKey) {
    return (
      <div className={styles.method}>
        <p className={cx(styles.note, styles.warning)}>
          <Info size={20} aria-hidden="true" />
          Você ainda não cadastrou sua chave Pix. Sem ela, não dá para mostrar o QR. Se o cliente já pagou,
          pode concluir.
        </p>
        <Button as={Link} to={ROUTES.settings} variant="secondary" icon={Settings}>
          Cadastrar chave Pix
        </Button>
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pixKey);
      toast.show({ message: 'Chave Pix copiada', tone: 'success' });
    } catch {
      toast.show({ message: 'Não deu para copiar. Leia a chave para o cliente.', tone: 'warning' });
    }
  };

  return (
    <div className={cx(styles.method, styles.pix)}>
      <figure className={styles.qr}>
        <QRCodeSVG
          value={`PIX|${pixKey}|${businessName ?? ''}|${totalCents}`}
          size={208}
          marginSize={2}
          title={`QR do Pix de ${formatBRL(totalCents)}`}
        />
        <figcaption className={styles.qrCaption}>
          Peça para o cliente apontar a câmera do banco para o QR e pagar {formatBRL(totalCents)}.
        </figcaption>
      </figure>
      <div className={styles.pixKey}>
        <span className={styles.pixKeyLabel}>Ou passe a chave Pix:</span>
        <strong className={styles.pixKeyValue}>{pixKey}</strong>
        <Button variant="secondary" size="sm" icon={Copy} onClick={copy}>
          Copiar chave
        </Button>
      </div>
    </div>
  );
}

const INSTALLMENT_OPTIONS = Array.from({ length: MAX_INSTALLMENTS - 1 }, (_, index) => ({
  value: String(index + 2),
  label: `${index + 2} vezes`,
}));

/**
 * Taxa da maquininha: é custo do vendedor e não muda o valor cobrado. Regra 2.3.
 * @param {{ payment: { method: string, amountCents: number, installments?: number }, fees: object }} props
 */
export function FeeNote({ payment, fees }) {
  const rate = feeRate(payment, fees);
  if (!(rate > 0)) return null;
  return (
    <p className={styles.note}>
      <Info size={20} aria-hidden="true" />
      <span>
        A maquininha cobra {formatBRL(calcFee(payment, fees))} ({formatNumber(rate)}%). Isso sai do seu lucro:
        o cliente paga {formatBRL(payment.amountCents)}.
      </span>
    </p>
  );
}

/**
 * Cartão de débito ou de crédito (à vista ou parcelado, só informativo). Regra 2.3.
 * @param {{ method: 'debito'|'credito', totalCents: number, fees: object, installments: number,
 *   onInstallmentsChange: (installments: number) => void }} props
 */
export function CardPayment({ method, totalCents, fees, installments, onInstallmentsChange }) {
  const isCredit = method === 'credito';
  return (
    <div className={styles.method}>
      <p className={styles.instructions}>
        Passe o cartão de {isCredit ? 'crédito' : 'débito'} na maquininha no valor de{' '}
        <strong>{formatBRL(totalCents)}</strong>. Quando aparecer <strong>aprovado</strong>, toque no botão
        abaixo.
      </p>
      {isCredit && (
        <>
          <SegmentedControl
            label="Como vai passar no crédito"
            options={[
              { value: 'avista', label: 'À vista' },
              { value: 'parcelado', label: 'Parcelado' },
            ]}
            value={installments > 1 ? 'parcelado' : 'avista'}
            onChange={(value) => onInstallmentsChange(value === 'parcelado' ? 2 : 1)}
            fullWidth
          />
          {installments > 1 && (
            <Select
              label="Em quantas vezes?"
              options={INSTALLMENT_OPTIONS}
              value={String(installments)}
              onChange={(event) => onInstallmentsChange(Number(event.target.value))}
            />
          )}
        </>
      )}
      <FeeNote payment={{ method, amountCents: totalCents, installments }} fees={fees} />
    </div>
  );
}

/**
 * Fiado: quem compra (com a situação atual) e quando vai pagar. Regras 3.1, 3.2 e 3.7.
 * @param {{ customer: import('@/domain/models.js').Customer|null,
 *   summary: ReturnType<typeof import('@/domain/rules/fiado.js').customerFiadoSummary>|null,
 *   dueDate: string, onDueDateChange: (date: string) => void, onPickCustomer: () => void }} props
 */
export function FiadoDetails({ customer, summary, dueDate, onDueDateChange, onPickCustomer }) {
  return (
    <div className={styles.method}>
      {customer ? (
        <div className={styles.customer}>
          <Avatar name={customer.name} />
          <div className={styles.customerText}>
            <p className={styles.customerName}>{customer.name}</p>
            <p className={styles.customerFacts}>
              {summary && summary.openCents > 0 ? `Já deve ${formatBRL(summary.openCents)}` : 'Não deve nada'}
              {customer.creditLimitCents != null && ` · limite de ${formatBRL(customer.creditLimitCents)}`}
            </p>
          </div>
          {customer.fiadoBlocked ? (
            <StatusPill status="bloqueado" />
          ) : (
            summary && summary.openCents > 0 && <StatusPill status={summary.status} />
          )}
        </div>
      ) : (
        <div className={cx(styles.note, styles.warning)}>
          <UserRound size={20} aria-hidden="true" />
          <span>Para vender fiado, escolha quem está comprando.</span>
        </div>
      )}
      {!customer && (
        <Button variant="accent" icon={UserRound} onClick={onPickCustomer}>
          Escolher cliente
        </Button>
      )}
      <DateShortcuts
        label="Quando vai pagar?"
        value={dueDate}
        onChange={onDueDateChange}
        shortcuts={FIADO_DUE_SHORTCUTS}
      />
    </div>
  );
}
