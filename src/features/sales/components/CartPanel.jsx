import { useMemo, useState } from 'react';
import { Percent, StickyNote, Trash, TriangleAlert, X } from 'lucide-react';
import { Button, EmptyState, IconButton, QuantityStepper, Textarea } from '@/components/ui';
import { DISCOUNT_TYPES, UNITS } from '@/domain/constants.js';
import { formatBRL } from '@/domain/rules/money.js';
import { findStockShortages } from '@/domain/rules/stock.js';
import { useCart } from '@/hooks/useCart.js';
import { useToast } from '@/hooks/useToast.js';
import { formatNumber, plural } from '@/lib/format.js';
import { cx } from '@/lib/cx.js';
import { DiscountSheet } from './DiscountSheet.jsx';
import styles from './CartPanel.module.css';

/** "R$ 6,00 cada", "R$ 5,99 o kg". */
function unitPriceLabel(line) {
  if (line.unit === 'un' || !line.productId) return `${formatBRL(line.unitPriceCents)} cada`;
  return `${formatBRL(line.unitPriceCents)} o ${UNITS[line.unit]?.short ?? line.unit}`;
}

/**
 * Conteúdo do carrinho: itens com quantidade, desconto, observação e totais.
 * Tirar um item ou limpar tudo oferece "Desfazer" em vez de pedir confirmação.
 * O botão "Cobrar" fica com quem usa o painel (coluna no computador, janela no celular).
 */
export function CartPanel() {
  const { cart, lines, totals, itemCount, isEmpty, actions } = useCart();
  const toast = useToast();
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountKey, setDiscountKey] = useState(0);
  const [noteOpen, setNoteOpen] = useState(Boolean(cart.note));

  const shortages = useMemo(() => {
    const products = lines.flatMap((line) => (line.product ? [line.product] : []));
    return new Map(findStockShortages(lines, products).map((shortage) => [shortage.productId, shortage]));
  }, [lines]);

  const removeWithUndo = (message, change) => {
    const snapshot = cart;
    change();
    toast.show({
      message,
      tone: 'info',
      action: { label: 'Desfazer', onClick: () => actions.replace(snapshot) },
    });
  };

  const changeQuantity = (line, quantity) => {
    if (quantity > 0) actions.setQuantity(line.key, quantity);
    else removeWithUndo(`${line.name} saiu do carrinho`, () => actions.removeItem(line.key));
  };

  if (isEmpty) {
    return (
      <EmptyState
        compact
        emoji="🛒"
        title="O carrinho está vazio"
        description="Toque nos produtos para pôr na venda."
      />
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <p className={styles.count}>{plural(itemCount, 'item', 'itens')}</p>
        <Button
          variant="ghost"
          size="sm"
          icon={Trash}
          onClick={() => removeWithUndo('O carrinho foi esvaziado', actions.clear)}
        >
          Limpar
        </Button>
      </div>

      <ul role="list" className={styles.lines} aria-label="Itens do carrinho">
        {lines.map((line) => {
          const unit = UNITS[line.unit] ?? UNITS.un;
          const shortage = line.productId && shortages.get(line.productId);
          return (
            <li key={line.key} className={cx(styles.line, 'enter')}>
              <span className={styles.emoji} aria-hidden="true">
                {line.emoji ?? '🧮'}
              </span>
              <div className={styles.info}>
                <p className={styles.name}>{line.name}</p>
                <p className={styles.unitPrice}>{unitPriceLabel(line)}</p>
                {shortage && (
                  <p className={styles.shortage}>
                    <TriangleAlert size={16} aria-hidden="true" />
                    {shortage.available > 0
                      ? `Só tem ${formatNumber(shortage.available)} no estoque`
                      : 'Acabou no estoque'}
                  </p>
                )}
              </div>
              <div className={styles.controls}>
                {line.productId ? (
                  <QuantityStepper
                    size="sm"
                    label={`Quantidade de ${line.name}`}
                    value={line.quantity}
                    onChange={(quantity) => changeQuantity(line, quantity)}
                    step={unit.step}
                    unit={line.unit === 'un' ? undefined : unit.short}
                  />
                ) : (
                  <IconButton label={`Tirar ${line.name}`} icon={X} onClick={() => changeQuantity(line, 0)} />
                )}
                <p className={styles.lineTotal}>{formatBRL(line.totalCents)}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className={styles.extras}>
        <Button
          variant="secondary"
          size="sm"
          icon={Percent}
          onClick={() => {
            setDiscountKey((key) => key + 1);
            setDiscountOpen(true);
          }}
        >
          {cart.discount ? 'Mudar desconto' : 'Dar desconto'}
        </Button>
        {!noteOpen && (
          <Button variant="secondary" size="sm" icon={StickyNote} onClick={() => setNoteOpen(true)}>
            Observação
          </Button>
        )}
      </div>
      {noteOpen && (
        <Textarea
          label="Observação"
          optional
          rows={2}
          maxLength={200}
          value={cart.note}
          onChange={(event) => actions.setNote(event.target.value)}
          placeholder="Ex.: sem cebola, entregar às 15h"
        />
      )}

      <dl className={styles.totals}>
        {totals.discountCents > 0 && (
          <>
            <div className={styles.totalRow}>
              <dt>Subtotal</dt>
              <dd>{formatBRL(totals.subtotalCents)}</dd>
            </div>
            <div className={styles.totalRow}>
              <dt>
                Desconto
                {cart.discount?.type === DISCOUNT_TYPES.PERCENTUAL && ` (${cart.discount.value}%)`}
              </dt>
              <dd className={styles.discount}>{formatBRL(-totals.discountCents)}</dd>
            </div>
          </>
        )}
        <div className={styles.grandTotal}>
          <dt>Total</dt>
          <dd aria-live="polite" aria-atomic="true">
            {formatBRL(totals.totalCents)}
          </dd>
        </div>
      </dl>

      <DiscountSheet
        key={discountKey}
        open={discountOpen}
        onClose={() => setDiscountOpen(false)}
        lines={lines}
        discount={cart.discount}
        onApply={(discount) => {
          actions.setDiscount(discount);
          setDiscountOpen(false);
        }}
      />
    </div>
  );
}
