import { useState } from 'react';
import { Link } from 'react-router';
import { Info, Receipt } from 'lucide-react';
import { ROUTES } from '@/app/routes.js';
import { BottomSheet, Button, Chip, ChipGroup, Input, MoneyInput } from '@/components/ui';
import { EXPENSE_CATEGORIES, EXPENSE_METHODS } from '@/domain/constants.js';
import { validateExpense } from '@/domain/rules/cash.js';
import styles from './CashSheets.module.css';

/**
 * Lançar uma despesa (regra 6.3): categoria, valor no teclado próprio, de onde saiu o
 * dinheiro e uma descrição opcional. Ao escolher "Mercadoria", lembra que a compra para
 * revender é entrada de estoque, não despesa. Remonte com `key` ao abrir.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {boolean} [props.loading]
 * @param {(input: { category: string, amountCents: number, method: string, description: string }) => void} props.onConfirm
 */
export function ExpenseSheet({ open, onClose, loading, onConfirm }) {
  const [category, setCategory] = useState(null);
  const [amountCents, setAmountCents] = useState(0);
  const [method, setMethod] = useState('dinheiro');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});

  const submit = (event) => {
    event.preventDefault();
    const codes = validateExpense({ category, amountCents, method });
    if (codes.length > 0) {
      setErrors({
        category: codes.includes('categoria_invalida') ? 'Escolha com o que gastou.' : undefined,
        amount: codes.includes('valor_invalido') ? 'Digite quanto gastou.' : undefined,
      });
      return;
    }
    onConfirm({ category, amountCents, method, description: description.trim() });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Lançar despesa"
      description="Um gasto do negócio, como gasolina, gelo ou aluguel do ponto."
      footer={
        <Button type="submit" form="lancar-despesa" size="lg" icon={Receipt} loading={loading}>
          Lançar despesa
        </Button>
      }
    >
      <form id="lancar-despesa" className={styles.form} onSubmit={submit} noValidate>
        <fieldset
          className={styles.fieldset}
          aria-describedby={errors.category ? 'despesa-categoria-erro' : undefined}
        >
          <legend className={styles.legend}>Com o que gastou?</legend>
          <ChipGroup label="Categoria da despesa" wrap>
            {EXPENSE_CATEGORIES.map((option) => (
              <Chip
                key={option.value}
                selected={category === option.value}
                onClick={() => {
                  setCategory(option.value);
                  setErrors((current) => ({ ...current, category: undefined }));
                }}
              >
                <span aria-hidden="true">{option.emoji}</span> {option.label}
              </Chip>
            ))}
          </ChipGroup>
          {errors.category && (
            <p id="despesa-categoria-erro" className={styles.error} role="alert">
              {errors.category}
            </p>
          )}
        </fieldset>

        {category === 'mercadoria' && (
          <div className={styles.note} role="note">
            <Info size={22} aria-hidden="true" />
            <div>
              <p>
                <strong>Comprou mercadoria para revender?</strong> Dê entrada no estoque: o custo já entra no
                lucro quando você vende. Lançar aqui também contaria o gasto duas vezes.
              </p>
              <p>Aqui é só para o que não vira estoque, como gelo, sacolas e gás.</p>
              <Link to={ROUTES.inventory} className={styles.link}>
                Ir para o estoque
              </Link>
            </div>
          </div>
        )}

        <MoneyInput
          label="Quanto gastou?"
          value={amountCents}
          onChange={(value) => {
            setAmountCents(value);
            setErrors((current) => ({ ...current, amount: undefined }));
          }}
          keypad
          error={errors.amount}
        />

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>De onde saiu o dinheiro?</legend>
          <ChipGroup label="Forma de pagamento da despesa" wrap>
            {EXPENSE_METHODS.map((option) => (
              <Chip
                key={option.value}
                selected={method === option.value}
                onClick={() => setMethod(option.value)}
              >
                {option.label}
              </Chip>
            ))}
          </ChipGroup>
          <p className={styles.muted}>
            {method === 'dinheiro'
              ? 'Sai do dinheiro que deve ter na gaveta.'
              : 'Não mexe no dinheiro da gaveta, mas entra no lucro.'}
          </p>
        </fieldset>

        <Input
          label="O que foi?"
          optional
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ex.: gelo"
          maxLength={60}
          hint="Se deixar em branco, fica o nome da categoria."
        />
      </form>
    </BottomSheet>
  );
}
