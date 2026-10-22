import { useDataActions, useDataState } from './useData.js';

/**
 * Vendas e as ações de vender, desfazer e cancelar.
 * @example
 * const { sales, createSale } = useSales();
 * const { sale } = await createSale({ items, payments });
 */
export function useSales() {
  const { status, sales } = useDataState();
  const { createSale, undoSale, cancelSale } = useDataActions();
  return { status, sales, createSale, undoSale, cancelSale };
}
