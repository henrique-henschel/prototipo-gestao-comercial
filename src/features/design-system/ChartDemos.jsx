import { ChartCard, ColumnChart, DonutChart, RankedBars } from '@/components/charts';
import { PAYMENT_METHODS } from '@/domain/constants.js';
import { formatBRL } from '@/domain/rules/money.js';
import { PAYMENT_ICONS } from '@/features/sales/paymentIcons.js';
import { Example, Section } from './Showcase.jsx';
import styles from './DesignSystemPage.module.css';

const WEEK = [
  ['sex', 'Sexta, 16 de out.', 11807],
  ['sáb', 'Sábado, 17 de out.', 9033],
  ['dom', 'Domingo, 18 de out.', 7200],
  ['seg', 'Segunda, 19 de out.', 5750],
  ['ter', 'Terça, 20 de out.', 8278],
  ['qua', 'Quarta, 21 de out.', 5250],
  ['hoje', 'Quinta, 22 de out. (até agora)', 4300],
].map(([label, title, value]) => ({ key: label, label, title, value }));

/** Mesma ordem da rosca do Início (vizinhas validadas para daltonismo). */
const MIX = [
  ['pix', 18400],
  ['credito', 6200],
  ['debito', 4100],
  ['fiado', 3500],
  ['dinheiro', 21300],
].map(([method, value]) => ({
  key: method,
  label: PAYMENT_METHODS[method].label,
  value,
  color: `var(--chart-${PAYMENT_METHODS[method].chartSlot})`,
  icon: PAYMENT_ICONS[method],
}));

const TOP = [
  { key: 'coxinha', label: 'Coxinha', emoji: '🥟', value: 15600, detail: '52 un vendidos' },
  { key: 'suco', label: 'Suco natural', emoji: '🧃', value: 9800, detail: '14 un vendidos' },
  { key: 'bala', label: 'Bala de goma', emoji: '🍬', value: 2500, detail: '5 pct vendidos' },
];

const money = (value) => formatBRL(value);

export function ChartsSection() {
  return (
    <Section
      id="graficos"
      title="Gráficos"
      description="Recharts com as cores --chart-*. Todo gráfico vai num ChartCard: título em linguagem simples, valor principal escrito, tooltip e os números em tabela. Nunca dois eixos Y."
    >
      <div className={styles.exampleGrid}>
        <Example title="ColumnChart" note="Uma série, colunas finas; o eixo X diz o dia" wide>
          <ChartCard
            title="Quanto você vendeu nos últimos 7 dias"
            summary={
              <p>
                Total: <strong>{formatBRL(WEEK.reduce((sum, day) => sum + day.value, 0))}</strong>
              </p>
            }
            table={{
              caption: 'Vendido em cada dia',
              columns: [
                { key: 'day', label: 'Dia' },
                { key: 'sold', label: 'Vendido', numeric: true },
              ],
              rows: WEEK.map((day) => ({ key: day.key, day: day.title, sold: money(day.value) })),
            }}
          >
            <ColumnChart
              data={WEEK}
              seriesName="Vendido"
              formatValue={money}
              formatTick={(value) => formatBRL(value, { compact: true })}
            />
          </ChartCard>
        </Example>
        <Example title="DonutChart" note="Cor fixa por forma de pagamento (chartSlot)">
          <ChartCard title="Como os clientes pagaram">
            <DonutChart
              data={MIX}
              formatValue={money}
              totalLabel="Vendido"
              legendLabel="Vendido por forma de pagamento"
            />
          </ChartCard>
        </Example>
        <Example title="RankedBars" note="Ranking em HTML: nomes longos quebram a linha">
          <ChartCard title="Mais vendidos">
            <RankedBars items={TOP} formatValue={money} label="Produtos que mais venderam" />
          </ChartCard>
        </Example>
      </div>
    </Section>
  );
}
