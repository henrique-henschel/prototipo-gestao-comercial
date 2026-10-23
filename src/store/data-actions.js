import * as cashService from '@/services/cash.service.js';
import * as customersService from '@/services/customers.service.js';
import * as fiadoService from '@/services/fiado.service.js';
import * as productsService from '@/services/products.service.js';
import * as salesService from '@/services/sales.service.js';
import * as settingsService from '@/services/settings.service.js';

/**
 * Carrega todos os dados do negócio em paralelo.
 * @returns {Promise<Omit<import('./data-context.js').DataState, 'status'|'error'>>}
 */
export async function fetchAllData() {
  const [
    business,
    settings,
    products,
    customers,
    sales,
    fiadoAccounts,
    fiadoPayments,
    stockMovements,
    expenses,
    cashDays,
  ] = await Promise.all([
    settingsService.getBusiness(),
    settingsService.getSettings(),
    productsService.listProducts(),
    customersService.listCustomers(),
    salesService.listSales(),
    fiadoService.listFiadoAccounts(),
    fiadoService.listFiadoPayments(),
    productsService.listStockMovements(),
    cashService.listExpenses(),
    cashService.listCashDays(),
  ]);
  return {
    business,
    settings,
    products,
    customers,
    sales,
    fiadoAccounts,
    fiadoPayments,
    stockMovements,
    expenses,
    cashDays,
  };
}

/**
 * Ações de dados usadas pelas telas. Duas estratégias:
 * - **Confirmadas**: criar venda, receber fiado, movimentar estoque... dependem de números
 *   que só o serviço define (número da venda, abatimento FIFO), então o estado muda quando
 *   a resposta chega (a tela mostra "carregando" no botão).
 * - **Otimistas**: editar, arquivar, apagar e ajustes mudam a tela na hora; se o serviço
 *   falhar, o reducer desfaz a transação (rollback) e a ação rejeita para a tela avisar.
 *
 * @param {import('react').Dispatch<any>} dispatch
 */
export function createDataActions(dispatch) {
  let lastTxId = 0;

  /** Espera o serviço e aplica a resposta com uma ação semântica do reducer. */
  async function confirmed(type, promise) {
    const result = await promise;
    dispatch({ type, result });
    return result;
  }

  /** Espera o serviço e grava o item devolvido na lista. */
  async function confirmedUpsert(slice, promise) {
    const item = await promise;
    dispatch({ type: 'items/upserted', slice, items: [item] });
    return item;
  }

  /**
   * Muda a tela na hora (`merge` de alterações ou `remove`) e confirma ou desfaz
   * conforme a resposta do serviço.
   * @param {{ op: 'merge'|'remove', slice: string, id?: string, changes?: object }} operation
   * @param {() => Promise<any>} request
   * @param {{ keepResult?: boolean }} [options] `keepResult`: grava o item devolvido pelo serviço
   */
  async function optimistic(operation, request, { keepResult = true } = {}) {
    lastTxId += 1;
    const txId = lastTxId;
    dispatch({ type: 'optimistic/applied', txId, ...operation });
    try {
      const result = await request();
      dispatch({
        type: 'optimistic/committed',
        txId,
        slice: operation.slice,
        item: keepResult ? result : null,
      });
      return result;
    } catch (error) {
      dispatch({ type: 'optimistic/reverted', txId });
      throw error;
    }
  }

  async function reload() {
    dispatch({ type: 'data/loading' });
    try {
      dispatch({ type: 'data/loaded', data: await fetchAllData() });
    } catch (error) {
      dispatch({ type: 'data/failed', error });
    }
  }

  function updateCustomer(id, changes) {
    return optimistic({ op: 'merge', slice: 'customers', id, changes }, () =>
      customersService.updateCustomer(id, changes),
    );
  }

  return {
    reload,

    // Vendas
    createSale: (input) => confirmed('sale/created', salesService.createSale(input)),
    undoSale: (id) => confirmed('sale/undone', salesService.undoSale(id)),
    cancelSale: (id, input) => confirmed('sale/cancelled', salesService.cancelSale(id, input)),

    // Produtos e estoque
    createProduct: (input) => confirmed('stock/adjusted', productsService.createProduct(input)),
    updateProduct: (id, changes) => {
      const { quantity: _ignored, ...allowed } = changes;
      return optimistic({ op: 'merge', slice: 'products', id, changes: allowed }, () =>
        productsService.updateProduct(id, allowed),
      );
    },
    addStockMovement: (productId, input) =>
      confirmed('stock/adjusted', productsService.addStockMovement(productId, input)),
    undoStockMovement: (movementId) =>
      confirmed('stock/movementUndone', productsService.undoStockMovement(movementId)),

    // Clientes
    createCustomer: (input) => confirmedUpsert('customers', customersService.createCustomer(input)),
    updateCustomer,
    archiveCustomer: (id, archived = true) => updateCustomer(id, { archived }),
    deleteCustomer: (id) =>
      optimistic({ op: 'remove', slice: 'customers', id }, () => customersService.deleteCustomer(id), {
        keepResult: false,
      }),

    // Fiado
    receiveFiadoPayment: (customerId, input) =>
      confirmed('fiado/paid', fiadoService.receiveFiadoPayment(customerId, input)),
    undoFiadoPayment: (paymentId) =>
      confirmed('fiado/paymentUndone', fiadoService.undoFiadoPayment(paymentId)),

    // Caixa e despesas
    openCashDay: (input) => confirmedUpsert('cashDays', cashService.openCashDay(input)),
    updateOpening: (date, input) => confirmedUpsert('cashDays', cashService.updateOpening(date, input)),
    closeCashDay: (date, input) => confirmedUpsert('cashDays', cashService.closeCashDay(date, input)),
    reopenCashDay: (date) => confirmedUpsert('cashDays', cashService.reopenCashDay(date)),
    createExpense: (input) => confirmedUpsert('expenses', cashService.createExpense(input)),
    deleteExpense: (id) =>
      optimistic({ op: 'remove', slice: 'expenses', id }, () => cashService.deleteExpense(id), {
        keepResult: false,
      }),

    // Negócio e ajustes
    updateSettings: (changes) =>
      optimistic({ op: 'merge', slice: 'settings', changes }, () => settingsService.updateSettings(changes)),
    updateBusiness: (changes) =>
      optimistic({ op: 'merge', slice: 'business', changes }, () => settingsService.updateBusiness(changes)),
    completeOnboarding: async (input) => {
      const business = await settingsService.completeOnboarding(input);
      await reload();
      return business;
    },
    resetDemoData: async () => {
      await settingsService.resetDemoData();
      await reload();
    },
  };
}
