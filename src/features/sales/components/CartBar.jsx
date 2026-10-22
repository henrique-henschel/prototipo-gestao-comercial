import { ArrowRight, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatBRL } from '@/domain/rules/money.js';
import { plural } from '@/lib/format.js';
import styles from './CartBar.module.css';

/**
 * Barra fixa do carrinho no celular, logo acima da barra de navegação:
 * "3 itens · R$ 25,00" abre o carrinho, e "Cobrar" segue para o pagamento.
 *
 * @param {object} props
 * @param {number} props.itemCount
 * @param {number} props.totalCents
 * @param {() => void} props.onOpenCart
 * @param {() => void} props.onCheckout
 */
export function CartBar({ itemCount, totalCents, onOpenCart, onCheckout }) {
  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <button type="button" className={styles.summary} onClick={onOpenCart}>
          <ShoppingCart size={24} strokeWidth={2.25} aria-hidden="true" />
          <span className={styles.text}>
            <span className={styles.count}>
              <span className="visually-hidden">Ver carrinho: </span>
              {plural(itemCount, 'item', 'itens')}
            </span>
            <span className={styles.total} aria-live="polite" aria-atomic="true">
              {formatBRL(totalCents)}
            </span>
          </span>
        </button>
        <Button size="lg" iconRight={ArrowRight} onClick={onCheckout} className={styles.checkout}>
          Cobrar
        </Button>
      </div>
    </div>
  );
}
