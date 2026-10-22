import { useContext } from 'react';
import { DataActionsContext, DataStateContext } from '@/store/data-context.js';

/**
 * Estado bruto dos dados do negócio. Prefira os hooks por área
 * (`useSales`, `useProducts`, `useFiado`...), que já trazem os dados calculados.
 * @returns {import('@/store/data-context.js').DataState}
 */
export function useDataState() {
  const state = useContext(DataStateContext);
  if (!state) throw new Error('useDataState precisa estar dentro de <DataProvider>.');
  return state;
}

/**
 * Todas as ações de dados (ver `store/data-actions.js`).
 * @returns {ReturnType<typeof import('@/store/data-actions.js').createDataActions>}
 */
export function useDataActions() {
  const actions = useContext(DataActionsContext);
  if (!actions) throw new Error('useDataActions precisa estar dentro de <DataProvider>.');
  return actions;
}

/**
 * Situação do carregamento, para os estados "carregando" e "erro" das telas.
 * @example
 * const { status, error, reload } = useDataStatus();
 * if (status === 'error') return <EmptyState tone="danger" action={<Button onClick={reload}>Tentar de novo</Button>} />;
 */
export function useDataStatus() {
  const { status, error } = useDataState();
  const { reload } = useDataActions();
  return { status, error, reload };
}
