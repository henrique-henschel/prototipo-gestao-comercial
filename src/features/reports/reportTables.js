import { STATUS_PRESETS } from '@/components/ui';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_METHODS,
  PAYMENT_METHODS,
  PRODUCT_CATEGORIES,
  UNITS,
} from '@/domain/constants.js';
import { formatBRL } from '@/domain/rules/money.js';
import { dateOf } from '@/lib/date.js';
import {
  formatDate,
  formatNumber,
  formatPercent,
  formatPhone,
  formatQuantity,
  formatTime,
} from '@/lib/format.js';

/**
 * Tabelas de cada relatório, com os valores crus (centavos, ISO, frações) e o tipo de
 * cada coluna (`CsvColumn` de `lib/csv.js`). A mesma tabela vira a planilha do Excel
 * (`buildCsv`), a tabela da tela e a do PDF (`ReportTable`), então os três sempre batem.
 *
 * Colunas de situação levam o texto em `key` (planilha) e a chave do `StatusPill` em
 * `statusKey` (tela). `id` identifica a tabela na tela.
 *
 * @typedef {import('@/lib/csv.js').CsvColumn & { statusKey?: string }} ReportColumn
 * @typedef {{ id: string, title: string, columns: ReportColumn[], rows: Record<string, unknown>[] }} ReportSection
 */

const label = (options, value) => options.find((option) => option.value === value)?.label ?? value;
const unitShort = (unit) => UNITS[unit]?.short ?? unit;
const methodLabel = (method) => PAYMENT_METHODS[method]?.label ?? method;

/** "2 un Coxinha, 0,5 kg Queijo" */
function itemsText(items) {
  return items
    .map((item) => `${formatQuantity(item.quantity, unitShort(item.unit))} ${item.name}`)
    .join(', ');
}

/** "Dinheiro + Pix", com as parcelas do crédito ("Cartão de crédito 3x"). */
function paymentsText(payments) {
  return payments
    .map((payment) =>
      payment.method === 'credito' && payment.installments > 1
        ? `${methodLabel(payment.method)} ${payment.installments}x`
        : methodLabel(payment.method),
    )
    .join(' + ');
}

/** "Sobrou R$ 3,00", "Faltou R$ 2,00", "Bateu certinho", "Não fechou", "Não abriu". */
function closingText(day) {
  if (!day.opened) return 'Não abriu';
  if (!day.closing) return 'Não fechou';
  if (day.closing.result === 'certo') return 'Bateu certinho';
  const verb = day.closing.result === 'sobrou' ? 'Sobrou' : 'Faltou';
  return `${verb} ${formatBRL(Math.abs(day.closing.differenceCents))}`;
}

const MONEY = 'money';

function paymentMixSection(paymentMix) {
  return {
    id: 'formas',
    title: 'Formas de pagamento',
    columns: [
      { key: 'method', label: 'Forma de pagamento' },
      { key: 'amount', label: 'Vendido (R$)', type: MONEY },
      { key: 'share', label: 'Parte do vendido', type: 'percent' },
    ],
    rows: paymentMix.map((row) => ({
      key: row.method,
      method: methodLabel(row.method),
      amount: row.amountCents,
      share: row.share,
    })),
  };
}

function productsSection(products, title = 'Produtos vendidos') {
  return {
    id: 'produtos',
    title,
    columns: [
      { key: 'name', label: 'Produto' },
      { key: 'position', label: 'Posição', type: 'number' },
      { key: 'quantity', label: 'Quantidade', type: 'number' },
      { key: 'unit', label: 'Unidade' },
      { key: 'revenue', label: 'Vendido (R$)', type: MONEY },
    ],
    rows: products.map((product, index) => ({
      key: product.productId,
      position: index + 1,
      name: product.name,
      quantity: product.quantity,
      unit: unitShort(product.unit),
      revenue: product.revenueCents,
    })),
  };
}

/** Linhas "Item | Valor (R$)". */
function totalsSection(id, title, items) {
  return {
    id,
    title,
    columns: [
      { key: 'item', label: 'Item' },
      { key: 'value', label: 'Valor (R$)', type: MONEY },
    ],
    rows: items.map(([item, value]) => ({ key: item, item, value })),
  };
}

const SECTIONS = {
  resumo: ({ current, previous, paymentMix, topProducts, fiado, stock }) => [
    {
      id: 'resumo',
      title: 'Resumo do período',
      columns: [
        { key: 'item', label: 'Item' },
        { key: 'current', label: 'Neste período (R$)', type: MONEY },
        { key: 'previous', label: 'No período anterior (R$)', type: MONEY },
      ],
      rows: [
        ['Vendido', 'soldCents'],
        ['Recebido (sem o fiado, com o fiado recebido)', 'receivedCents'],
        ['Vendido fiado', 'fiadoSoldCents'],
        ['Fiado recebido', 'fiadoReceivedCents'],
        ['Custo das mercadorias', 'costCents'],
        ['Taxas da maquininha', 'feesCents'],
        ['Despesas', 'expensesCents'],
        ['Lucro estimado', 'profitCents'],
        ['Média por venda', 'averageTicketCents'],
      ].map(([item, field]) => ({ key: field, item, current: current[field], previous: previous[field] })),
    },
    {
      id: 'quantidade',
      title: 'Quantidade de vendas',
      columns: [
        { key: 'item', label: 'Item' },
        { key: 'current', label: 'Neste período', type: 'number' },
        { key: 'previous', label: 'No período anterior', type: 'number' },
      ],
      rows: [
        {
          key: 'vendas',
          item: 'Número de vendas',
          current: current.salesCount,
          previous: previous.salesCount,
        },
      ],
    },
    paymentMixSection(paymentMix),
    productsSection(topProducts, 'Mais vendidos'),
    totalsSection('hoje', 'Fiado e estoque hoje', [
      ['Para receber no fiado', fiado.receivableCents],
      ['Fiado atrasado', fiado.overdueCents],
      ['Mercadoria parada no estoque (pelo custo)', stock.costCents],
      ['Mercadoria parada no estoque (pelo preço de venda)', stock.saleCents],
    ]),
  ],

  vendas: ({ sales, days }) => [
    {
      id: 'vendas',
      title: 'Vendas',
      columns: [
        { key: 'createdAt', label: 'Data e hora', type: 'datetime' },
        { key: 'number', label: 'Venda nº', type: 'number' },
        { key: 'customer', label: 'Cliente' },
        { key: 'items', label: 'Produtos' },
        { key: 'payments', label: 'Forma de pagamento' },
        { key: 'discount', label: 'Desconto (R$)', type: MONEY },
        { key: 'total', label: 'Total (R$)', type: MONEY },
        { key: 'status', label: 'Situação', statusKey: 'statusKey' },
      ],
      rows: sales.map((sale) => ({
        key: sale.id,
        number: sale.number,
        createdAt: sale.createdAt,
        customer: sale.customerName,
        items: itemsText(sale.items),
        payments: paymentsText(sale.payments),
        discount: sale.discountCents || null,
        total: sale.totalCents,
        status: STATUS_PRESETS[sale.status].label,
        statusKey: sale.status,
      })),
    },
    {
      id: 'dias',
      title: 'Vendido por dia',
      columns: [
        { key: 'date', label: 'Dia', type: 'date' },
        { key: 'sold', label: 'Vendido (R$)', type: MONEY },
        { key: 'count', label: 'Vendas', type: 'number' },
      ],
      rows: days.map((day) => ({
        key: day.date,
        date: day.date,
        sold: day.soldCents,
        count: day.salesCount,
      })),
    },
  ],

  formas: ({ metrics, paymentMix }) => [
    paymentMixSection(paymentMix),
    totalsSection('totais', 'Totais', [
      ['Vendido', metrics.soldCents],
      ['Vendido fiado (a receber)', metrics.fiadoSoldCents],
      ['Taxas da maquininha', metrics.feesCents],
    ]),
  ],

  produtos: ({ topProducts }) => [productsSection(topProducts)],

  fiado: ({ debtors }) => [
    {
      id: 'devedores',
      title: 'Quem me deve',
      columns: [
        { key: 'name', label: 'Cliente' },
        { key: 'phone', label: 'WhatsApp' },
        { key: 'balance', label: 'Deve (R$)', type: MONEY },
        { key: 'overdue', label: 'Atrasado (R$)', type: MONEY },
        { key: 'status', label: 'Situação', statusKey: 'statusKey' },
        { key: 'nextDue', label: 'Próximo vencimento', type: 'date' },
        { key: 'daysOverdue', label: 'Dias de atraso', type: 'number' },
      ],
      rows: debtors.map((row) => ({
        key: row.customer.id,
        name: row.customer.name,
        phone: row.customer.phone ? formatPhone(row.customer.phone) : null,
        balance: row.balanceCents,
        overdue: row.overdueCents || null,
        status: STATUS_PRESETS[row.status].label,
        statusKey: row.status,
        nextDue: row.nextDueDate,
        daysOverdue: row.maxDaysOverdue || null,
      })),
    },
  ],

  estoque: ({ products }) => [
    {
      id: 'estoque',
      title: 'Produtos à venda',
      columns: [
        { key: 'name', label: 'Produto' },
        { key: 'category', label: 'Categoria' },
        { key: 'quantity', label: 'Tem', type: 'number' },
        { key: 'unit', label: 'Unidade' },
        { key: 'status', label: 'Situação', statusKey: 'statusKey' },
        { key: 'cost', label: 'Custo (R$)', type: MONEY },
        { key: 'price', label: 'Preço (R$)', type: MONEY },
        { key: 'stockCost', label: 'Valor parado pelo custo (R$)', type: MONEY },
      ],
      rows: products.map((product) => ({
        key: product.id,
        name: product.name,
        category: label(PRODUCT_CATEGORIES, product.category),
        quantity: product.trackStock ? product.quantity : null,
        unit: unitShort(product.unit),
        status: product.status ? STATUS_PRESETS[product.status].label : 'Sem controle',
        statusKey: product.status,
        cost: product.costCents,
        price: product.priceCents,
        stockCost: product.trackStock && product.quantity > 0 ? product.stockCostCents : null,
      })),
    },
  ],

  caixa: ({ days, expenses, expensesByCategory }) => [
    {
      id: 'dias',
      title: 'Cada dia',
      columns: [
        { key: 'date', label: 'Dia', type: 'date' },
        { key: 'sold', label: 'Vendido (R$)', type: MONEY },
        { key: 'received', label: 'Entrou (R$)', type: MONEY },
        { key: 'expenses', label: 'Despesas (R$)', type: MONEY },
        { key: 'expected', label: 'Esperado na gaveta (R$)', type: MONEY },
        { key: 'counted', label: 'Contado (R$)', type: MONEY },
        { key: 'closing', label: 'Fechamento' },
      ],
      rows: days.map((day) => ({
        key: day.date,
        date: day.date,
        sold: day.soldCents,
        received: day.receivedCents,
        expenses: day.expensesCents,
        expected: day.closing?.expectedCents ?? (day.opened ? day.expectedCashCents : null),
        counted: day.closing?.countedCents ?? null,
        closing: closingText(day),
      })),
    },
    {
      id: 'categorias',
      title: 'Despesas por tipo',
      columns: [
        { key: 'category', label: 'Tipo' },
        { key: 'count', label: 'Quantas', type: 'number' },
        { key: 'amount', label: 'Valor (R$)', type: MONEY },
        { key: 'share', label: 'Parte das despesas', type: 'percent' },
      ],
      rows: expensesByCategory.map((row) => ({
        key: row.category,
        category: label(EXPENSE_CATEGORIES, row.category),
        count: row.count,
        amount: row.amountCents,
        share: row.share,
      })),
    },
    {
      id: 'despesas',
      title: 'Despesas',
      columns: [
        { key: 'createdAt', label: 'Data e hora', type: 'datetime' },
        { key: 'category', label: 'Tipo' },
        { key: 'description', label: 'Descrição' },
        { key: 'method', label: 'Saiu de' },
        { key: 'amount', label: 'Valor (R$)', type: MONEY },
      ],
      rows: expenses.map((expense) => ({
        key: expense.id,
        createdAt: expense.createdAt,
        category: label(EXPENSE_CATEGORIES, expense.category),
        description: expense.description,
        method: label(EXPENSE_METHODS, expense.method),
        amount: expense.amountCents,
      })),
    },
  ],
};

/**
 * Tabelas de um relatório (`getReport`), na ordem da planilha.
 * @param {{ type: string, data: object }} report
 * @returns {ReportSection[]}
 */
export function reportSections(report) {
  return SECTIONS[report.type](report.data);
}

/**
 * O relatório não tem nada para mostrar (nem para levar): nenhuma venda no período,
 * ninguém devendo, nenhum produto ou nenhum movimento no caixa.
 * @param {{ type: string, data: object }} report
 */
export function isReportEmpty({ type, data }) {
  switch (type) {
    case 'resumo':
      return data.current.salesCount === 0 && data.current.expensesCents === 0;
    case 'vendas':
      return data.sales.length === 0;
    case 'formas':
    case 'produtos':
      return data.metrics.salesCount === 0;
    case 'fiado':
      return data.debtors.length === 0;
    case 'estoque':
      return data.products.length === 0;
    case 'caixa':
      return (
        data.metrics.salesCount === 0 && data.expenses.length === 0 && data.metrics.fiadoReceivedCents === 0
      );
    default:
      return false;
  }
}

/**
 * Texto de uma célula na tela e no PDF (a planilha usa `formatCsvValue`): dinheiro com
 * "R$", datas em dd/mm/aaaa e "—" no vazio.
 * @param {unknown} value
 * @param {import('@/lib/csv.js').CsvType} [type='text']
 * @returns {string}
 */
export function formatReportCell(value, type = 'text') {
  if (value === null || value === undefined || value === '') return '—';
  switch (type) {
    case 'money':
      return formatBRL(Number(value));
    case 'number':
      return formatNumber(Number(value));
    case 'percent':
      return formatPercent(Number(value));
    case 'date':
      return formatDate(dateOf(String(value)));
    case 'datetime':
      return `${formatDate(dateOf(String(value)))} ${formatTime(String(value))}`;
    default:
      return String(value);
  }
}

/**
 * A tabela de um `ChartCard` ("Ver os números") a partir de uma seção.
 * @param {ReportSection} section
 */
export function chartTable(section) {
  return {
    caption: section.title,
    columns: section.columns.map((column) => ({
      key: column.key,
      label: column.label,
      numeric: Boolean(column.type && column.type !== 'text' && column.type !== 'date'),
    })),
    rows: section.rows.map((row) => ({
      key: row.key,
      ...Object.fromEntries(
        section.columns.map((column) => [column.key, formatReportCell(row[column.key], column.type)]),
      ),
    })),
  };
}
