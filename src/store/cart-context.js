import { createContext } from 'react';

/**
 * Carrinho da venda em andamento (`CartProvider`). Fica na área logada, junto dos dados:
 * a venda montada não se perde quando o vendedor abre outra tela no meio dela.
 *
 * @typedef {import('./cart-reducer.js').Cart} Cart
 *
 * @typedef {object} CartActions
 * @property {(productId: string, quantity: number) => void} addProduct
 * @property {(input: { unitPriceCents: number, description?: string }) => void} addCustom
 * @property {(key: string, quantity: number) => void} setQuantity quantidade 0 tira do carrinho
 * @property {(key: string) => void} removeItem
 * @property {(discount: import('@/domain/models.js').Discount|null) => void} setDiscount
 * @property {(note: string) => void} setNote
 * @property {(customerId: string|null) => void} setCustomer
 * @property {() => void} clear
 * @property {(cart: Cart) => void} replace volta a um carrinho anterior ("Desfazer" ao tirar um item)
 * @property {(cart: Cart) => void} restore devolve uma venda desfeita, se o carrinho estiver vazio
 */

/** @type {import('react').Context<{ cart: Cart, actions: CartActions } | null>} */
export const CartContext = createContext(null);
