import { calcSaleTotals } from '@/domain/rules/sales.js';
import { cartLines, cartReducer, countItems, EMPTY_CART, tapQuantity, toSaleItems } from './cart-reducer.js';

const products = [
  { id: 'p1', name: 'Coxinha', emoji: '🍗', unit: 'un', priceCents: 600, active: true },
  { id: 'p2', name: 'Laranja', emoji: '🍊', unit: 'kg', priceCents: 599, active: true },
  { id: 'p3', name: 'Milho', emoji: '🌽', unit: 'un', priceCents: 500, active: false },
];

function reduce(...actions) {
  return actions.reduce(cartReducer, EMPTY_CART);
}

describe('carrinho', () => {
  it('um toque soma 1 un ou 1 kg; o mesmo produto fica numa linha só', () => {
    expect(tapQuantity('un')).toBe(1);
    expect(tapQuantity('kg')).toBe(1);
    expect(tapQuantity('g')).toBe(50);
    const cart = reduce(
      { type: 'cart/productAdded', productId: 'p1', quantity: 1 },
      { type: 'cart/productAdded', productId: 'p1', quantity: 1 },
    );
    expect(cart.items).toEqual([{ key: 'p1', productId: 'p1', quantity: 2 }]);
  });

  it('quantidade decimal sem resíduo e zero tira do carrinho', () => {
    let cart = reduce({ type: 'cart/productAdded', productId: 'p2', quantity: 0.1 });
    cart = cartReducer(cart, { type: 'cart/quantityChanged', key: 'p2', quantity: 0.1 + 0.2 });
    expect(cart.items[0].quantity).toBe(0.3);
    cart = cartReducer(cart, { type: 'cart/quantityChanged', key: 'p2', quantity: 0 });
    expect(cart.items).toEqual([]);
  });

  it('valor avulso entra como linha própria, com descrição opcional', () => {
    const cart = reduce(
      { type: 'cart/customAdded', unitPriceCents: 350, description: '  ' },
      { type: 'cart/customAdded', unitPriceCents: 200, description: 'Gelo' },
    );
    const lines = cartLines(cart.items, products);
    expect(lines.map((line) => [line.name, line.totalCents])).toEqual([
      ['Valor avulso', 350],
      ['Gelo', 200],
    ]);
    expect(toSaleItems(lines)).toEqual([
      { productId: null, quantity: 1, unitPriceCents: 350, description: '' },
      { productId: null, quantity: 1, unitPriceCents: 200, description: 'Gelo' },
    ]);
  });

  it('linhas usam o preço atual, somem se o produto saiu de venda e os totais vêm das regras', () => {
    const cart = reduce(
      { type: 'cart/productAdded', productId: 'p1', quantity: 2 },
      { type: 'cart/productAdded', productId: 'p2', quantity: 1.5 },
      { type: 'cart/productAdded', productId: 'p3', quantity: 1 },
      { type: 'cart/discountChanged', discount: { type: 'percentual', value: 10 } },
    );
    const lines = cartLines(cart.items, products);
    expect(lines.map((line) => line.totalCents)).toEqual([1200, 899]);
    expect(countItems(lines)).toBe(3);
    expect(calcSaleTotals(lines, cart.discount)).toEqual({
      subtotalCents: 2099,
      discountCents: 210,
      totalCents: 1889,
    });
  });

  it('desconto zerado é o mesmo que sem desconto', () => {
    const cart = reduce({ type: 'cart/discountChanged', discount: { type: 'valor', value: 0 } });
    expect(cart.discount).toBeNull();
  });

  it('"Desfazer" a venda só devolve os itens se nenhuma venda nova começou', () => {
    const sold = reduce({ type: 'cart/productAdded', productId: 'p1', quantity: 1 });
    expect(cartReducer(EMPTY_CART, { type: 'cart/restored', cart: sold })).toBe(sold);
    const newSale = reduce({ type: 'cart/productAdded', productId: 'p2', quantity: 1 });
    expect(cartReducer(newSale, { type: 'cart/restored', cart: sold })).toBe(newSale);
  });

  it('esvaziar volta ao carrinho vazio, e "Desfazer" volta ao anterior', () => {
    const cart = reduce(
      { type: 'cart/productAdded', productId: 'p1', quantity: 1 },
      { type: 'cart/noteChanged', note: 'sem cebola' },
      { type: 'cart/customerChanged', customerId: 'cli_1' },
    );
    const cleared = cartReducer(cart, { type: 'cart/cleared' });
    expect(cleared).toBe(EMPTY_CART);
    expect(cartReducer(cleared, { type: 'cart/replaced', cart })).toBe(cart);
  });
});
