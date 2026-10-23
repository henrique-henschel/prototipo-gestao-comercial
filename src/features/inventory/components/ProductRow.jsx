import { Link } from 'react-router';
import { ChevronRight, PackagePlus } from 'lucide-react';
import { ROUTES } from '@/app/routes.js';
import { Badge, Button, Card, StatusPill } from '@/components/ui';
import { PRODUCT_CATEGORIES, UNITS } from '@/domain/constants.js';
import { formatBRL } from '@/domain/rules/money.js';
import { stockStatus } from '@/domain/rules/stock.js';
import { formatQuantity } from '@/lib/format.js';
import styles from './ProductRow.module.css';

/**
 * Um produto na lista do estoque: emoji na cor do card, preço, quanto tem e a situação.
 * O nome abre o produto; "Entrada" registra mercadoria que chegou sem sair da lista.
 *
 * @param {object} props
 * @param {import('@/domain/models.js').Product} props.product
 * @param {() => void} props.onEntry
 */
export function ProductRow({ product, onEntry }) {
  const status = stockStatus(product);
  const unit = UNITS[product.unit]?.short ?? product.unit;
  const category = PRODUCT_CATEGORIES.find((c) => c.value === product.category)?.label;
  const perUnit = product.unit === 'un' ? '' : ` / ${unit}`;

  return (
    <Card padding="sm" className={styles.row}>
      <Link to={ROUTES.product(product.id)} className={styles.link}>
        <span
          className={styles.art}
          style={{ '--art-color': `var(--product-${product.color})` }}
          aria-hidden="true"
        >
          {product.emoji}
        </span>
        <span className={styles.text}>
          <span className={styles.name}>{product.name}</span>
          <span className={styles.meta}>
            {formatBRL(product.priceCents)}
            {perUnit}
            {category && ` · ${category}`}
          </span>
        </span>
        <ChevronRight className={styles.chevron} size={22} aria-hidden="true" />
      </Link>
      <div className={styles.footer}>
        <span className={styles.stock}>
          {product.trackStock ? (
            <span className={styles.quantity}>
              <span className="visually-hidden">Tem </span>
              {formatQuantity(product.quantity, unit)}
            </span>
          ) : (
            <span className={styles.untracked}>Sem controle de estoque</span>
          )}
          {status && status !== 'ok' && <StatusPill status={status} />}
          {!product.active && <Badge>Fora da venda</Badge>}
        </span>
        {product.trackStock && (
          <Button variant="secondary" size="sm" icon={PackagePlus} onClick={onEntry}>
            Entrada<span className="visually-hidden"> de {product.name}</span>
          </Button>
        )}
      </div>
    </Card>
  );
}
