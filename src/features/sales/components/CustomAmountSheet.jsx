import { useState } from 'react';
import { Plus } from 'lucide-react';
import { BottomSheet, Button, Input, MoneyInput } from '@/components/ui';
import styles from './SaleSheets.module.css';

/**
 * "Valor avulso": vender algo que não está cadastrado, digitando só o valor
 * (regra 1.1). A descrição é opcional. Remonte com `key` para começar zerado.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(input: { unitPriceCents: number, description: string }) => void} props.onAdd
 */
export function CustomAmountSheet({ open, onClose, onAdd }) {
  const [cents, setCents] = useState(0);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (!(cents > 0)) {
      setError('Digite o valor.');
      return;
    }
    onAdd({ unitPriceCents: cents, description });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Valor avulso"
      description="Para vender algo que não está cadastrado."
      size="sm"
      footer={
        <Button type="submit" form="valor-avulso" size="lg" icon={Plus}>
          Pôr no carrinho
        </Button>
      }
    >
      <form id="valor-avulso" className={styles.form} onSubmit={submit} noValidate>
        <MoneyInput
          label="Valor"
          value={cents}
          onChange={(value) => {
            setCents(value);
            setError('');
          }}
          keypad
          size="hero"
          error={error}
        />
        <Input
          label="O que é?"
          optional
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ex.: Salgado do dia"
          maxLength={60}
        />
      </form>
    </BottomSheet>
  );
}
