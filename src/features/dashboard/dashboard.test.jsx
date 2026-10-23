import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { periodMetrics, topProducts } from '@/domain/rules/metrics.js';
import { formatBRL } from '@/domain/rules/money.js';
import { periodFromPreset } from '@/domain/rules/period.js';
import { db, resetDemo } from '@/mocks/db.js';
import { DEMO_SESSION, renderApp } from '@/test/renderApp.js';

function metricsOf(preset) {
  return periodMetrics({ ...db, period: periodFromPreset(preset) });
}

async function openHome(path = '/inicio') {
  const user = userEvent.setup();
  const view = renderApp(path, { session: DEMO_SESSION });
  await screen.findByText('Hoje você vendeu');
  return { user, ...view };
}

/** Valor de um StatCard pelo rótulo. */
function statValue(label) {
  return screen.getByText(label, { selector: 'p' }).nextElementSibling;
}

beforeEach(() => {
  resetDemo();
});

describe('início', () => {
  it('mostra quanto vendeu hoje, com "Vender" como ação principal', async () => {
    await openHome();
    const today = metricsOf('hoje');
    expect(screen.getAllByText(formatBRL(today.soldCents)).length).toBeGreaterThan(0);
    const card = screen.getByText('Hoje você vendeu').parentElement;
    expect(card).toHaveTextContent(formatBRL(today.soldCents));
    expect(within(card).getByRole('link', { name: 'Vender' })).toHaveAttribute('href', '/vender');
  });

  it('avisa o que precisa de atenção, com links para as listas filtradas', async () => {
    const { user, router } = await openHome();
    const alerts = screen.getByRole('region', { name: 'Precisa de atenção' });
    const overdue = within(alerts).getByRole('link', { name: /com fiado atrasado/ });
    expect(within(alerts).getByRole('link', { name: /acabando/ })).toHaveAttribute(
      'href',
      '/estoque?situacao=acabando',
    );
    await user.click(overdue);
    await waitFor(() => expect(router.state.location.pathname).toBe('/fiado'));
    expect(router.state.location.search).toBe('?situacao=atrasados');
  });

  it('troca o período dos indicadores e dos gráficos', async () => {
    const { user, router } = await openHome();
    expect(statValue('Vendido')).toHaveTextContent(formatBRL(metricsOf('hoje').soldCents));
    expect(screen.getByText('Comparando com ontem até esta hora.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Últimos 7 dias' }));
    await waitFor(() => expect(router.state.location.search).toBe('?periodo=7dias'));
    const week = metricsOf('7dias');
    expect(statValue('Vendido')).toHaveTextContent(formatBRL(week.soldCents));
    expect(statValue('Recebido')).toHaveTextContent(formatBRL(week.receivedCents));
    expect(statValue('Média por venda')).toHaveTextContent(formatBRL(week.averageTicketCents));
    expect(screen.getByText('Comparando com os 7 dias antes.')).toBeInTheDocument();

    const top = topProducts(db.sales, periodFromPreset('7dias'));
    const ranking = screen.getByRole('list', { name: 'Produtos que mais venderam, pelo valor' });
    const rows = within(ranking).getAllByRole('listitem');
    expect(rows).toHaveLength(top.length);
    expect(rows[0]).toHaveTextContent(top[0].name);
    expect(rows[0]).toHaveTextContent(formatBRL(top[0].revenueCents));
  });

  it('cada gráfico tem os números em tabela', async () => {
    const { user } = await openHome('/inicio?periodo=7dias');
    const chart = screen.getByRole('region', { name: 'Quanto você vendeu nos últimos 7 dias' });
    await user.click(within(chart).getByText('Ver os números'));
    const table = within(chart).getByRole('table', { name: 'Vendido em cada dia' });
    expect(within(table).getAllByRole('row')).toHaveLength(8);
    expect(chart).toHaveTextContent(`Total: ${formatBRL(metricsOf('7dias').soldCents)}`);

    const mix = screen.getByRole('region', { name: /Como os clientes pagaram/ });
    const legend = within(mix).getByRole('list', { name: 'Vendido por forma de pagamento' });
    expect(within(legend).getByText('Pix')).toBeInTheDocument();
  });

  it('sem nenhuma venda, ensina o próximo passo', async () => {
    db.sales = [];
    await openHome();
    expect(screen.getByText('Seus números aparecem aqui')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fazer a primeira venda' })).toHaveAttribute('href', '/vender');
    expect(screen.getByRole('navigation', { name: 'Atalhos' })).toBeInTheDocument();
  });
});
