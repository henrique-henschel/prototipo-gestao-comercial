import { mergeSettings } from '@/domain/rules/settings.js';
import { INITIAL_DATA_STATE } from './data-context.js';

/**
 * Reducer dos dados do negócio.
 * - Ações semânticas (`sale/created`, `fiado/paid`...) aplicam a resposta confirmada do serviço.
 * - Atualizações otimistas são transações: `optimistic/applied` muda a tela na hora e guarda
 *   em `pending` como desfazer; depois vem `optimistic/committed` (deu certo) ou
 *   `optimistic/reverted` (o serviço falhou e a tela volta ao que era).
 *
 * @typedef {import('./data-context.js').DataState} DataState
 */

/**
 * Substitui os itens que já existem (pela chave) e acrescenta os novos ao final.
 * @template T
 * @param {T[]} list
 * @param {T[]} items
 * @param {string} [key='id']
 * @returns {T[]}
 */
export function upsertBy(list, items, key = 'id') {
  if (items.length === 0) return list;
  const incoming = new Map(items.map((item) => [item[key], item]));
  const next = list.map((item) => {
    const replacement = incoming.get(item[key]);
    if (replacement) incoming.delete(item[key]);
    return replacement ?? item;
  });
  return [...next, ...incoming.values()];
}

/**
 * @template T
 * @param {T[]} list
 * @param {string[]} ids
 * @param {string} [key='id']
 */
function removeBy(list, ids, key = 'id') {
  const removed = new Set(ids);
  return list.filter((item) => !removed.has(item[key]));
}

/** Chave de cada lista (o caixa é identificado pela data). */
export const SLICE_KEYS = { cashDays: 'date' };

/** Fatias que são um objeto único, e não uma lista. */
const OBJECT_SLICES = ['business', 'settings'];

/** Mescla alterações num objeto único (os ajustes aceitam formas e taxas parciais). */
function mergeObject(slice, current, changes) {
  return slice === 'settings' ? mergeSettings(current, changes) : { ...current, ...changes };
}

/**
 * Aplica uma operação otimista e devolve o novo estado com o "desfazer" guardado.
 * @param {DataState} state
 * @param {{ txId: number, op: 'merge'|'remove', slice: string, id?: string, changes?: object }} action
 */
function applyOptimistic(state, { txId, op, slice, id, changes }) {
  let next;
  let undo;
  if (OBJECT_SLICES.includes(slice)) {
    undo = { slice, value: state[slice] };
    next = mergeObject(slice, state[slice], changes);
  } else {
    const key = SLICE_KEYS[slice] ?? 'id';
    const list = state[slice];
    const index = list.findIndex((item) => item[key] === id);
    if (index === -1) return state;
    undo = { slice, index, item: list[index], removed: op === 'remove' };
    next =
      op === 'remove'
        ? list.filter((_, position) => position !== index)
        : list.map((item, position) => (position === index ? { ...item, ...changes } : item));
  }
  return { ...state, [slice]: next, pending: { ...state.pending, [txId]: undo } };
}

/**
 * Desfaz uma operação otimista que o serviço recusou.
 * @param {DataState} state
 * @param {number} txId
 */
function revertOptimistic(state, txId) {
  const { [txId]: undo, ...pending } = state.pending;
  if (!undo) return state;
  if ('value' in undo) return { ...state, [undo.slice]: undo.value, pending };
  const key = SLICE_KEYS[undo.slice] ?? 'id';
  const list = state[undo.slice];
  const restored = undo.removed
    ? [...list.slice(0, undo.index), undo.item, ...list.slice(undo.index)]
    : list.map((item) => (item[key] === undo.item[key] ? undo.item : item));
  return { ...state, [undo.slice]: restored, pending };
}

/**
 * @param {DataState} state
 * @param {{ type: string, [key: string]: any }} action
 * @returns {DataState}
 */
export function dataReducer(state, action) {
  switch (action.type) {
    case 'data/loading':
      return { ...state, status: 'loading', error: null };
    case 'data/loaded':
      return { ...INITIAL_DATA_STATE, ...action.data, status: 'ready', error: null };
    case 'data/failed':
      return { ...state, status: 'error', error: action.error };

    case 'items/upserted': {
      const key = SLICE_KEYS[action.slice] ?? 'id';
      return { ...state, [action.slice]: upsertBy(state[action.slice], action.items, key) };
    }

    case 'optimistic/applied':
      return applyOptimistic(state, action);
    case 'optimistic/committed': {
      const { [action.txId]: _done, ...pending } = state.pending;
      const { slice, item } = action;
      if (!item) return { ...state, pending };
      const value = OBJECT_SLICES.includes(slice)
        ? item
        : upsertBy(state[slice], [item], SLICE_KEYS[slice] ?? 'id');
      return { ...state, [slice]: value, pending };
    }
    case 'optimistic/reverted':
      return revertOptimistic(state, action.txId);

    case 'sale/created': {
      const { sale, products, movements, fiadoAccounts, cashDay } = action.result;
      return {
        ...state,
        sales: [...state.sales, sale],
        products: upsertBy(state.products, products),
        stockMovements: [...state.stockMovements, ...movements],
        fiadoAccounts: [...state.fiadoAccounts, ...fiadoAccounts],
        cashDays: cashDay ? upsertBy(state.cashDays, [cashDay], 'date') : state.cashDays,
      };
    }
    case 'sale/undone': {
      const { saleId, products, removedMovementIds, removedAccountIds } = action.result;
      return {
        ...state,
        sales: removeBy(state.sales, [saleId]),
        products: upsertBy(state.products, products),
        stockMovements: removeBy(state.stockMovements, removedMovementIds),
        fiadoAccounts: removeBy(state.fiadoAccounts, removedAccountIds),
      };
    }
    case 'sale/cancelled': {
      const { sale, products, movements, fiadoAccounts, customer } = action.result;
      return {
        ...state,
        sales: upsertBy(state.sales, [sale]),
        products: upsertBy(state.products, products),
        stockMovements: [...state.stockMovements, ...movements],
        fiadoAccounts: upsertBy(state.fiadoAccounts, fiadoAccounts),
        customers: customer ? upsertBy(state.customers, [customer]) : state.customers,
      };
    }
    case 'fiado/paid': {
      const { payment, fiadoAccounts, customer } = action.result;
      return {
        ...state,
        fiadoPayments: [...state.fiadoPayments, payment],
        fiadoAccounts: upsertBy(state.fiadoAccounts, fiadoAccounts),
        customers: upsertBy(state.customers, [customer]),
      };
    }
    case 'fiado/paymentUndone': {
      const { paymentId, fiadoAccounts, customer } = action.result;
      return {
        ...state,
        fiadoPayments: removeBy(state.fiadoPayments, [paymentId]),
        fiadoAccounts: upsertBy(state.fiadoAccounts, fiadoAccounts),
        customers: upsertBy(state.customers, [customer]),
      };
    }
    case 'stock/adjusted': {
      const { product, movement } = action.result;
      return {
        ...state,
        products: upsertBy(state.products, [product]),
        stockMovements: movement ? [...state.stockMovements, movement] : state.stockMovements,
      };
    }
    case 'stock/movementUndone': {
      const { movementId, product } = action.result;
      return {
        ...state,
        products: upsertBy(state.products, [product]),
        stockMovements: removeBy(state.stockMovements, [movementId]),
      };
    }
    default:
      throw new Error(`Ação desconhecida: ${action.type}`);
  }
}
