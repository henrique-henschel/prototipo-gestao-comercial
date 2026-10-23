import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useMediaQuery } from '@/hooks/useMediaQuery.js';
import { formatPercent } from '@/lib/format.js';
import { ChartTooltip } from './ChartTooltip.jsx';
import styles from './charts.module.css';

/**
 * Rosca de partes de um todo (até 6 fatias), com o total escrito no meio e a legenda ao
 * lado: cada fatia tem cor fixa (a da entidade, nunca a do tamanho), nome, valor e
 * porcentagem escritos. As fatias são separadas por um vão da cor da superfície.
 * Fatias zeradas não aparecem. Mantenha a ordem de `data` fixa: as cores vizinhas
 * foram validadas para daltonismo nessa ordem.
 *
 * @param {object} props
 * @param {{ key: string, label: string, value: number, color: string, icon?: import('react').ComponentType<any> }[]} props.data
 * @param {(value: number) => string} props.formatValue
 * @param {string} props.totalLabel ex.: "Total"
 * @param {string} props.legendLabel nome da lista da legenda, para o leitor de tela
 * @param {boolean} [props.animate=true] falso em telas que podem ser impressas (relatórios): a
 *   impressão redimensiona o gráfico, e a animação recomeçaria com ele vazio
 */
export function DonutChart({ data, formatValue, totalLabel, legendLabel, animate = true }) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const slices = data.filter((item) => item.value > 0);
  const total = slices.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={styles.donut}>
      <div className={styles.donutPlot} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 200, height: 200 }}>
          <PieChart accessibilityLayer={false}>
            <Tooltip content={<ChartTooltip formatValue={formatValue} colorOf={(item) => item.color} />} />
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="var(--surface-1)"
              strokeWidth={2}
              // O gráfico é só visual (a legenda tem os valores): fora da ordem do Tab.
              rootTabIndex={-1}
              isAnimationActive={animate && !reducedMotion}
            >
              {slices.map((item) => (
                <Cell key={item.key} fill={item.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className={styles.donutCenter}>
          <span>{totalLabel}</span>
          <strong>{formatValue(total)}</strong>
        </div>
      </div>

      <ul role="list" className={styles.legend} aria-label={legendLabel}>
        {slices.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.key} className={styles.legendRow}>
              <span className={styles.swatch} style={{ background: item.color }} aria-hidden="true" />
              {Icon && <Icon size={20} aria-hidden="true" className={styles.legendIcon} />}
              <span className={styles.legendLabel}>{item.label}</span>
              <span className={styles.legendValue}>
                <strong>{formatValue(item.value)}</strong>
                <span className={styles.legendShare}>
                  {formatPercent(total > 0 ? item.value / total : 0)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
