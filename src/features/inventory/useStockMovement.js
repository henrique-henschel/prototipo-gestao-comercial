import { useState } from 'react';
import { UNDO_WINDOW_MS, UNITS } from '@/domain/constants.js';
import { useProducts } from '@/hooks/useProducts.js';
import { useToast } from '@/hooks/useToast.js';
import { formatQuantity } from '@/lib/format.js';
import { MOVEMENT_UI, signedQuantity } from './movements.js';

/**
 * Grava uma entrada, contagem ou perda e mostra o aviso com "Desfazer" (5 segundos,
 * como na venda). Usado na lista do estoque (entrada rápida) e na tela do produto.
 * @returns {{ saving: boolean, save: (product: import('@/domain/models.js').Product,
 *   input: { type: 'entrada'|'ajuste'|'perda', quantity: number, unitCostCents?: number|null,
 *   reason?: string|null, note?: string }) => Promise<boolean> }}
 */
export function useStockMovement() {
  const { addStockMovement, undoStockMovement } = useProducts();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const undo = async (movementId) => {
    try {
      await undoStockMovement(movementId);
      toast.show({
        message: 'Movimentação desfeita',
        description: 'O estoque voltou a ser como era.',
        tone: 'info',
      });
    } catch (error) {
      toast.show({ message: error.message, tone: 'danger' });
    }
  };

  const save = async (product, input) => {
    setSaving(true);
    try {
      const { product: updated, movement } = await addStockMovement(product.id, input);
      const unit = UNITS[updated.unit]?.short ?? updated.unit;
      toast.show({
        message: MOVEMENT_UI[input.type].done,
        description: `${product.name}: ${signedQuantity(movement.delta, unit)}, agora tem ${formatQuantity(updated.quantity, unit)}`,
        action: { label: 'Desfazer', onClick: () => undo(movement.id) },
        duration: UNDO_WINDOW_MS,
      });
      return true;
    } catch (error) {
      toast.show({ message: error.message, tone: 'danger' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { saving, save };
}
