import { useDataActions, useDataState } from './useData.js';

/** Clientes e as ações de cadastro, edição, arquivamento e exclusão. */
export function useCustomers() {
  const { status, customers } = useDataState();
  const { createCustomer, updateCustomer, archiveCustomer, deleteCustomer } = useDataActions();
  return { status, customers, createCustomer, updateCustomer, archiveCustomer, deleteCustomer };
}
