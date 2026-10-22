import { act, renderHook, waitFor } from '@testing-library/react';
import { useDataStatus } from '@/hooks/useData.js';
import { useFiado } from '@/hooks/useFiado.js';
import { useProducts } from '@/hooks/useProducts.js';
import { useSales } from '@/hooks/useSales.js';
import { useSettings } from '@/hooks/useSettings.js';
import { resetDemo } from '@/mocks/db.js';
import { configureApi } from '@/services/api.js';
import { DataProvider } from './DataProvider.jsx';
import { INITIAL_DATA_STATE } from './data-context.js';
import { dataReducer, upsertBy } from './data-reducer.js';

function useAll() {
  return {
    status: useDataStatus(),
    products: useProducts(),
    sales: useSales(),
    fiado: useFiado(),
    settings: useSettings(),
  };
}

async function renderReady() {
  const view = renderHook(useAll, { wrapper: DataProvider });
  await waitFor(() => expect(view.result.current.status.status).toBe('ready'));
  return view;
}

beforeEach(() => {
  resetDemo();
  configureApi({ failing: false });
});

describe('DataProvider', () => {
  it('carrega os dados de exemplo e calcula o fiado', async () => {
    const { result } = await renderReady();
    expect(result.current.products.products.length).toBeGreaterThan(20);
    expect(result.current.sales.sales.length).toBeGreaterThan(300);
    expect(result.current.fiado.debtors[0].status).toBe('atrasado');
    expect(result.current.fiado.indicators.receivableCents).toBeGreaterThan(0);
  });

  it('registra uma venda e atualiza vendas e estoque juntos', async () => {
    const { result } = await renderReady();
    const product = result.current.products.activeProducts.find((p) => p.trackStock && p.quantity > 2);
    const before = result.current.sales.sales.length;

    await act(() =>
      result.current.sales.createSale({
        items: [{ productId: product.id, quantity: 1 }],
        payments: [{ method: 'pix', amountCents: product.priceCents }],
      }),
    );

    expect(result.current.sales.sales).toHaveLength(before + 1);
    const updated = result.current.products.products.find((p) => p.id === product.id);
    expect(updated.quantity).toBe(product.quantity - 1);
  });

  it('desfaz a atualização otimista quando o serviço falha', async () => {
    const { result } = await renderReady();
    const product = result.current.products.products[0];
    configureApi({ failing: true });

    let promise;
    act(() => {
      promise = result.current.products.updateProduct(product.id, { name: 'Nome novo' });
    });
    expect(result.current.products.products[0].name).toBe('Nome novo');
    await act(() => expect(promise).rejects.toMatchObject({ code: 'rede' }));
    expect(result.current.products.products[0].name).toBe(product.name);
  });

  it('mostra o erro de carregamento e tenta de novo', async () => {
    configureApi({ failing: true });
    const { result } = renderHook(useAll, { wrapper: DataProvider });
    await waitFor(() => expect(result.current.status.status).toBe('error'));
    expect(result.current.status.error.message).toMatch(/internet/);

    configureApi({ failing: false });
    await act(() => result.current.status.reload());
    expect(result.current.status.status).toBe('ready');
  });

  it('restaura os dados de exemplo', async () => {
    const { result } = await renderReady();
    await act(() => result.current.settings.updateSettings({ pixKey: 'nova-chave' }));
    expect(result.current.settings.settings.pixKey).toBe('nova-chave');
    await act(() => result.current.settings.resetDemoData());
    expect(result.current.settings.settings.pixKey).toBe('rosa@exemplo.com.br');
  });
});

describe('upsertBy', () => {
  it('substitui pelo id e acrescenta os novos ao final', () => {
    const list = [
      { id: 'a', v: 1 },
      { id: 'b', v: 1 },
    ];
    expect(
      upsertBy(list, [
        { id: 'b', v: 2 },
        { id: 'c', v: 1 },
      ]),
    ).toEqual([
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
      { id: 'c', v: 1 },
    ]);
    expect(upsertBy(list, [])).toBe(list);
  });
});

describe('transações otimistas no reducer', () => {
  const state = {
    ...INITIAL_DATA_STATE,
    settings: { paymentMethods: { pix: true, fiado: true }, fees: { debito: 1 }, pixKey: '' },
    expenses: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
  };

  it('remove e devolve o item à mesma posição', () => {
    const applied = dataReducer(state, {
      type: 'optimistic/applied',
      txId: 1,
      op: 'remove',
      slice: 'expenses',
      id: 'b',
    });
    expect(applied.expenses.map((e) => e.id)).toEqual(['a', 'c']);
    const reverted = dataReducer(applied, { type: 'optimistic/reverted', txId: 1 });
    expect(reverted.expenses.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    expect(reverted.pending).toEqual({});
  });

  it('mescla ajustes parciais e desfaz para o objeto anterior', () => {
    const changes = { paymentMethods: { pix: false } };
    const applied = dataReducer(state, {
      type: 'optimistic/applied',
      txId: 2,
      op: 'merge',
      slice: 'settings',
      changes,
    });
    expect(applied.settings.paymentMethods).toEqual({ pix: false, fiado: true });
    expect(dataReducer(applied, { type: 'optimistic/reverted', txId: 2 }).settings).toBe(state.settings);
    const committed = dataReducer(applied, {
      type: 'optimistic/committed',
      txId: 2,
      slice: 'settings',
      item: null,
    });
    expect(committed.settings.paymentMethods.pix).toBe(false);
    expect(committed.pending).toEqual({});
  });
});
