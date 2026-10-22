import { StatusPill } from '@/components/ui';
import { UNITS } from '@/domain/constants.js';
import { formatBRL } from '@/domain/rules/money.js';
import { stockStatus } from '@/domain/rules/stock.js';
import { formatNumber } from '@/lib/format.js';
import { cx } from '@/lib/cx.js';
import styles from './ProductTile.module.css';

/**
 * Card grande de produto na tela de vender: emoji na cor do produto, nome, preço
 * e, quando precisa de atenção, a situação do estoque. Um toque adiciona ao carrinho.
 *
 * @param {object} props
 * @param {import('@/domain/models.js').Product} props.product
 * @param {number} [props.inCart] quantidade já no carrinho
 * @param {() => void} props.onAdd
 */
export function ProductTile({ product, inCart = 0, onAdd }) {
  const status = stockStatus(product);
  const unit = UNITS[product.unit];
  const perUnit = product.unit === 'un' ? '' : ` / ${unit?.short ?? product.unit}`;

  return (
    <button
      type="button"
      className={cx(styles.tile, inCart > 0 && styles.selected)}
      data-color={product.color}
      onClick={onAdd}
    >
      <span className={styles.art} aria-hidden="true">
        <span className={styles.emoji}>{product.emoji}</span>
      </span>
      <span className={styles.name}>{product.name}</span>
      <span className={styles.price}>
        {formatBRL(product.priceCents)}
        {perUnit && <span className={styles.unit}>{perUnit}</span>}
      </span>
      {(status === 'acabando' || status === 'acabou') && (
        <StatusPill status={status} className={styles.status} />
      )}
      {inCart > 0 && (
        <span key={inCart} className={styles.count}>
          {formatNumber(inCart)}
          <span className="visually-hidden"> no carrinho</span>
        </span>
      )}
    </button>
  );
}

/**
 * Card de "Valor avulso", o primeiro da grade: vender algo que não está cadastrado.
 * @param {{ onClick: () => void }} props
 */
export function CustomAmountTile({ onClick }) {
  return (
    <button type="button" className={cx(styles.tile, styles.custom)} onClick={onClick}>
      <span className={styles.art} aria-hidden="true">
        <span className={styles.emoji}>🧮</span>
      </span>
      <span className={styles.name}>Valor avulso</span>
      <span className={styles.hint}>Digitar um valor</span>
    </button>
  );
}
