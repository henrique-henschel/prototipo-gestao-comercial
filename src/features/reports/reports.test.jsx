import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fiadoIndicators } from '@/domain/rules/fiado.js';
import { periodMetrics } from '@/domain/rules/metrics.js';
import { formatBRL } from '@/domain/rules/money.js';
import { filterByPeriod, periodFromPreset } from '@/domain/rules/period.js';
import { addDays, today } from '@/lib/date.js';
import { db, resetDemo } from '@/mocks/db.js';
import { configureApi } from '@/services/api.js';
import { DEMO_SESSION, renderApp } from '@/test/renderApp.js';

async function openReports(path = '/relatorios') {
  const user = userEvent.setup();
  const view = renderApp(path, { session: DEMO_SESSION });
  await screen.findByRole('button', { name: 'Baixar para o Excel' });
  return { user, ...view };
}

/** Valor de um StatCard pelo rótulo. */
function statValue(label) {
  return screen.getByText(label, { selector: 'p' }).nextElementSibling;
}

const exportButton = () => screen.getByRole('button', { name: 'Baixar para o Excel' });

beforeEach(() => {
  resetDemo();
  configureApi({ failing: false, slow: false });
});

afterEach(() => {
  vi.restoreAllMocks();
  delete URL.createObjectURL;
  delete URL.revokeObjectURL;
});

describe('relatórios', () => {
  it('abre no resumo deste mês, com os mesmos números das regras', async () => {
    await openReports();
    const month = periodMetrics({ ...db, period: periodFromPreset('este_mes') });
    await waitFor(() => expect(statValue('Vendido')).toHaveTextContent(formatBRL(month.soldCents)));
    expect(statValue('Lucro estimado')).toHaveTextContent(formatBRL(month.profitCents));
    const summary = screen.getByRole('table', { name: 'Resumo do período' });
    expect(within(summary).getByRole('row', { name: /Despesas/ })).toHaveTextContent(
      formatBRL(month.expensesCents),
    );
    expect(screen.getByRole('button', { name: 'Este mês' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('troca o tipo e o período, guardando os filtros na barra de endereço', async () => {
    const { user, router } = await openReports();
    await user.click(screen.getByRole('button', { name: 'Vendas' }));
    await user.click(screen.getByRole('button', { name: 'Últimos 7 dias' }));
    await waitFor(() => expect(router.state.location.search).toBe('?tipo=vendas&periodo=7dias'));

    const period = periodFromPreset('7dias');
    const sales = filterByPeriod(db.sales, period);
    const table = await screen.findByRole('table', { name: 'Vendas' });
    // Cabeçalho + todas as vendas (as que passam do limite ficam escondidas só pelo CSS).
    expect(within(table).getAllByRole('row', { hidden: true })).toHaveLength(sales.length + 1);
    expect(statValue('Vendas')).toHaveTextContent(String(periodMetrics({ ...db, period }).salesCount));
    expect(screen.getByRole('button', { name: `Ver as ${sales.length} vendas` })).toBeInTheDocument();
  });

  it('"Escolher datas" usa o período digitado e avisa quando as datas não valem', async () => {
    const { user, router } = await openReports('/relatorios?tipo=formas');
    await user.click(screen.getByRole('button', { name: 'Escolher datas' }));
    await waitFor(() => expect(router.state.location.search).toContain('periodo=personalizado'));
    expect(screen.getByLabelText('Do dia')).toHaveValue(`${today().slice(0, 8)}01`);
    expect(screen.getByLabelText('Até o dia')).toHaveValue(today());

    const start = addDays(today(), -3);
    router.navigate(`/relatorios?tipo=formas&periodo=personalizado&de=${start}&ate=${today()}`);
    const metrics = periodMetrics({ ...db, period: { start, end: today() } });
    await waitFor(() => expect(statValue('Vendido')).toHaveTextContent(formatBRL(metrics.soldCents)));

    router.navigate('/relatorios?tipo=formas&periodo=personalizado&de=&ate=');
    expect(await screen.findByText('Escolha as duas datas, até hoje.')).toBeInTheDocument();
    expect(exportButton()).toBeDisabled();
  });

  it('fiado é uma foto de agora: sem período e com quem deve', async () => {
    await openReports('/relatorios?tipo=fiado');
    expect(screen.getByText(/mostra como está agora/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Últimos 7 dias' })).not.toBeInTheDocument();
    const indicators = fiadoIndicators(db.customers, db.fiadoAccounts);
    await waitFor(() =>
      expect(statValue('Para receber')).toHaveTextContent(formatBRL(indicators.receivableCents)),
    );
    const table = screen.getByRole('table', { name: 'Quem me deve' });
    expect(within(table).getAllByRole('row', { hidden: true })).toHaveLength(indicators.debtorsCount + 1);
  });

  it('baixa a planilha do Excel com BOM, ";" e o cabeçalho do negócio', async () => {
    // O jsdom não tem URL.createObjectURL.
    const createObjectURL = vi.fn(() => 'blob:relatorio');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { user } = await openReports('/relatorios?tipo=caixa&periodo=hoje');
    await waitFor(() => expect(exportButton()).toBeEnabled());

    await user.click(exportButton());
    expect(click.mock.contexts[0].download).toBe(`relatorio-caixa-${today()}.csv`);
    const blob = createObjectURL.mock.calls[0][0];
    // O BOM do UTF-8 nos primeiros bytes (o `text()` o descarta ao ler).
    expect([...new Uint8Array(await blob.arrayBuffer()).slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const lines = (await blob.text()).split('\r\n');
    expect(lines[0]).toBe(db.business.name);
    expect(lines[1]).toBe('Relatório: Caixa e despesas');
    expect(lines).toContain(
      'Dia;Vendido (R$);Entrou (R$);Despesas (R$);Esperado na gaveta (R$);Contado (R$);Fechamento',
    );
    expect(await screen.findByText('Planilha baixada', {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it('imprime (PDF) e, sem o menu de compartilhar, envia o resumo no WhatsApp', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const { user } = await openReports('/relatorios?periodo=hoje');
    await waitFor(() => expect(exportButton()).toBeEnabled());

    await user.click(screen.getByRole('button', { name: 'Imprimir ou salvar em PDF' }));
    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.getByText(`Relatório: Resumo geral`)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Enviar resumo no WhatsApp' }));
    const url = new URL(open.mock.calls[0][0]);
    expect(url.origin).toBe('https://wa.me');
    const message = url.searchParams.get('text');
    expect(message).toContain(`*${db.business.name}*`);
    expect(message).toContain('Relatório: Resumo geral');
    const metrics = periodMetrics({ ...db, period: periodFromPreset('hoje') });
    expect(message).toContain(`Vendido: ${formatBRL(metrics.soldCents)}`);
  });

  it('mostra o erro com "Tentar de novo"', async () => {
    const { user } = await openReports();
    configureApi({ failing: true });
    await user.click(screen.getByRole('button', { name: 'Estoque' }));
    expect(await screen.findByText('Não deu para montar o relatório')).toBeInTheDocument();

    configureApi({ failing: false });
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('table', { name: 'Produtos à venda' })).toBeInTheDocument();
  });

  it('sem vendas no período, ensina o próximo passo e não deixa levar o relatório', async () => {
    db.sales = [];
    db.expenses = [];
    db.fiadoPayments = [];
    await openReports('/relatorios?tipo=vendas');
    expect(await screen.findByText('Nenhuma venda nesse período')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fazer uma venda' })).toHaveAttribute('href', '/vender');
    expect(exportButton()).toBeDisabled();
  });
});
