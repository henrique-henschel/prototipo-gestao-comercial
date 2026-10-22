import { UNITS } from '@/domain/constants.js';
import { lineTotal } from '@/domain/rules/sales.js';
import { roundQuantity } from '@/domain/rules/stock.js';
import { createId } from '@/lib/id.js';

/**
 * Carrinho da venda em andamento (estado da interface, ainda não gravado).
 * Guarda só o que o vendedor escolheu; nome, preço e estoque vêm sempre do produto
 * atual, e os totais são calculados por `domain/rules/sales.js`.
 *
 * @typedef {import('@/domain/models.js').Discount} Discount
 * @typedef {import('@/domain/models.js').Product} Product
 *
 * @typedef {object} CartItem
 * @property {string} key um por produto; valores avulsos têm chave própria
 * @property {string|null} productId nulo = valor avulso
 * @property {number} quantity
 * @property {number} [unitPriceCents] só valor avulso
 * @property {string} [description] só valor avulso
 *
 * @typedef {object} Cart
 * @property {CartItem[]} items
 * @property {Discount|null} discount
 * @property {string} note
 * @property {string|null} customerId
 */

/** @type {Cart} */
export const EMPTY_CART = { items: [], discount: null, note: '', customerId: null };

/**
 * Quanto um toque no produto acrescenta: 1 nas unidades fracionadas (1 kg, 1 L)
 * e o passo da unidade nas inteiras (1 un, 50 g).
 * @param {import('@/domain/models.js').Unit} unit
 */
export function tapQuantity(unit) {
  const config = UNITS[unit] ?? UNITS.un;
  return config.decimal ? 1 : config.step;
}

/**
 * @param {Cart} cart
 * @param {{ type: string, [key: string]: any }} action
 * @returns {Cart}
 */
export function cartReducer(cart, action) {
  switch (action.type) {
    case 'cart/productAdded': {
      const { productId, quantity } = action;
      const exists = cart.items.some((item) => item.productId === productId);
      const items = exists
        ? cart.items.map((item) =>
            item.productId === productId
              ? { ...item, quantity: roundQuantity(item.quantity + quantity) }
              : item,
          )
        : [...cart.items, { key: productId, productId, quantity }];
      return { ...cart, items };
    }
    case 'cart/customAdded': {
      const item = {
        key: createId('avulso'),
        productId: null,
        quantity: 1,
        unitPriceCents: action.unitPriceCents,
        description: action.description?.trim() ?? '',
      };
      return { ...cart, items: [...cart.items, item] };
    }
    case 'cart/quantityChanged': {
      const quantity = roundQuantity(action.quantity);
      const items =
        quantity > 0
          ? cart.items.map((item) => (item.key === action.key ? { ...item, quantity } : item))
          : cart.items.filter((item) => item.key !== action.key);
      return { ...cart, items };
    }
    case 'cart/itemRemoved':
      return { ...cart, items: cart.items.filter((item) => item.key !== action.key) };
    case 'cart/discountChanged':
      return { ...cart, discount: action.discount?.value > 0 ? action.discount : null };
    case 'cart/noteChanged':
      return { ...cart, note: action.note };
    case 'cart/customerChanged':
      return { ...cart, customerId: action.customerId };
    case 'cart/cleared':
      return EMPTY_CART;
    case 'cart/replaced':
      return action.cart;
    case 'cart/restored':
      // "Desfazer" devolve a venda ao carrinho só se nenhuma venda nova começou.
      return cart.items.length === 0 ? action.cart : cart;
    default:
      throw new Error(`Ação desconhecida: ${action.type}`);
  }
}

/**
 * Linhas do carrinho prontas para exibir, com os dados atuais de cada produto.
 * Produtos que deixaram de existir ou de estar à venda saem da lista.
 * @param {CartItem[]} items
 * @param {Product[]} products
 */
export function cartLines(items, products) {
  const byId = new Map(products.map((product) => [product.id, product]));
  return items.flatMap((item) => {
    if (!item.productId) {
      const unitPriceCents = item.unitPriceCents ?? 0;
      return [
        {
          ...item,
          product: null,
          name: item.description || 'Valor avulso',
          emoji: null,
          unit: 'un',
          unitPriceCents,
          totalCents: unitPriceCents,
        },
      ];
    }
    const product = byId.get(item.productId);
    if (!product?.active) return [];
    return [
      {
        ...item,
        product,
        name: product.name,
        emoji: product.emoji,
        unit: product.unit,
        unitPriceCents: product.priceCents,
        totalCents: lineTotal({ unitPriceCents: product.priceCents, quantity: item.quantity }),
      },
    ];
  });
}

/**
 * Quantidade de itens para o resumo ("3 itens"): produtos por peso ou volume contam como um.
 * @param {{ unit: string, quantity: number }[]} lines
 */
export function countItems(lines) {
  return lines.reduce((total, line) => total + (UNITS[line.unit]?.decimal ? 1 : line.quantity), 0);
}

/**
 * Itens no formato de `createSale` (`SaleItemInput`).
 * @param {ReturnType<typeof cartLines>} lines
 */
export function toSaleItems(lines) {
  return lines.map((line) =>
    line.productId
      ? { productId: line.productId, quantity: line.quantity }
      : { productId: null, quantity: 1, unitPriceCents: line.unitPriceCents, description: line.description },
  );
}
