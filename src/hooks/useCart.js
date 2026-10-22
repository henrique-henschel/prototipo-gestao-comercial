import { useContext, useMemo } from 'react';
import { calcSaleTotals } from '@/domain/rules/sales.js';
import { CartContext } from '@/store/cart-context.js';
import { cartLines, countItems } from '@/store/cart-reducer.js';
import { useDataState } from './useData.js';

/**
 * Carrinho da venda em andamento, com as linhas montadas a partir dos produtos atuais
 * e os totais calculados por `calcSaleTotals` (regras 1.2 a 1.4).
 * @example
 * const { lines, totals, itemCount, actions } = useCart();
 * actions.addProduct(product.id, 1);
 */
export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart precisa estar dentro de <CartProvider>.');
  const { products } = useDataState();
  const { cart, actions } = context;

  const lines = useMemo(() => cartLines(cart.items, products), [cart.items, products]);
  const totals = useMemo(() => calcSaleTotals(lines, cart.discount), [lines, cart.discount]);
  const itemCount = useMemo(() => countItems(lines), [lines]);

  return { cart, lines, totals, itemCount, isEmpty: lines.length === 0, actions };
}
