import { useState } from 'react';
import { Link } from 'react-router';
import { ROUTES } from '@/app/routes.js';
import { Button, EmptyState } from '@/components/ui';
import { LOSS_REASONS, STOCK_MOVEMENT_TYPES } from '@/domain/constants.js';
import { formatBRL } from '@/domain/rules/money.js';
import { formatDate, formatQuantity, formatTime } from '@/lib/format.js';
import { cx } from '@/lib/cx.js';
import { MOVEMENT_UI, signedQuantity } from '../movements.js';
import styles from './MovementHistory.module.css';

const PAGE_SIZE = 15;

/**
 * Histórico imutável das movimentações de um produto (regra 5.3), da mais nova para a
 * mais antiga: o que mudou, com quanto ficou, o custo da entrada, o motivo da perda e a
 * venda de origem.
 *
 * @param {object} props
 * @param {import('@/domain/models.js').StockMovement[]} props.movements só as do produto
 * @param {string} props.unitShort
 * @param {Map<string, number>} props.saleNumbers id da venda → número
 */
export function MovementHistory({ movements, unitShort, saleNumbers }) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const ordered = [...movements].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (ordered.length === 0) {
    return (
      <EmptyState
        compact
        emoji="🗒️"
        title="Nenhuma movimentação ainda"
        description="Entradas, vendas, contagens e perdas aparecem aqui."
      />
    );
  }

  return (
    <>
      <ul role="list" className={styles.list} aria-label="Movimentações do estoque">
        {ordered.slice(0, limit).map((movement) => {
          const ui = MOVEMENT_UI[movement.type];
          const Icon = ui.icon;
          const saleNumber = movement.saleId && saleNumbers.get(movement.saleId);
          const reason = LOSS_REASONS.find((r) => r.value === movement.reason)?.label;
          return (
            <li key={movement.id} className={styles.item}>
              <Icon className={cx(styles.icon, styles[ui.tone])} size={22} aria-hidden="true" />
              <span className={styles.text}>
                <span className={styles.title}>{STOCK_MOVEMENT_TYPES[movement.type].label}</span>
                <span className={styles.meta}>
                  {formatDate(movement.createdAt)}, às {formatTime(movement.createdAt)}
                  {saleNumber && (
                    <>
                      {' · '}
                      <Link to={ROUTES.sale(movement.saleId)}>Venda nº {saleNumber}</Link>
                    </>
                  )}
                </span>
                {reason && <span className={styles.meta}>Motivo: {reason}</span>}
                {movement.unitCostCents != null && (
                  <span className={styles.meta}>Custo: {formatBRL(movement.unitCostCents)} cada</span>
                )}
                {movement.note && <span className={styles.meta}>{movement.note}</span>}
              </span>
              <span className={styles.values}>
                <span className={cx(styles.delta, movement.delta < 0 && styles.out)}>
                  {signedQuantity(movement.delta, unitShort)}
                </span>
                <span className={styles.meta}>ficou {formatQuantity(movement.balanceAfter, unitShort)}</span>
              </span>
            </li>
          );
        })}
      </ul>
      {ordered.length > limit && (
        <Button variant="secondary" onClick={() => setLimit((current) => current + PAGE_SIZE)}>
          Mostrar mais ({ordered.length - limit} restantes)
        </Button>
      )}
    </>
  );
}
