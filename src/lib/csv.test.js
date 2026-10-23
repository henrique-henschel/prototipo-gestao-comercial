import { buildCsv, downloadCsv, escapeCsvCell, formatCsvValue } from './csv.js';

/** Instante local, para o teste não depender do fuso. */
const at = (day, hour, minute = 0) => new Date(2026, 9, day, hour, minute).toISOString();

describe('formatCsvValue (regra 8)', () => {
  it('dinheiro sai com vírgula e sem "R$" nem ponto de milhar', () => {
    expect(formatCsvValue(123456, 'money')).toBe('1234,56');
    expect(formatCsvValue(5, 'money')).toBe('0,05');
    expect(formatCsvValue(-1250, 'money')).toBe('-12,50');
    expect(formatCsvValue(0, 'money')).toBe('0,00');
  });

  it('números e porcentagens com vírgula', () => {
    expect(formatCsvValue(1.25, 'number')).toBe('1,25');
    expect(formatCsvValue(1500, 'number')).toBe('1500');
    expect(formatCsvValue(0.125, 'percent')).toBe('12,5%');
  });

  it('datas em dd/mm/aaaa, pelo dia civil local', () => {
    expect(formatCsvValue('2026-10-05', 'date')).toBe('05/10/2026');
    expect(formatCsvValue(at(5, 23, 30), 'date')).toBe('05/10/2026');
    expect(formatCsvValue(at(5, 9, 7), 'datetime')).toBe('05/10/2026 09:07');
  });

  it('vazio vira célula vazia', () => {
    expect(formatCsvValue(null, 'money')).toBe('');
    expect(formatCsvValue(undefined)).toBe('');
    expect(formatCsvValue('')).toBe('');
  });
});

describe('escapeCsvCell', () => {
  it('põe aspas quando há separador, aspas ou quebra de linha', () => {
    expect(escapeCsvCell('Pão; leite')).toBe('"Pão; leite"');
    expect(escapeCsvCell('Bolo "da vó"')).toBe('"Bolo ""da vó"""');
    expect(escapeCsvCell('linha 1\nlinha 2')).toBe('"linha 1\nlinha 2"');
    expect(escapeCsvCell('Água')).toBe('Água');
  });

  it('impede que um texto vire fórmula no Excel', () => {
    expect(escapeCsvCell('=SOMA(A1)')).toBe("'=SOMA(A1)");
    expect(escapeCsvCell('-12,50', 'money')).toBe('-12,50');
  });
});

describe('buildCsv', () => {
  it('tem BOM, cabeçalho, seções separadas por linha em branco e ";" entre colunas', () => {
    const csv = buildCsv(
      [
        {
          title: 'Vendas',
          columns: [
            { key: 'day', label: 'Dia', type: 'date' },
            { key: 'name', label: 'Cliente' },
            { key: 'total', label: 'Total (R$)', type: 'money' },
          ],
          rows: [
            { day: '2026-10-21', name: 'Ana', total: 1250 },
            { day: '2026-10-22', name: null, total: 300 },
          ],
        },
        { columns: [{ key: 'n', label: 'Vendas', type: 'number' }], rows: [{ n: 2 }] },
      ],
      { header: ['Barraca da Rosa', 'Período: 21/10/2026 a 22/10/2026'] },
    );

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv.slice(1).split('\r\n')).toEqual([
      'Barraca da Rosa',
      'Período: 21/10/2026 a 22/10/2026',
      '',
      'Vendas',
      'Dia;Cliente;Total (R$)',
      '21/10/2026;Ana;12,50',
      '22/10/2026;;3,00',
      '',
      'Vendas',
      '2',
      '',
    ]);
  });
});

describe('downloadCsv', () => {
  it('baixa um arquivo .csv com o tipo certo', async () => {
    const createObjectURL = vi.fn(() => 'blob:relatorio');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL }); // o jsdom não tem
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.useFakeTimers();

    downloadCsv('relatorio.csv', '\uFEFFa;b');

    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe('text/csv;charset=utf-8');
    expect(click).toHaveBeenCalledTimes(1);
    expect(click.mock.contexts[0].download).toBe('relatorio.csv');
    expect(document.querySelector('a[download]')).toBeNull();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:relatorio');

    vi.useRealTimers();
    click.mockRestore();
    delete URL.createObjectURL;
    delete URL.revokeObjectURL;
  });
});
