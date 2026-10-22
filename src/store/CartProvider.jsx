import { useMemo, useReducer, useState } from 'react';
import { CartContext } from './cart-context.js';
import { cartReducer, EMPTY_CART } from './cart-reducer.js';

/**
 * Guarda o carrinho da venda em andamento. Consumo pelo hook `useCart` (`src/hooks/`),
 * que junta o carrinho aos produtos atuais e calcula os totais.
 */
export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, EMPTY_CART);
  // As ações dependem só de `dispatch`, que é estável: são criadas uma vez por montagem.
  const [actions] = useState(() => ({
    addProduct: (productId, quantity) => dispatch({ type: 'cart/productAdded', productId, quantity }),
    addCustom: ({ unitPriceCents, description }) =>
      dispatch({ type: 'cart/customAdded', unitPriceCents, description }),
    setQuantity: (key, quantity) => dispatch({ type: 'cart/quantityChanged', key, quantity }),
    removeItem: (key) => dispatch({ type: 'cart/itemRemoved', key }),
    setDiscount: (discount) => dispatch({ type: 'cart/discountChanged', discount }),
    setNote: (note) => dispatch({ type: 'cart/noteChanged', note }),
    setCustomer: (customerId) => dispatch({ type: 'cart/customerChanged', customerId }),
    clear: () => dispatch({ type: 'cart/cleared' }),
    replace: (snapshot) => dispatch({ type: 'cart/replaced', cart: snapshot }),
    restore: (snapshot) => dispatch({ type: 'cart/restored', cart: snapshot }),
  }));
  const value = useMemo(() => ({ cart, actions }), [cart, actions]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
