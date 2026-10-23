import {
  Ban,
  CircleAlert,
  HandCoins,
  Landmark,
  PackageMinus,
  PackageX,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { ChartCard, ColumnChart, DonutChart, RankedBars } from '@/components/charts';
import { StatCard } from '@/components/ui';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, UNITS } from '@/domain/constants.js';
import { formatBRL } from '@/domain/rules/money.js';
import { today as todayISO } from '@/lib/date.js';
import {
  formatDateMedium,
  formatDayOfMonth,
  formatPercent,
  formatQuantity,
  formatWeekdayShort,
  plural,
} from '@/lib/format.js';
import { deltaOf } from '@/features/dashboard/periods.js';
import { PAYMENT_RING_ORDER } from '@/features/dashboard/useDashboard.js';
import { PAYMENT_ICONS } from '@/features/sales/paymentIcons.js';
import { chartTable, reportSections } from '../reportTables.js';
import { comparisonText } from '../reportText.js';
import { ReportTable } from './ReportTable.jsx';
import styles from './ReportPreview.module.css';

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const money = (value) => formatBRL(value);
const compactMoney = (value) => formatBRL(value, { compact: true });

/**
 * Prévia de um relatório na tela (e no PDF): indicadores, gráficos com o valor escrito e
 * tabela, e as tabelas com os mesmos números da planilha (`reportSections`).
 * @param {{ report: { type: string, period: { start: string, end: string }, data: object } }} props
 */
export function ReportPreview({ report }) {
  const sections = Object.fromEntries(reportSections(report).map((section) => [section.id, section]));
  const View = VIEWS[report.type];
  return <View data={report.data} period={report.period} sections={sections} />;
}

function Stats({ children }) {
  return <div className={styles.stats}>{children}</div>;
}

/** Rosca por forma de pagamento, na ordem fixa das cores (a mesma do Início). */
function PaymentChart({ paymentMix, section, title = 'Como os clientes pagaram' }) {
  const byMethod = Object.fromEntries(paymentMix.map((row) => [row.method, row]));
  const data = PAYMENT_RING_ORDER.map((method) => ({
    key: method,
    label: PAYMENT_METHODS[method].label,
    value: byMethod[method]?.amountCents ?? 0,
    share: byMethod[method]?.share ?? 0,
    color: `var(--chart-${PAYMENT_METHODS[method].chartSlot})`,
    icon: PAYMENT_ICONS[method],
  }));
  const mostUsed = data.reduce((top, row) => (row.value > top.value ? row : top), data[0]);

  return (
    <ChartCard
      title={title}
      headingLevel="h3"
      summary={
        mostUsed.value > 0 ? (
          <p>
            Mais usado: <strong>{mostUsed.label}</strong>, {formatPercent(mostUsed.share)} do vendido
          </p>
        ) : undefined
      }
      table={mostUsed.value > 0 ? chartTable(section) : undefined}
    >
      {mostUsed.value > 0 ? (
        <DonutChart
          data={data}
          formatValue={money}
          totalLabel="Vendido"
          legendLabel="Vendido por forma de pagamento"
          animate={false}
        />
      ) : (
        <p className={styles.muted}>Nenhuma venda no período.</p>
      )}
    </ChartCard>
  );
}

function TopProductsChart({ products, title }) {
  return (
    <ChartCard
      title={title}
      headingLevel="h3"
      summary={
        products.length > 0 ? (
          <p>
            O que mais vendeu: <strong>{products[0].name}</strong>
          </p>
        ) : undefined
      }
    >
      {products.length > 0 ? (
        <RankedBars
          label="Produtos que mais venderam, pelo valor"
          items={products.map((product) => ({
            key: product.productId,
            label: product.name,
            emoji: product.emoji,
            value: product.revenueCents,
            detail: `${formatQuantity(product.quantity, UNITS[product.unit]?.short ?? product.unit)} ${product.quantity === 1 ? 'vendido' : 'vendidos'}`,
          }))}
          formatValue={money}
        />
      ) : (
        <p className={styles.muted}>Nenhum produto vendido no período.</p>
      )}
    </ChartCard>
  );
}

/* ---------- Cada tipo ---------- */

function SummaryView({ data, period, sections }) {
  const { current } = data;
  return (
    <>
      <p className={styles.muted}>Comparando com {comparisonText(period)}.</p>
      <Stats>
        <StatCard
          label="Vendido"
          value={money(current.soldCents)}
          icon={ShoppingBag}
          delta={deltaOf(data.sold)}
        />
        <StatCard
          label="Recebido"
          value={money(current.receivedCents)}
          icon={HandCoins}
          tone="success"
          delta={deltaOf(data.received)}
          hint="Sem o fiado, com o fiado recebido"
        />
        <StatCard
          label="Lucro estimado"
          value={money(current.profitCents)}
          icon={TrendingUp}
          tone={current.profitCents < 0 ? 'danger' : 'accent'}
          delta={deltaOf(data.profit)}
          hint={
            current.hasMissingCost
              ? 'Tem produto sem custo: o lucro pode ser menor'
              : 'Vendido menos custos, taxas e despesas'
          }
        />
        <StatCard
          label="Média por venda"
          value={money(current.averageTicketCents)}
          icon={Receipt}
          tone="info"
          delta={deltaOf(data.averageTicket)}
          hint={plural(current.salesCount, 'venda')}
        />
      </Stats>
      <ReportTable section={sections.resumo} limit={20} />
      <div className={styles.charts}>
        <PaymentChart paymentMix={data.paymentMix} section={sections.formas} />
        <TopProductsChart products={data.topProducts} title="Mais vendidos" />
      </div>
      <ReportTable section={sections.hoje} />
    </>
  );
}

function SalesView({ data, sections }) {
  const { metrics, days } = data;
  const today = todayISO();
  const isLong = days.length > 14;
  const best = days.reduce((top, day) => (day.soldCents > top.soldCents ? day : top), days[0]);
  const chartData = days.map((day) => ({
    key: day.date,
    label: isLong ? formatDayOfMonth(day.date) : formatWeekdayShort(day.date),
    title: `${capitalize(formatDateMedium(day.date))}${day.date === today ? ' (até agora)' : ''}`,
    value: day.soldCents,
  }));

  return (
    <>
      <Stats>
        <StatCard label="Vendido" value={money(metrics.soldCents)} icon={ShoppingBag} />
        <StatCard label="Vendas" value={String(metrics.salesCount)} icon={Receipt} tone="info" />
        <StatCard
          label="Média por venda"
          value={money(metrics.averageTicketCents)}
          icon={TrendingUp}
          tone="accent"
        />
        <StatCard
          label="Canceladas"
          value={String(data.cancelledCount)}
          icon={Ban}
          tone="warning"
          hint="Não entram no vendido"
        />
      </Stats>
      {days.length > 1 && (
        <ChartCard
          title="Quanto vendeu em cada dia"
          headingLevel="h3"
          summary={
            best.soldCents > 0 ? (
              <p>
                Melhor dia: <strong>{capitalize(formatDateMedium(best.date))}</strong>,{' '}
                {money(best.soldCents)}
              </p>
            ) : undefined
          }
          table={chartTable(sections.dias)}
        >
          <ColumnChart
            data={chartData}
            seriesName="Vendido"
            formatValue={money}
            formatTick={compactMoney}
            animate={false}
          />
        </ChartCard>
      )}
      <ReportTable
        section={sections.vendas}
        showAllLabel={`Ver as ${sections.vendas.rows.length} vendas`}
        summary={<p>Da mais antiga para a mais nova.</p>}
      />
    </>
  );
}

function PaymentsView({ data, sections }) {
  const { metrics } = data;
  return (
    <>
      <Stats>
        <StatCard label="Vendido" value={money(metrics.soldCents)} icon={ShoppingBag} />
        <StatCard
          label="Vendido fiado"
          value={money(metrics.fiadoSoldCents)}
          icon={Wallet}
          tone="warning"
          hint="Ainda a receber"
        />
        <StatCard
          label="Taxas da maquininha"
          value={money(metrics.feesCents)}
          icon={Landmark}
          tone="info"
          hint="Não mudam o valor cobrado"
        />
      </Stats>
      <PaymentChart paymentMix={data.paymentMix} section={sections.formas} />
    </>
  );
}

function ProductsView({ data, sections }) {
  const count = data.topProducts.length;
  return (
    <>
      <p className={styles.muted}>
        {plural(count, 'produto vendido', 'produtos vendidos')} no período. Itens de valor avulso não entram.
      </p>
      <TopProductsChart products={data.topProducts.slice(0, 10)} title="Os 10 que mais venderam" />
      <ReportTable section={sections.produtos} showAllLabel={`Ver os ${count} produtos`} />
    </>
  );
}

function FiadoView({ data, sections }) {
  const { indicators } = data;
  return (
    <>
      <Stats>
        <StatCard
          label="Para receber"
          value={money(indicators.receivableCents)}
          icon={Wallet}
          tone="warning"
        />
        <StatCard
          label="Atrasado"
          value={money(indicators.overdueCents)}
          icon={CircleAlert}
          tone="danger"
          hint={plural(indicators.overdueCount, 'cliente atrasado', 'clientes atrasados')}
        />
        <StatCard label="Clientes devendo" value={String(indicators.debtorsCount)} icon={Users} tone="info" />
        <StatCard
          label="Parte atrasada"
          value={formatPercent(indicators.defaultRate)}
          icon={TrendingUp}
          tone="accent"
          hint="Do que tem para receber"
        />
      </Stats>
      <ReportTable
        section={sections.devedores}
        showAllLabel={`Ver os ${sections.devedores.rows.length} clientes`}
        summary={<p>Quem está mais atrasado primeiro.</p>}
      />
    </>
  );
}

function StockView({ data, sections }) {
  const { value } = data;
  return (
    <>
      <Stats>
        <StatCard
          label="Parado no estoque"
          value={money(value.costCents)}
          icon={Landmark}
          hint={
            value.missingCostCount > 0
              ? `Pelo custo; ${plural(value.missingCostCount, 'produto', 'produtos')} sem custo`
              : 'Pelo custo'
          }
        />
        <StatCard
          label="Vale na venda"
          value={money(value.saleCents)}
          icon={TrendingUp}
          tone="success"
          hint="Pelo preço de venda"
        />
        <StatCard label="Acabou" value={String(data.outCount)} icon={PackageX} tone="danger" />
        <StatCard label="Acabando" value={String(data.lowCount)} icon={PackageMinus} tone="warning" />
      </Stats>
      <ReportTable
        section={sections.estoque}
        showAllLabel={`Ver os ${sections.estoque.rows.length} produtos`}
        summary={<p>O que acabou e o que está acabando primeiro.</p>}
      />
    </>
  );
}

function CashView({ data, sections }) {
  const { metrics, expensesByCategory } = data;
  const categories = Object.fromEntries(EXPENSE_CATEGORIES.map((option) => [option.value, option]));
  return (
    <>
      <Stats>
        <StatCard label="Vendido" value={money(metrics.soldCents)} icon={ShoppingBag} />
        <StatCard
          label="Entrou"
          value={money(metrics.receivedCents)}
          icon={HandCoins}
          tone="success"
          hint="Sem o fiado, com o fiado recebido"
        />
        <StatCard label="Despesas" value={money(metrics.expensesCents)} icon={Receipt} tone="danger" />
        <StatCard
          label="Lucro estimado"
          value={money(metrics.profitCents)}
          icon={TrendingUp}
          tone={metrics.profitCents < 0 ? 'danger' : 'accent'}
          hint="Vendido menos custos, taxas e despesas"
        />
      </Stats>
      <ReportTable section={sections.dias} showAllLabel={`Ver os ${sections.dias.rows.length} dias`} />
      <ChartCard
        title="Com o que você gastou"
        headingLevel="h3"
        summary={
          expensesByCategory.length > 0 ? (
            <p>
              Maior gasto: <strong>{categories[expensesByCategory[0].category]?.label}</strong>,{' '}
              {formatPercent(expensesByCategory[0].share)} das despesas
            </p>
          ) : undefined
        }
      >
        {expensesByCategory.length > 0 ? (
          <RankedBars
            label="Despesas por tipo, pelo valor"
            items={expensesByCategory.map((row) => ({
              key: row.category,
              label: categories[row.category]?.label ?? row.category,
              emoji: categories[row.category]?.emoji,
              value: row.amountCents,
              detail: plural(row.count, 'despesa'),
            }))}
            formatValue={money}
          />
        ) : (
          <p className={styles.muted}>Nenhuma despesa no período.</p>
        )}
      </ChartCard>
      <ReportTable
        section={sections.despesas}
        showAllLabel={`Ver as ${sections.despesas.rows.length} despesas`}
        emptyText="Nenhuma despesa no período."
      />
    </>
  );
}

const VIEWS = {
  resumo: SummaryView,
  vendas: SalesView,
  formas: PaymentsView,
  produtos: ProductsView,
  fiado: FiadoView,
  estoque: StockView,
  caixa: CashView,
};
