import { useState } from 'react';
import { Check, Trash } from 'lucide-react';
import {
  BottomSheet,
  Button,
  Chip,
  ChipGroup,
  MoneyInput,
  NumericKeypad,
  SegmentedControl,
} from '@/components/ui';
import { DISCOUNT_TYPES } from '@/domain/constants.js';
import { formatBRL } from '@/domain/rules/money.js';
import { calcSaleTotals } from '@/domain/rules/sales.js';
import styles from './SaleSheets.module.css';

const TYPE_OPTIONS = [
  { value: DISCOUNT_TYPES.VALOR, label: 'Em reais (R$)' },
  { value: DISCOUNT_TYPES.PERCENTUAL, label: 'Em por cento (%)' },
];
const PERCENT_SHORTCUTS = [5, 10, 15, 20];

/**
 * Desconto da venda em R$ ou em %, sempre pelo teclado numérico (regra 1.3).
 * O cálculo e os limites (nunca passa do subtotal nem de 100%) vêm de `calcSaleTotals`.
 * Remonte com `key` ao abrir, para partir do desconto atual.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {{ unitPriceCents: number, quantity: number }[]} props.lines
 * @param {import('@/domain/models.js').Discount|null} props.discount desconto atual
 * @param {(discount: import('@/domain/models.js').Discount|null) => void} props.onApply
 */
export function DiscountSheet({ open, onClose, lines, discount, onApply }) {
  const [type, setType] = useState(discount?.type ?? DISCOUNT_TYPES.VALOR);
  const [cents, setCents] = useState(discount?.type === DISCOUNT_TYPES.VALOR ? discount.value : 0);
  const [percent, setPercent] = useState(discount?.type === DISCOUNT_TYPES.PERCENTUAL ? discount.value : 0);

  const draft = { type, value: type === DISCOUNT_TYPES.VALOR ? cents : percent };
  const totals = calcSaleTotals(lines, draft);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Dar desconto"
      size="sm"
      footer={
        <>
          {discount && (
            <Button variant="secondary" icon={Trash} onClick={() => onApply(null)}>
              Tirar desconto
            </Button>
          )}
          <Button size="lg" icon={Check} onClick={() => onApply(draft)}>
            Aplicar desconto
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <SegmentedControl
          label="Tipo de desconto"
          options={TYPE_OPTIONS}
          value={type}
          onChange={setType}
          fullWidth
        />
        {type === DISCOUNT_TYPES.VALOR ? (
          <MoneyInput
            label="Desconto em reais"
            value={cents}
            onChange={setCents}
            max={totals.subtotalCents}
            keypad
            size="hero"
          />
        ) : (
          <PercentInput value={percent} onChange={setPercent} />
        )}
        <p className={styles.preview} aria-live="polite">
          <span>
            Desconto: <strong>{formatBRL(totals.discountCents)}</strong>
          </span>
          <span>
            Fica: <strong>{formatBRL(totals.totalCents)}</strong>
          </span>
        </p>
      </div>
    </BottomSheet>
  );
}

/** Porcentagem inteira de 0 a 100, com atalhos e o teclado numérico. */
function PercentInput({ value, onChange }) {
  const change = (next) => onChange(Math.min(100, Math.max(0, next)));

  return (
    <div className={styles.percent}>
      <span className={styles.percentLabel} id="desconto-percentual">
        Desconto em por cento
      </span>
      <output className={styles.percentValue} aria-labelledby="desconto-percentual" aria-live="polite">
        {value}%
      </output>
      <ChipGroup label="Atalhos de desconto" wrap>
        {PERCENT_SHORTCUTS.map((shortcut) => (
          <Chip key={shortcut} selected={value === shortcut} onClick={() => change(shortcut)}>
            {shortcut}%
          </Chip>
        ))}
      </ChipGroup>
      <NumericKeypad
        label="Teclado do desconto"
        onDigit={(digit) => change(Number(`${value}${digit}`.slice(-3)))}
        onBackspace={() => change(Math.floor(value / 10))}
        onClear={() => change(0)}
      />
    </div>
  );
}
