import { useState } from 'react';
import { EXPENSE_CATEGORIES, UNDO_WINDOW_MS } from '@/domain/constants.js';
import { formatBRL } from '@/domain/rules/money.js';
import { useDataActions } from '@/hooks/useData.js';
import { useToast } from '@/hooks/useToast.js';

/**
 * Ações do caixa com os avisos da tela: abrir, corrigir o troco inicial, fechar e reabrir
 * o dia, lançar e apagar despesas. Lançar, apagar e fechar oferecem "Desfazer" por
 * 5 segundos, como a venda (em vez de "Tem certeza?").
 * @param {string} date dia do caixa, `AAAA-MM-DD`
 */
export function useCashActions(date) {
  const {
    openCashDay,
    updateOpening,
    closeCashDay,
    reopenCashDay,
    createExpense,
    deleteExpense,
    restoreExpense,
  } = useDataActions();
  const toast = useToast();
  const [saving, setSaving] = useState(null);

  /** Roda a ação com o botão em "carregando"; devolve `true` se deu certo. */
  const run = async (key, action) => {
    setSaving(key);
    try {
      await action();
      return true;
    } catch (error) {
      toast.show({ message: error.message, tone: 'danger' });
      return false;
    } finally {
      setSaving(null);
    }
  };

  const quietly = async (action, message, description) => {
    try {
      await action();
      toast.show({ message, description, tone: 'info' });
    } catch (error) {
      toast.show({ message: error.message, tone: 'danger' });
    }
  };

  const categoryLabel = (value) => EXPENSE_CATEGORIES.find((option) => option.value === value)?.label;

  return {
    saving,

    open: (openingCents) =>
      run('open', async () => {
        await openCashDay({ date, openingCents });
        toast.show({ message: 'Caixa aberto', description: `Troco inicial: ${formatBRL(openingCents)}` });
      }),

    changeOpening: (openingCents) =>
      run('opening', async () => {
        await updateOpening(date, { openingCents });
        toast.show({ message: 'Troco inicial salvo', description: formatBRL(openingCents) });
      }),

    close: (input) =>
      run('close', async () => {
        await closeCashDay(date, input);
        toast.show({
          message: 'Dia fechado',
          description: `Você contou ${formatBRL(input.countedCents)}.`,
          action: {
            label: 'Desfazer',
            onClick: () => quietly(() => reopenCashDay(date), 'Dia aberto de novo'),
          },
          duration: UNDO_WINDOW_MS,
        });
      }),

    reopen: () =>
      run('reopen', async () => {
        await reopenCashDay(date);
        toast.show({
          message: 'Dia aberto de novo',
          description: 'Quando terminar, conte a gaveta e feche outra vez.',
          tone: 'info',
        });
      }),

    addExpense: (input) =>
      run('expense', async () => {
        const expense = await createExpense(input);
        toast.show({
          message: 'Despesa lançada',
          description: `${expense.description}: ${formatBRL(expense.amountCents)}`,
          action: {
            label: 'Desfazer',
            onClick: () => quietly(() => deleteExpense(expense.id), 'Despesa desfeita'),
          },
          duration: UNDO_WINDOW_MS,
        });
      }),

    removeExpense: (expense) =>
      run(`remove-${expense.id}`, async () => {
        await deleteExpense(expense.id);
        toast.show({
          message: 'Despesa apagada',
          description: `${expense.description || categoryLabel(expense.category)}: ${formatBRL(expense.amountCents)}`,
          action: {
            label: 'Desfazer',
            onClick: () => quietly(() => restoreExpense(expense), 'Despesa de volta'),
          },
          duration: UNDO_WINDOW_MS,
        });
      }),
  };
}
