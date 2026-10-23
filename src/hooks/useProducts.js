import { useMemo } from 'react';
import { useDataActions, useDataState } from './useData.js';

/**
 * Produtos, movimentações de estoque e as ações de cadastro, movimentação e "Desfazer".
 * `activeProducts` são os que aparecem para vender.
 */
export function useProducts() {
  const { status, products, stockMovements } = useDataState();
  const { createProduct, updateProduct, addStockMovement, undoStockMovement } = useDataActions();
  const activeProducts = useMemo(() => products.filter((product) => product.active), [products]);
  return {
    status,
    products,
    activeProducts,
    stockMovements,
    createProduct,
    updateProduct,
    addStockMovement,
    undoStockMovement,
  };
}
