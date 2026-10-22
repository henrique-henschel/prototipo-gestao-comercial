import { useMemo } from 'react';
import { useDataActions, useDataState } from './useData.js';

/**
 * Produtos, movimentações de estoque e as ações de cadastro e movimentação.
 * `activeProducts` são os que aparecem para vender.
 */
export function useProducts() {
  const { status, products, stockMovements } = useDataState();
  const { createProduct, updateProduct, addStockMovement } = useDataActions();
  const activeProducts = useMemo(() => products.filter((product) => product.active), [products]);
  return { status, products, activeProducts, stockMovements, createProduct, updateProduct, addStockMovement };
}
