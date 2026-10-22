import { useMemo } from 'react';
import { summarizeCashDay } from '@/domain/rules/cash.js';
import { today as todayISO } from '@/lib/date.js';
import { useDataActions, useDataState } from './useData.js';

/**
 * Caixa do dia e despesas. `todayCash` é o caixa de hoje (nulo se ainda não abriu) e
 * `todaySummary` o resumo calculado por `domain/rules/cash.js`.
 */
export function useCash() {
  const { status, cashDays, expenses, sales, fiadoPayments } = useDataState();
  const { openCashDay, updateOpening, closeCashDay, reopenCashDay, createExpense, deleteExpense } =
    useDataActions();
  const today = todayISO();

  const todayCash = useMemo(() => cashDays.find((cash) => cash.date === today) ?? null, [cashDays, today]);
  const todaySummary = useMemo(
    () => summarizeCashDay({ date: today, sales, fiadoPayments, expenses, cashDay: todayCash }),
    [today, sales, fiadoPayments, expenses, todayCash],
  );

  return {
    status,
    cashDays,
    expenses,
    todayCash,
    todaySummary,
    openCashDay,
    updateOpening,
    closeCashDay,
    reopenCashDay,
    createExpense,
    deleteExpense,
  };
}
