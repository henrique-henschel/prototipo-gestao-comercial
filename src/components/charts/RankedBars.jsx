import styles from './charts.module.css';

/**
 * Ranking em barras deitadas feito em HTML (ex.: produtos mais vendidos): posição, nome,
 * valor escrito e uma barra fina proporcional ao maior. Sem espaço, o valor desce para
 * baixo do nome em vez de espremê-lo, e a lista já é a versão acessível (não precisa de tabela).
 *
 * @param {object} props
 * @param {{ key: string, label: string, emoji?: string, value: number, detail?: string }[]} props.items
 *   em ordem, do maior para o menor
 * @param {(value: number) => string} props.formatValue
 * @param {string} props.label nome da lista, para o leitor de tela
 */
export function RankedBars({ items, formatValue, label }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ol className={styles.ranked} aria-label={label}>
      {items.map((item, index) => (
        <li key={item.key} className={styles.rankedRow}>
          <span className={styles.rankedPosition} aria-hidden="true">
            {index + 1}
          </span>
          <span className={styles.rankedText}>
            <span className={styles.rankedHead}>
              <span className={styles.rankedName}>
                {item.emoji && <span aria-hidden="true">{item.emoji} </span>}
                {item.label}
              </span>
              <strong className={styles.rankedValue}>{formatValue(item.value)}</strong>
            </span>
            {item.detail && <span className={styles.rankedDetail}>{item.detail}</span>}
          </span>
          <span className={styles.rankedTrack} aria-hidden="true">
            <span className={styles.rankedBar} style={{ inlineSize: `${(item.value / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ol>
  );
}
