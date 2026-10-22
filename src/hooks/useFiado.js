import { useMemo } from 'react';
import { compareUrgency, customerFiadoSummary, fiadoIndicators } from '@/domain/rules/fiado.js';
import { today as todayISO } from '@/lib/date.js';
import { useDataActions, useDataState } from './useData.js';

/**
 * Fiado: contas, recebimentos, a lista "Quem me deve" (já ordenada por urgência)
 * e os indicadores de inadimplência, todos calculados por `domain/rules/fiado.js`.
 */
export function useFiado() {
  const { status, customers, fiadoAccounts, fiadoPayments } = useDataState();
  const { receiveFiadoPayment, undoFiadoPayment } = useDataActions();
  const today = todayISO();

  const debtors = useMemo(
    () =>
      customers
        .map((customer) => ({ customer, ...customerFiadoSummary(customer, fiadoAccounts, today) }))
        .filter((row) => row.openCents > 0)
        .sort(compareUrgency),
    [customers, fiadoAccounts, today],
  );
  const indicators = useMemo(
    () => fiadoIndicators(customers, fiadoAccounts, today),
    [customers, fiadoAccounts, today],
  );

  return {
    status,
    accounts: fiadoAccounts,
    payments: fiadoPayments,
    debtors,
    indicators,
    receivePayment: receiveFiadoPayment,
    undoPayment: undoFiadoPayment,
  };
}
