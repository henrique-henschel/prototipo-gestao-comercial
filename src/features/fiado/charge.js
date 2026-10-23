import { formatBRL } from '@/domain/rules/money.js';
import { diffInDays, today as todayISO } from '@/lib/date.js';
import { formatDate, plural } from '@/lib/format.js';

/**
 * "venceu em 10/10/2026, há 12 dias" / "vence hoje" / "vence em 25/10/2026"
 * @param {string} dueDate `AAAA-MM-DD`
 * @param {string} today
 */
function dueText(dueDate, today) {
  const days = diffInDays(today, dueDate);
  if (days === 0) return 'que vence hoje';
  if (days < 0) return `que venceu em ${formatDate(dueDate)} (${plural(-days, 'dia')} atrás)`;
  return `que vence em ${formatDate(dueDate)}`;
}

/**
 * Mensagem educada de cobrança do fiado pelo WhatsApp (regra 3.9): nome do negócio,
 * valor em aberto e vencimento, mais a chave Pix quando houver.
 * @param {object} input
 * @param {Pick<import('@/domain/models.js').Customer, 'name'>} input.customer
 * @param {{ balanceCents: number, nextDueDate: string|null }} input.summary de `customerFiadoSummary`
 * @param {string} [input.businessName]
 * @param {string} [input.pixKey]
 * @param {string} [input.today]
 * @returns {string}
 */
export function chargeText({ customer, summary, businessName, pixKey, today = todayISO() }) {
  const firstName = customer.name.trim().split(/\s+/)[0];
  const lines = businessName ? [`*${businessName}*`, ''] : [];
  const due = summary.nextDueDate ? `, ${dueText(summary.nextDueDate, today)}` : '';
  lines.push(`Olá, ${firstName}! Tudo bem?`);
  lines.push(`Passando para lembrar do fiado de *${formatBRL(summary.balanceCents)}*${due}.`);
  lines.push('');
  lines.push(
    pixKey
      ? `Quando puder, é só passar aqui ou pagar pelo Pix: ${pixKey}`
      : 'Quando puder, é só passar aqui para acertar.',
  );
  lines.push('', 'Obrigado!');
  return lines.join('\n');
}
