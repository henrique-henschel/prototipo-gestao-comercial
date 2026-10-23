import { useMemo } from 'react';
import { cashDayClosing, summarizeCashDay } from '@/domain/rules/cash.js';
import { filterByPeriod } from '@/domain/rules/period.js';
import { today as todayISO } from '@/lib/date.js';
import { useDataActions, useDataState } from './useData.js';

/**
 * Caixa e despesas de um dia (padrão: hoje). `cashDay` é o caixa do dia (nulo se ainda não
 * abriu), `summary` o resumo calculado por `domain/rules/cash.js`, `dayExpenses` as despesas
 * do dia e `history` os outros dias com caixa, do mais recente para o mais antigo.
 * `todayCash` e `todaySummary` continuam valendo para quem só precisa de hoje.
 * @param {string} [date] `AAAA-MM-DD`
 */
export function useCash(date) {
  const { status, cashDays, expenses, sales, fiadoPayments } = useDataState();
  const {
    openCashDay,
    updateOpening,
    closeCashDay,
    reopenCashDay,
    createExpense,
    deleteExpense,
    restoreExpense,
  } = useDataActions();
  const today = todayISO();
  const day = date ?? today;

  const cashDay = useMemo(() => cashDays.find((cash) => cash.date === day) ?? null, [cashDays, day]);
  const summary = useMemo(
    () => summarizeCashDay({ date: day, sales, fiadoPayments, expenses, cashDay }),
    [day, sales, fiadoPayments, expenses, cashDay],
  );
  const dayExpenses = useMemo(
    () =>
      [...filterByPeriod(expenses, { start: day, end: day })].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    [expenses, day],
  );

  const history = useMemo(
    () =>
      cashDays
        .filter((cash) => cash.date !== day)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((cash) => ({
          cashDay: cash,
          soldCents: summarizeCashDay({ date: cash.date, sales, fiadoPayments, expenses, cashDay: cash })
            .soldCents,
          closing: cashDayClosing(cash),
        })),
    [cashDays, day, sales, fiadoPayments, expenses],
  );

  const todayCash = useMemo(() => cashDays.find((cash) => cash.date === today) ?? null, [cashDays, today]);
  const todaySummary = useMemo(
    () =>
      day === today
        ? summary
        : summarizeCashDay({ date: today, sales, fiadoPayments, expenses, cashDay: todayCash }),
    [day, today, summary, sales, fiadoPayments, expenses, todayCash],
  );

  return {
    status,
    cashDays,
    expenses,
    date: day,
    isToday: day === today,
    cashDay,
    summary,
    dayExpenses,
    history,
    todayCash,
    todaySummary,
    openCashDay,
    updateOpening,
    closeCashDay,
    reopenCashDay,
    createExpense,
    deleteExpense,
    restoreExpense,
  };
}
