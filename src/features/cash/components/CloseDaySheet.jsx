import { useState } from 'react';
import { Lock } from 'lucide-react';
import { BottomSheet, Button, Input, MoneyInput } from '@/components/ui';
import { closingDifference } from '@/domain/rules/cash.js';
import { formatBRL } from '@/domain/rules/money.js';
import { ClosingResult } from './ClosingResult.jsx';
import styles from './CashSheets.module.css';

/**
 * Fechar o dia (regra 6.5): o vendedor conta o dinheiro da gaveta e vê na hora se sobrou
 * ou faltou. Remonte com `key` ao abrir.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {number} props.expectedCents dinheiro esperado na gaveta
 * @param {boolean} [props.loading]
 * @param {(input: { countedCents: number, note: string }) => void} props.onConfirm
 */
export function CloseDaySheet({ open, onClose, expectedCents, loading, onConfirm }) {
  const [countedCents, setCountedCents] = useState(0);
  const [touched, setTouched] = useState(false);
  const [note, setNote] = useState('');
  const closing = closingDifference(countedCents, expectedCents);

  const submit = (event) => {
    event.preventDefault();
    onConfirm({ countedCents, note: note.trim() });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Fechar o dia"
      description={`Conte o dinheiro da gaveta. Deve ter ${formatBRL(expectedCents)}.`}
      footer={
        <Button type="submit" form="fechar-dia" size="lg" icon={Lock} loading={loading}>
          Fechar o dia
        </Button>
      }
    >
      <form id="fechar-dia" className={styles.form} onSubmit={submit} noValidate>
        {/* Acima do teclado, para o resultado não sair da tela no celular. */}
        <div aria-live="polite" className={styles.closing}>
          {touched ? (
            <ClosingResult result={closing.result} differenceCents={closing.differenceCents} />
          ) : (
            <p className={styles.muted}>Digite quanto contou para ver se sobrou ou faltou.</p>
          )}
        </div>

        <MoneyInput
          label="Quanto dinheiro tem na gaveta?"
          value={countedCents}
          onChange={(value) => {
            setCountedCents(value);
            setTouched(true);
          }}
          keypad
          hint="Conte as notas e as moedas, sem o Pix e o cartão."
        />

        <Input
          label="Observação"
          optional
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ex.: acho que errei um troco"
          maxLength={80}
        />
      </form>
    </BottomSheet>
  );
}
