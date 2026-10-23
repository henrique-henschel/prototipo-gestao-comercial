import styles from './charts.module.css';

/**
 * Conteúdo do tooltip do Recharts no estilo do design system: o valor em destaque e o
 * nome da série em segundo plano, com um traço da cor da série (nunca o texto colorido).
 * Use como `<Tooltip content={<ChartTooltip formatValue={...} />} />`.
 *
 * @param {object} props
 * @param {boolean} [props.active] (Recharts)
 * @param {{ name?: string, value: number, payload: any, color?: string }[]} [props.payload] (Recharts)
 * @param {string|number} [props.label] (Recharts)
 * @param {(value: number, item: any) => string} props.formatValue
 * @param {(label: any, item: any) => string} [props.formatLabel] título do tooltip (ex.: o dia)
 * @param {(item: any) => string} [props.colorOf] cor do traço; padrão: a cor do item
 */
export function ChartTooltip({ active, payload, label, formatValue, formatLabel, colorOf }) {
  if (!active || !payload?.length) return null;
  const first = payload[0];
  const heading = formatLabel ? formatLabel(label, first.payload) : label;
  return (
    <div className={styles.tooltip}>
      {heading && <p className={styles.tooltipTitle}>{heading}</p>}
      <ul role="list" className={styles.tooltipRows}>
        {payload.map((item) => (
          <li key={item.name ?? item.dataKey} className={styles.tooltipRow}>
            <span
              className={styles.key}
              style={{ background: colorOf?.(item.payload) ?? item.color ?? item.payload?.fill }}
              aria-hidden="true"
            />
            <strong>{formatValue(item.value, item.payload)}</strong>
            {item.name && <span className={styles.tooltipName}>{item.name}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
