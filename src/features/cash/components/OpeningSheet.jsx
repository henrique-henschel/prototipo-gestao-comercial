import { useState } from 'react';
import { Check } from 'lucide-react';
import { BottomSheet, Button, MoneyInput } from '@/components/ui';
import styles from './CashSheets.module.css';

/**
 * Corrigir o troco inicial de um caixa aberto (regra 6.1). Remonte com `key` ao abrir.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {number} props.openingCents valor atual
 * @param {boolean} [props.loading]
 * @param {(openingCents: number) => void} props.onConfirm
 */
export function OpeningSheet({ open, onClose, openingCents, loading, onConfirm }) {
  const [value, setValue] = useState(openingCents);

  const submit = (event) => {
    event.preventDefault();
    onConfirm(value);
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Troco inicial"
      description="O dinheiro que já estava na gaveta quando você começou o dia."
      footer={
        <Button type="submit" form="troco-inicial" size="lg" icon={Check} loading={loading}>
          Salvar troco inicial
        </Button>
      }
    >
      <form id="troco-inicial" className={styles.form} onSubmit={submit} noValidate>
        <MoneyInput label="Quanto tinha na gaveta?" value={value} onChange={setValue} keypad />
      </form>
    </BottomSheet>
  );
}
