import { useState } from 'react';
import { Ban, Info } from 'lucide-react';
import { Button, Dialog, Textarea } from '@/components/ui';
import { CANCEL_REASONS } from '@/domain/constants.js';
import { formatBRL } from '@/domain/rules/money.js';
import styles from './SaleDialogs.module.css';

/**
 * Cancelar uma venda (regra 1.8): exige o motivo e explica o que vai acontecer
 * (estoque de volta, fiado cancelado, pago virando crédito). É a única confirmação
 * da venda, porque o cancelamento não pode ser desfeito. Remonte com `key` ao abrir.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {import('@/domain/models.js').Sale} props.sale
 * @param {number} props.refundCents quanto do fiado desta venda já foi pago (vira crédito)
 * @param {string|null} [props.customerName]
 * @param {boolean} [props.loading]
 * @param {() => void} props.onClose
 * @param {(input: { reason: string, note: string }) => void} props.onConfirm
 */
export function CancelSaleDialog({ open, sale, refundCents, customerName, loading, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const hasStock = sale.items.some((item) => item.productId);
  const hasFiado = sale.payments.some((payment) => payment.method === 'fiado');

  const submit = (event) => {
    event.preventDefault();
    if (!reason) {
      setError('Escolha o motivo.');
      return;
    }
    onConfirm({ reason, note });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={`Cancelar a venda nº ${sale.number}?`}
      description="A venda continua no histórico, marcada como cancelada, e sai das contas do dia."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Não cancelar
          </Button>
          <Button type="submit" form="cancelar-venda" variant="danger" icon={Ban} loading={loading}>
            Cancelar venda
          </Button>
        </>
      }
    >
      <form id="cancelar-venda" className={styles.form} onSubmit={submit} noValidate>
        <fieldset className={styles.reasons} aria-describedby={error ? 'motivo-erro' : undefined}>
          <legend className={styles.reasonsLegend}>Por que vai cancelar?</legend>
          {CANCEL_REASONS.map((option) => (
            <label key={option.value} className={styles.reason}>
              <input
                type="radio"
                name="motivo"
                value={option.value}
                checked={reason === option.value}
                onChange={() => {
                  setReason(option.value);
                  setError('');
                }}
              />
              {option.label}
            </label>
          ))}
          {error && (
            <p id="motivo-erro" className={styles.danger} role="alert">
              {error}
            </p>
          )}
        </fieldset>
        <Textarea
          label="Quer explicar melhor?"
          optional
          rows={2}
          maxLength={200}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <ul role="list" className={styles.list}>
          {hasStock && (
            <li className={styles.notice}>
              <Info size={20} aria-hidden="true" />
              <span>Os produtos voltam para o estoque.</span>
            </li>
          )}
          {hasFiado && (
            <li className={styles.notice}>
              <Info size={20} aria-hidden="true" />
              <span>
                O fiado desta venda é cancelado.
                {refundCents > 0 &&
                  ` ${customerName ?? 'O cliente'} já tinha pago ${formatBRL(refundCents)}: isso vira crédito para a próxima compra.`}
              </span>
            </li>
          )}
        </ul>
      </form>
    </Dialog>
  );
}
