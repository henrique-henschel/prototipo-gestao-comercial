import { APP_NAME } from '@/app/config.js';
import { PAYMENT_METHODS, REPORT_TYPES, UNITS } from '@/domain/constants.js';
import { formatBRL } from '@/domain/rules/money.js';
import { dateOf, diffInDays, today as todayISO } from '@/lib/date.js';
import { formatDate, formatPercent, formatPeriod, formatQuantity, formatTime, plural } from '@/lib/format.js';

/**
 * Textos dos relatórios: o título, o período e o resumo em texto que vai no
 * "Compartilhar" (WhatsApp), com o nome do negócio em negrito no topo, como no recibo
 * e na cobrança.
 */

/** Fiado e estoque são uma foto de agora: o período não vale para eles. */
export const SNAPSHOT_REPORTS = ['fiado', 'estoque'];

export const reportTitle = (type) => REPORT_TYPES.find((option) => option.value === type)?.label ?? type;

/** "Período: 01/10/2026 a 23/10/2026" ou "Situação em 23/10/2026" (fiado e estoque). */
export function reportPeriodText(report) {
  return SNAPSHOT_REPORTS.includes(report.type)
    ? `Situação em ${formatDate(dateOf(report.generatedAt))}`
    : `Período: ${formatPeriod(report.period)}`;
}

/** "Feito em 23/10/2026 às 14:35" */
export function reportIssuedText(report) {
  return `Feito em ${formatDate(dateOf(report.generatedAt))} às ${formatTime(report.generatedAt)}`;
}

/**
 * Com o que o resumo compara (regra 7), em palavras simples: "ontem até esta hora",
 * "o dia anterior" ou "os 7 dias antes".
 * @param {{ start: string, end: string }} period
 * @param {string} [today]
 */
export function comparisonText(period, today = todayISO()) {
  const days = diffInDays(period.start, period.end) + 1;
  if (days > 1) return `os ${days} dias antes`;
  return period.end === today ? 'ontem até esta hora' : 'o dia anterior';
}

const line = (label, cents) => `${label}: ${formatBRL(cents)}`;

const SUMMARIES = {
  resumo: ({ current, fiado }) => [
    `${line('Vendido', current.soldCents)} (${plural(current.salesCount, 'venda')})`,
    line('Recebido', current.receivedCents),
    line('Despesas', current.expensesCents),
    line('Lucro estimado', current.profitCents),
    line('Para receber no fiado', fiado.receivableCents),
  ],
  vendas: ({ metrics, cancelledCount }) => [
    `${line('Vendido', metrics.soldCents)} (${plural(metrics.salesCount, 'venda')})`,
    line('Média por venda', metrics.averageTicketCents),
    ...(cancelledCount > 0 ? [plural(cancelledCount, 'venda cancelada', 'vendas canceladas')] : []),
  ],
  formas: ({ metrics, paymentMix }) => [
    line('Vendido', metrics.soldCents),
    ...paymentMix
      .filter((row) => row.amountCents > 0)
      .map(
        (row) => `${line(PAYMENT_METHODS[row.method].label, row.amountCents)} (${formatPercent(row.share)})`,
      ),
  ],
  produtos: ({ topProducts }) =>
    topProducts
      .slice(0, 10)
      .map(
        (product, index) =>
          `${index + 1}. ${product.name}: ${formatQuantity(product.quantity, UNITS[product.unit]?.short ?? product.unit)}, ${formatBRL(product.revenueCents)}`,
      ),
  fiado: ({ indicators }) => [
    line('Para receber', indicators.receivableCents),
    line('Atrasado', indicators.overdueCents),
    plural(indicators.debtorsCount, 'cliente devendo', 'clientes devendo'),
    plural(indicators.overdueCount, 'cliente atrasado', 'clientes atrasados'),
  ],
  estoque: ({ value, products, outCount, lowCount }) => [
    line('Mercadoria parada (pelo custo)', value.costCents),
    line('Mercadoria parada (pelo preço de venda)', value.saleCents),
    ...(outCount > 0
      ? [
          `Acabou: ${products
            .filter((product) => product.status === 'acabou')
            .map((p) => p.name)
            .join(', ')}`,
        ]
      : []),
    ...(lowCount > 0
      ? [
          `Acabando: ${products
            .filter((product) => product.status === 'acabando')
            .map((p) => p.name)
            .join(', ')}`,
        ]
      : []),
  ],
  caixa: ({ metrics }) => [
    line('Vendido', metrics.soldCents),
    line('Entrou', metrics.receivedCents),
    line('Despesas', metrics.expensesCents),
  ],
};

/**
 * Resumo em texto do relatório, para o WhatsApp.
 * @param {{ type: string, period: { start: string, end: string }, generatedAt: string, data: object }} report
 * @param {{ businessName?: string }} [options]
 * @returns {string}
 */
export function reportSummaryText(report, { businessName } = {}) {
  const header = [
    businessName ? `*${businessName}*` : null,
    `Relatório: ${reportTitle(report.type)}`,
    reportPeriodText(report),
  ].filter(Boolean);
  return [
    ...header,
    '',
    ...SUMMARIES[report.type](report.data),
    '',
    `${reportIssuedText(report)} pelo app ${APP_NAME}.`,
  ].join('\n');
}
