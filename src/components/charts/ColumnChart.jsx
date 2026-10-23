import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMediaQuery } from '@/hooks/useMediaQuery.js';
import { ChartTooltip } from './ChartTooltip.jsx';
import styles from './charts.module.css';

/**
 * Colunas de uma série só (ex.: vendido em cada dia). Uma cor (`--chart-1`), colunas finas
 * com a ponta arredondada, grade horizontal discreta, um eixo Y só e tooltip por coluna
 * ao passar o dedo ou o mouse. Sem legenda: o título do `ChartCard` diz o que é.
 *
 * @param {object} props
 * @param {{ key: string, label: string, title: string, value: number }[]} props.data
 *   `label` vai no eixo ("qua"), `title` no tooltip ("quarta, 21 de out.")
 * @param {string} props.seriesName ex.: "Vendido"
 * @param {(value: number) => string} props.formatValue valor completo (tooltip)
 * @param {(value: number) => string} props.formatTick valor curto (eixo Y)
 * @param {number} [props.height=240] altura total, já com a faixa do eixo X
 * @param {boolean} [props.animate=true] falso em telas que podem ser impressas (relatórios): a
 *   impressão redimensiona o gráfico, e a animação recomeçaria com ele vazio
 */
export function ColumnChart({ data, seriesName, formatValue, formatTick, height = 240, animate = true }) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  return (
    <div className={styles.frame} style={{ blockSize: height }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height }}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, bottom: 0, left: 8 }}
          barCategoryGap="20%"
          accessibilityLayer={false}
        >
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: 'var(--chart-axis)' }}
            interval="preserveStartEnd"
            minTickGap={4}
          />
          <YAxis
            tickFormatter={formatTick}
            tickLine={false}
            axisLine={false}
            width="auto"
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--chart-grid)', opacity: 0.6 }}
            content={<ChartTooltip formatValue={formatValue} formatLabel={(_, item) => item?.title} />}
          />
          <Bar
            dataKey="value"
            name={seriesName}
            fill="var(--chart-1)"
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
            isAnimationActive={animate && !reducedMotion}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
