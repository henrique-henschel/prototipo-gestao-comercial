import { PAYMENT_METHODS, UNITS } from '@/domain/constants.js';
import { formatBRL } from '@/domain/rules/money.js';
import { formatDate, formatNumber, formatTime } from '@/lib/format.js';

/**
 * Texto do recibo enviado pelo WhatsApp: simples, em linhas curtas e sem tabela,
 * para ler bem na tela do celular de quem recebe.
 * @param {import('@/domain/models.js').Sale} sale
 * @param {{ businessName?: string, customerName?: string|null }} [context]
 * @returns {string}
 */
export function receiptText(sale, { businessName, customerName } = {}) {
  const lines = [];
  lines.push(`*${businessName || 'Recibo'}*`);
  lines.push(`Venda nº ${sale.number} · ${formatDate(sale.createdAt)} às ${formatTime(sale.createdAt)}`);
  if (customerName) lines.push(`Cliente: ${customerName}`);
  lines.push('');

  for (const item of sale.items) {
    const unit = UNITS[item.unit]?.short ?? item.unit;
    const quantity = item.productId ? `${formatNumber(item.quantity)} ${unit} ` : '';
    lines.push(`${quantity}${item.name}: ${formatBRL(item.totalCents)}`);
  }
  lines.push('');

  if (sale.discountCents > 0) {
    lines.push(`Subtotal: ${formatBRL(sale.subtotalCents)}`);
    lines.push(`Desconto: ${formatBRL(-sale.discountCents)}`);
  }
  lines.push(`*Total: ${formatBRL(sale.totalCents)}*`);

  for (const payment of sale.payments) {
    const label = PAYMENT_METHODS[payment.method].label;
    let detail = '';
    if (payment.method === 'credito' && payment.installments > 1) detail = ` em ${payment.installments}x`;
    if (payment.method === 'fiado' && payment.dueDate)
      detail = `, para pagar até ${formatDate(payment.dueDate)}`;
    lines.push(`${label}: ${formatBRL(payment.amountCents)}${detail}`);
  }
  if (sale.changeCents > 0) lines.push(`Troco: ${formatBRL(sale.changeCents)}`);
  if (sale.status === 'cancelada') lines.push('', 'Esta venda foi cancelada.');

  lines.push('', 'Obrigado pela preferência!');
  return lines.join('\n');
}

/**
 * Resumo curto dos itens, para listas: "2 Coxinha, 1 Refrigerante lata e mais 2".
 * @param {import('@/domain/models.js').SaleItem[]} items
 * @param {number} [limit=2]
 */
export function itemsSummary(items, limit = 2) {
  const names = items.map((item) =>
    item.productId ? `${formatNumber(item.quantity)} ${item.name}` : item.name,
  );
  if (names.length <= limit) return names.join(', ');
  return `${names.slice(0, limit).join(', ')} e mais ${names.length - limit}`;
}
