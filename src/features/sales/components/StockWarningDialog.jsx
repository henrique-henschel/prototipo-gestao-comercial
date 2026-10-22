import { ArrowLeft, ArrowRight, PackageX } from 'lucide-react';
import { Button, Dialog } from '@/components/ui';
import { formatNumber } from '@/lib/format.js';
import styles from './SaleDialogs.module.css';

/**
 * Aviso antes de cobrar quando falta estoque (regra 1.9). Por padrão o vendedor pode
 * continuar; com "Bloquear venda sem estoque" ligado nos Ajustes, só pode voltar e ajustar.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {ReturnType<typeof import('@/domain/rules/stock.js').findStockShortages>} props.shortages
 * @param {boolean} props.blocked
 * @param {() => void} props.onClose
 * @param {() => void} props.onContinue
 */
export function StockWarningDialog({ open, shortages, blocked, onClose, onContinue }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={blocked ? 'Falta mercadoria no estoque' : 'O estoque não dá para tudo'}
      description={
        blocked
          ? 'A venda sem estoque está bloqueada nos Ajustes. Diminua a quantidade ou faça uma entrada de mercadoria.'
          : 'Pelo que está anotado, não tem o suficiente. Se a mercadoria está aí, pode vender assim mesmo.'
      }
      footer={
        <>
          <Button variant="secondary" icon={ArrowLeft} onClick={onClose}>
            Voltar e ajustar
          </Button>
          {!blocked && (
            <Button iconRight={ArrowRight} onClick={onContinue}>
              Vender assim mesmo
            </Button>
          )}
        </>
      }
    >
      <ul role="list" className={styles.list}>
        {shortages.map((shortage) => (
          <li key={shortage.productId} className={styles.item}>
            <PackageX className={styles.danger} size={22} aria-hidden="true" />
            <span>
              <strong>{shortage.name}</strong>: vai vender {formatNumber(shortage.requested)} e{' '}
              {shortage.available > 0 ? `só tem ${formatNumber(shortage.available)}` : 'não tem nenhum'}.
            </span>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
