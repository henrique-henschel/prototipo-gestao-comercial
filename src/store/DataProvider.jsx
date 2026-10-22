import { useEffect, useReducer, useState } from 'react';
import { DataActionsContext, DataStateContext, INITIAL_DATA_STATE } from './data-context.js';
import { createDataActions, fetchAllData } from './data-actions.js';
import { dataReducer } from './data-reducer.js';

/**
 * Carrega os dados do negócio pelos serviços e os mantém em memória (Context + useReducer).
 * Fica dentro da área logada: sair desmonta o provider e descarta o estado.
 * Consumo pelos hooks `useSales`, `useProducts`, `useCustomers`, `useFiado`, `useCash`,
 * `useSettings` e `useDataStatus` (`src/hooks/`).
 */
export function DataProvider({ children }) {
  const [state, dispatch] = useReducer(dataReducer, INITIAL_DATA_STATE);
  // As ações dependem só de `dispatch`, que é estável: são criadas uma vez por montagem.
  const [actions] = useState(() => createDataActions(dispatch));

  useEffect(() => {
    let active = true;
    fetchAllData().then(
      (data) => active && dispatch({ type: 'data/loaded', data }),
      (error) => active && dispatch({ type: 'data/failed', error }),
    );
    return () => {
      active = false;
    };
  }, []);

  return (
    <DataActionsContext.Provider value={actions}>
      <DataStateContext.Provider value={state}>{children}</DataStateContext.Provider>
    </DataActionsContext.Provider>
  );
}
