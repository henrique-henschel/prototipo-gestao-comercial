import { createContext } from 'react';

/**
 * Dados do negócio carregados pelos serviços e mantidos em memória pelo `DataProvider`.
 * Estado e ações ficam em contextos separados: quem só dispara ações não re-renderiza
 * quando os dados mudam.
 *
 * @typedef {import('@/domain/models.js').Business} Business
 * @typedef {import('@/domain/models.js').Settings} Settings
 *
 * @typedef {object} DataState
 * @property {'loading'|'ready'|'error'} status
 * @property {Error|null} error
 * @property {Business|null} business
 * @property {Settings|null} settings
 * @property {import('@/domain/models.js').Product[]} products
 * @property {import('@/domain/models.js').Customer[]} customers
 * @property {import('@/domain/models.js').Sale[]} sales
 * @property {import('@/domain/models.js').FiadoAccount[]} fiadoAccounts
 * @property {import('@/domain/models.js').FiadoPayment[]} fiadoPayments
 * @property {import('@/domain/models.js').StockMovement[]} stockMovements
 * @property {import('@/domain/models.js').Expense[]} expenses
 * @property {import('@/domain/models.js').CashDay[]} cashDays
 * @property {Record<number, object>} pending desfazer das atualizações otimistas em andamento
 */

/** @type {DataState} */
export const INITIAL_DATA_STATE = {
  status: 'loading',
  error: null,
  business: null,
  settings: null,
  products: [],
  customers: [],
  sales: [],
  fiadoAccounts: [],
  fiadoPayments: [],
  stockMovements: [],
  expenses: [],
  cashDays: [],
  pending: {},
};

/** @type {import('react').Context<DataState | null>} */
export const DataStateContext = createContext(null);

/**
 * Ações de dados (ver `DataProvider`). Todas devolvem a resposta do serviço e
 * rejeitam com `ApiError` em caso de falha, para a tela mostrar o aviso.
 * @type {import('react').Context<ReturnType<typeof import('./data-actions.js').createDataActions> | null>}
 */
export const DataActionsContext = createContext(null);
