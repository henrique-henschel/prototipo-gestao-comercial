import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { BottomSheet, Button, Chip, ChipGroup, Input, MoneyInput, QuantityInput } from '@/components/ui';
import { LOSS_REASONS, UNITS } from '@/domain/constants.js';
import { previewMovement, validateMovement } from '@/domain/rules/stock.js';
import { formatQuantity } from '@/lib/format.js';
import { cx } from '@/lib/cx.js';
import { MOVEMENT_UI, signedQuantity } from '../movements.js';
import styles from './StockMovementSheet.module.css';

/** Atalhos de quantidade: caixas e fardos comuns, ou frações para kg e litro. */
const SHORTCUTS = { inteiro: [6, 12, 24], decimal: [0.5, 1, 5] };

const QUANTITY_LABEL = {
  entrada: 'Quantos chegaram?',
  ajuste: 'Quantos tem agora, contando?',
  perda: 'Quantos perdeu?',
};

/**
 * Entrada de mercadoria, contagem (ajuste) ou perda com motivo (regra 5.3), com a prévia
 * de como o estoque fica. Na entrada, o custo por unidade já vem preenchido e, se mudar,
 * atualiza o custo do produto. Remonte com `key` ao abrir.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {import('@/domain/models.js').Product} props.product
 * @param {'entrada'|'ajuste'|'perda'} props.type
 * @param {boolean} [props.loading]
 * @param {(input: { type: string, quantity: number, unitCostCents?: number|null,
 *   reason?: string|null, note: string }) => void} props.onConfirm
 */
export function StockMovementSheet({ open, onClose, product, type, loading, onConfirm }) {
  const [quantity, setQuantity] = useState(0);
  const [costCents, setCostCents] = useState(product.costCents ?? 0);
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});

  const unit = UNITS[product.unit];
  const short = unit?.short ?? product.unit;
  const ui = MOVEMENT_UI[type];
  const preview = previewMovement(product, type, quantity);
  const shortcuts = unit?.decimal ? SHORTCUTS.decimal : SHORTCUTS.inteiro;

  const submit = (event) => {
    event.preventDefault();
    const codes = validateMovement({ type, quantity, reason });
    if (codes.length > 0) {
      setErrors({
        quantity: codes.includes('quantidade_invalida') ? 'Digite a quantidade.' : undefined,
        reason: codes.includes('motivo_obrigatorio') ? 'Escolha o motivo.' : undefined,
      });
      return;
    }
    onConfirm({
      type,
      quantity,
      unitCostCents: type === 'entrada' ? costCents || null : null,
      reason: type === 'perda' ? reason : null,
      note: note.trim(),
    });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`${ui.title}: ${product.name}`}
      description={`Tem agora ${formatQuantity(product.quantity, short)}.`}
      footer={
        <Button type="submit" form="movimento-estoque" size="lg" icon={ui.icon} loading={loading}>
          {type === 'entrada' ? 'Dar entrada' : type === 'ajuste' ? 'Salvar contagem' : 'Registrar perda'}
        </Button>
      }
    >
      <form id="movimento-estoque" className={styles.form} onSubmit={submit} noValidate>
        {type !== 'ajuste' && (
          <ChipGroup label="Atalhos de quantidade" wrap>
            {shortcuts.map((value) => (
              <Chip key={value} selected={quantity === value} onClick={() => setQuantity(value)}>
                {formatQuantity(value, short)}
              </Chip>
            ))}
          </ChipGroup>
        )}

        <QuantityInput
          label={QUANTITY_LABEL[type]}
          value={quantity}
          onChange={(value) => {
            setQuantity(value);
            setErrors((current) => ({ ...current, quantity: undefined }));
          }}
          unit={product.unit}
          keypad
          error={errors.quantity}
          hint={unit?.decimal ? 'Sem vírgula: 1, 5, 0, 0 vira 1,500.' : undefined}
        />

        <p className={cx(styles.preview, styles[ui.tone])} aria-live="polite">
          <span>{formatQuantity(product.quantity, short)}</span>
          <ArrowRight size={20} aria-hidden="true" />
          <strong>{formatQuantity(preview.balanceAfter, short)}</strong>
          <span className={styles.delta}>({signedQuantity(preview.delta, short)})</span>
          <span className="visually-hidden">depois de salvar</span>
        </p>

        {type === 'entrada' && (
          <MoneyInput
            label="Quanto pagou em cada um?"
            optional
            value={costCents}
            onChange={setCostCents}
            size="md"
            hint="Se o preço de compra mudou, o custo do produto é atualizado."
          />
        )}

        {type === 'perda' && (
          <fieldset className={styles.fieldset} aria-describedby={errors.reason ? 'perda-erro' : undefined}>
            <legend className={styles.legend}>O que aconteceu?</legend>
            <ChipGroup label="Motivo da perda" wrap>
              {LOSS_REASONS.map((option) => (
                <Chip
                  key={option.value}
                  selected={reason === option.value}
                  onClick={() => {
                    setReason(option.value);
                    setErrors((current) => ({ ...current, reason: undefined }));
                  }}
                >
                  {option.label}
                </Chip>
              ))}
            </ChipGroup>
            {errors.reason && (
              <p id="perda-erro" className={styles.error} role="alert">
                {errors.reason}
              </p>
            )}
          </fieldset>
        )}

        <Input
          label="Observação"
          optional
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={
            type === 'entrada' ? 'Ex.: Atacadão' : type === 'perda' ? 'Ex.: caiu no chão' : undefined
          }
          maxLength={80}
        />
      </form>
    </BottomSheet>
  );
}
