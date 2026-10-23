import { dateOf } from './date.js';
import { formatDate, formatTime } from './format.js';

/**
 * Planilhas CSV que o Excel em português abre direto (regra 8): separador `;`, decimal
 * com vírgula, BOM UTF-8 (sem ele, o Excel embaralha os acentos) e datas `dd/mm/aaaa`.
 * Os valores entram crus (centavos, ISO, frações) e cada coluna diz o tipo; a conversão
 * para texto acontece só aqui.
 *
 * @typedef {'text'|'money'|'number'|'percent'|'date'|'datetime'} CsvType
 * @typedef {{ key: string, label: string, type?: CsvType }} CsvColumn
 * @typedef {{ title?: string, columns: CsvColumn[], rows: Record<string, unknown>[] }} CsvSection
 */

export const CSV_SEPARATOR = ';';
export const CSV_MIME = 'text/csv;charset=utf-8';
const BOM = '\uFEFF';
const LINE_BREAK = '\r\n';

const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3, useGrouping: false });
const percent = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, useGrouping: false });

/** Centavos como número do Excel, sem "R$" e sem ponto de milhar: 123456 → "1234,56". */
function centsToDecimal(cents) {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  return `${sign}${Math.floor(absolute / 100)},${String(absolute % 100).padStart(2, '0')}`;
}

/**
 * Converte um valor cru no texto da célula.
 * - `money`: centavos → "1234,56"; `number`: até 3 casas, "1,25";
 * - `percent`: fração → "12,5%"; `date`: ISO → "23/10/2026" (dia civil local);
 * - `datetime`: ISO → "23/10/2026 14:35"; `text`: como está.
 * Vazio (`null`, `undefined` ou "") vira célula vazia.
 * @param {unknown} value
 * @param {CsvType} [type='text']
 * @returns {string}
 */
export function formatCsvValue(value, type = 'text') {
  if (value === null || value === undefined || value === '') return '';
  switch (type) {
    case 'money':
      return centsToDecimal(Number(value));
    case 'number':
      return number.format(Number(value));
    case 'percent':
      return `${percent.format(Number(value) * 100)}%`;
    case 'date':
      return formatDate(dateOf(String(value)));
    case 'datetime':
      return `${formatDate(dateOf(String(value)))} ${formatTime(String(value))}`;
    default:
      return String(value);
  }
}

/**
 * Protege a célula: aspas quando há separador, aspas ou quebra de linha, e um apóstrofo
 * antes de textos que o Excel leria como fórmula ("=", "+", "-", "@").
 * @param {string} text
 * @param {CsvType} [type='text']
 */
export function escapeCsvCell(text, type = 'text') {
  const safe = type === 'text' && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[;"\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/**
 * Monta a planilha: linhas de cabeçalho (nome do negócio, período...), uma linha em
 * branco e cada seção com o título, os nomes das colunas e as linhas, separadas por uma
 * linha em branco.
 * @param {CsvSection[]} sections
 * @param {{ header?: string[] }} [options]
 * @returns {string} com BOM e quebras de linha `\r\n`
 */
export function buildCsv(sections, { header = [] } = {}) {
  const lines = header.map((line) => escapeCsvCell(line));
  for (const section of sections) {
    if (lines.length > 0) lines.push('');
    if (section.title) lines.push(escapeCsvCell(section.title));
    lines.push(section.columns.map((column) => escapeCsvCell(column.label)).join(CSV_SEPARATOR));
    for (const row of section.rows) {
      lines.push(
        section.columns
          .map((column) => escapeCsvCell(formatCsvValue(row[column.key], column.type), column.type))
          .join(CSV_SEPARATOR),
      );
    }
  }
  return BOM + lines.join(LINE_BREAK) + LINE_BREAK;
}

/**
 * Baixa o texto como arquivo `.csv` (no celular, vai para os downloads).
 * @param {string} filename ex.: "relatorio-vendas-2026-10-01-a-2026-10-23.csv"
 * @param {string} content resultado de `buildCsv`
 */
export function downloadCsv(filename, content) {
  const url = URL.createObjectURL(new Blob([content], { type: CSV_MIME }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // O navegador precisa do endereço até começar o download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
