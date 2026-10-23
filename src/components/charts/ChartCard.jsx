import { useId } from 'react';
import { Table } from 'lucide-react';
import { Card } from '@/components/ui';
import { cx } from '@/lib/cx.js';
import styles from './charts.module.css';

/**
 * Moldura de todo gráfico: título em linguagem simples, o valor principal escrito
 * (quem não lê gráfico entende pelo texto) e a tabela com os mesmos números, que abre
 * em "Ver os números". O gráfico em si é decorativo para o leitor de tela: a tabela é a
 * versão acessível.
 *
 * @param {object} props
 * @param {string} props.title ex.: "Quanto você vendeu nos últimos 7 dias"
 * @param {import('react').ReactNode} [props.summary] o valor principal, já escrito
 * @param {{ caption: string, columns: { key: string, label: string, numeric?: boolean }[],
 *   rows: Record<string, import('react').ReactNode>[] }} [props.table]
 * @param {'h2'|'h3'} [props.headingLevel='h2']
 * @param {import('react').ReactNode} props.children o gráfico
 */
export function ChartCard({ title, summary, table, headingLevel: Heading = 'h2', className, children }) {
  const titleId = useId();
  return (
    <Card as="section" aria-labelledby={titleId} className={cx(styles.card, className)}>
      <header className={styles.header}>
        <Heading id={titleId} className={styles.title}>
          {title}
        </Heading>
        {summary && <div className={styles.summary}>{summary}</div>}
      </header>

      <div className={styles.plot}>{children}</div>

      {table && (
        <details className={styles.details}>
          <summary>
            <Table size={20} aria-hidden="true" />
            Ver os números
          </summary>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className="visually-hidden">{table.caption}</caption>
              <thead>
                <tr>
                  {table.columns.map((column) => (
                    <th key={column.key} scope="col" className={cx(column.numeric && styles.numeric)}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, index) => (
                  <tr key={row.key ?? index}>
                    {table.columns.map((column, position) =>
                      position === 0 ? (
                        <th key={column.key} scope="row">
                          {row[column.key]}
                        </th>
                      ) : (
                        <td key={column.key} className={cx(column.numeric && styles.numeric)}>
                          {row[column.key]}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </Card>
  );
}
