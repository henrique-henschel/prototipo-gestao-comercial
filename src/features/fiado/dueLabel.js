import { FIADO_STATUS } from '@/domain/constants.js';
import { formatRelativeDay, plural } from '@/lib/format.js';

/**
 * Situação do prazo em linguagem simples, para acompanhar o `StatusPill`:
 * "12 dias de atraso", "Vence amanhã", "Vence em 5 dias" (vazio quando a pílula já basta).
 * @param {{ status: import('@/domain/models.js').FiadoStatus, maxDaysOverdue?: number,
 *   nextDueDate?: string|null, dueDate?: string }} info resumo do cliente ou uma conta
 * @param {string} [today]
 * @returns {string}
 */
export function dueLabel({ status, maxDaysOverdue = 0, nextDueDate, dueDate }, today) {
  const due = dueDate ?? nextDueDate;
  // "Pago" e "Vence hoje" já estão escritos na pílula de status.
  if (status === FIADO_STATUS.QUITADO || status === FIADO_STATUS.VENCE_HOJE) return '';
  if (status === FIADO_STATUS.ATRASADO && maxDaysOverdue > 0)
    return `${plural(maxDaysOverdue, 'dia')} de atraso`;
  if (!due) return '';
  const relative = formatRelativeDay(due, today);
  if (relative.startsWith('há')) return `Venceu ${relative}`;
  return `Vence ${relative.replace(/^(\d)/, 'em $1')}`;
}
