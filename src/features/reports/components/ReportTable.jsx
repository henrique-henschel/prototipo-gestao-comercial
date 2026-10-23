import { useId, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Card, StatusPill } from '@/components/ui';
import { cx } from '@/lib/cx.js';
import { formatReportCell } from '../reportTables.js';
import styles from './ReportTable.module.css';

const NUMERIC_TYPES = ['money', 'number', 'percent'];

/**
 * Uma tabela do relatório (`ReportSection`), com os mesmos números da planilha.
 * - Em contêiner estreito (celular, texto grande), cada linha vira um bloco com
 *   "rótulo: valor", sem rolagem para o lado.
 * - Na tela, mostra as primeiras `limit` linhas e "Ver todas"; na impressão, todas.
 * - Colunas de situação (`statusKey`) aparecem como `StatusPill`.
 *
 * @param {object} props
 * @param {import('../reportTables.js').ReportSection} props.section
 * @param {number} [props.limit=10]
 * @param {string} [props.showAllLabel] ex.: "Ver as 120 vendas"
 * @param {string} [props.emptyText] quando não há linhas
 * @param {import('react').ReactNode} [props.summary] valor principal escrito, abaixo do título
 */
export function ReportTable({ section, limit = 10, showAllLabel, emptyText, summary }) {
  const titleId = useId();
  const [expanded, setExpanded] = useState(false);
  const { columns, rows } = section;
  const hasMore = rows.length > limit;

  return (
    <Card as="section" aria-labelledby={titleId} className={styles.card}>
      <header className={styles.header}>
        <h3 id={titleId} className={styles.title}>
          {section.title}
        </h3>
        {summary && <div className={styles.summary}>{summary}</div>}
      </header>

      {rows.length === 0 ? (
        <p className={styles.empty}>{emptyText ?? 'Nada para mostrar.'}</p>
      ) : (
        <div className={styles.wrap}>
          <table className={styles.table}>
            <caption className="visually-hidden">{section.title}</caption>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cx(NUMERIC_TYPES.includes(column.type) && styles.numeric)}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.key ?? index} className={cx(!expanded && index >= limit && styles.extra)}>
                  {columns.map((column, position) => {
                    const Cell = position === 0 ? 'th' : 'td';
                    return (
                      <Cell
                        key={column.key}
                        scope={position === 0 ? 'row' : undefined}
                        data-label={column.label}
                        className={cx(NUMERIC_TYPES.includes(column.type) && styles.numeric)}
                      >
                        {column.statusKey && row[column.statusKey] ? (
                          <StatusPill status={row[column.statusKey]} />
                        ) : (
                          formatReportCell(row[column.key], column.type)
                        )}
                      </Cell>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <Button
          variant="secondary"
          icon={expanded ? ChevronUp : ChevronDown}
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className={cx(styles.more, 'no-print')}
        >
          {expanded ? 'Mostrar menos' : (showAllLabel ?? `Ver todas as ${rows.length} linhas`)}
        </Button>
      )}
    </Card>
  );
}
