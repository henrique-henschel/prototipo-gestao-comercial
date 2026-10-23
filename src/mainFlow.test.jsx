import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { summarizeCashDay } from '@/domain/rules/cash.js';
import { customerFiadoSummary } from '@/domain/rules/fiado.js';
import { periodMetrics } from '@/domain/rules/metrics.js';
import { formatBRL } from '@/domain/rules/money.js';
import { periodFromPreset } from '@/domain/rules/period.js';
import { today } from '@/lib/date.js';
import { db, resetDemo } from '@/mocks/db.js';
import { renderApp } from '@/test/renderApp.js';

/**
 * Fluxo de ponta a ponta da seção 9 do plano, num app só (o estado em memória passa de
 * uma tela para a outra): entrar pela demonstração → vender em dinheiro, Pix, fiado e
 * dividido → desfazer → receber parte do fiado → entrada de estoque → fechar o dia →
 * Início com tudo isso → baixar a planilha e imprimir.
 */

function findHeading(name) {
  return screen.findByRole('heading', { level: 1, name });
}

function soldToday() {
  return periodMetrics({ ...db, period: periodFromPreset('hoje') }).soldCents;
}

function expectedInDrawer() {
  const cashDay = db.cashDays.find((cash) => cash.date === today());
  return summarizeCashDay({ date: today(), ...db, cashDay }).expectedCashCents;
}

/** Cliente sem dívida e liberado para o fiado (os dados de exemplo mudam com o dia). */
function freeCustomer() {
  return db.customers.find(
    (customer) =>
      !customer.archived &&
      !customer.fiadoBlocked &&
      customerFiadoSummary(customer, db.fiadoAccounts).balanceCents === 0,
  );
}

beforeEach(() => {
  resetDemo();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete URL.createObjectURL;
  delete URL.revokeObjectURL;
});

it('fluxo principal: vender, desfazer, fiado, estoque, caixa, Início e relatório', async () => {
  const user = userEvent.setup();
  const { router } = renderApp('/entrar');
  const go = (path) => act(() => router.navigate(path));

  /** Monta o carrinho com cafezinhos (sem controle de estoque) e vai para o pagamento. */
  async function startSale(cafezinhos) {
    await go('/vender');
    await findHeading('Vender');
    const products = await screen.findByRole('list', { name: 'Produtos' });
    for (let i = 0; i < cafezinhos; i += 1) {
      await user.click(within(products).getByRole('button', { name: /^Cafezinho/ }));
    }
    await user.click(screen.getByRole('button', { name: 'Cobrar' }));
    await findHeading('Cobrar');
  }

  async function finishSale() {
    await findHeading('Venda concluída!');
    return db.sales.at(-1);
  }

  // 1. Entrar com a conta de demonstração.
  await user.click(await screen.findByRole('button', { name: 'Entrar com conta de demonstração' }));
  await findHeading('Início');
  const soldBefore = soldToday();
  const salesBefore = db.sales.length;

  // 2. Dinheiro, com troco.
  await startSale(2);
  await user.click(screen.getByRole('button', { name: 'Dinheiro' }));
  await user.click(screen.getByRole('button', { name: 'R$ 10,00' }));
  expect(screen.getByText('Troco').parentElement).toHaveTextContent('R$ 5,00');
  await user.click(screen.getByRole('button', { name: 'Concluir venda' }));
  expect(await finishSale()).toMatchObject({ totalCents: 500, changeCents: 500 });

  // 3. Pix.
  await startSale(1);
  await user.click(screen.getByRole('button', { name: 'Pix' }));
  await user.click(screen.getByRole('button', { name: 'Recebi o Pix' }));
  expect((await finishSale()).payments).toEqual([
    expect.objectContaining({ method: 'pix', amountCents: 250 }),
  ]);

  // 4. Fiado, para quem não deve nada.
  const customer = freeCustomer();
  await startSale(4);
  await user.click(screen.getByRole('button', { name: 'Fiado' }));
  await user.click(screen.getByRole('button', { name: 'Escolher cliente' }));
  const picker = await screen.findByRole('dialog', { name: 'Quem está comprando?' });
  await user.click(within(picker).getByRole('button', { name: new RegExp(`^${customer.name}`) }));
  await user.click(screen.getByRole('button', { name: 'Anotar no fiado' }));
  expect(await finishSale()).toMatchObject({ customerId: customer.id, totalCents: 1000 });
  expect(customerFiadoSummary(customer, db.fiadoAccounts).balanceCents).toBe(1000);

  // 5. Dividida: Pix e dinheiro.
  await startSale(2);
  await user.click(screen.getByRole('button', { name: 'Dividir em mais de uma forma' }));
  await user.click(screen.getByRole('button', { name: 'Escolher a primeira forma' }));
  let sheet = await screen.findByRole('dialog', { name: 'Adicionar forma de pagamento' });
  await user.click(within(sheet).getByRole('button', { name: 'Pix' }));
  await user.type(within(sheet).getByRole('textbox', { name: 'Quanto em pix?' }), '200');
  await user.click(within(sheet).getByRole('button', { name: 'Adicionar' }));
  await user.click(await screen.findByRole('button', { name: 'Adicionar outra forma' }));
  sheet = await screen.findByRole('dialog', { name: 'Adicionar forma de pagamento' });
  await user.click(within(sheet).getByRole('button', { name: 'Dinheiro' }));
  await user.type(within(sheet).getByRole('textbox', { name: 'Quanto em dinheiro?' }), '300');
  await user.click(within(sheet).getByRole('button', { name: 'Adicionar' }));
  await user.click(await screen.findByRole('button', { name: 'Concluir venda' }));
  expect((await finishSale()).payments.map((payment) => payment.method)).toEqual(['pix', 'dinheiro']);

  // 6. Uma venda a mais, desfeita pelo aviso.
  await startSale(1);
  await user.click(screen.getByRole('button', { name: 'Pix' }));
  await user.click(screen.getByRole('button', { name: 'Recebi o Pix' }));
  await finishSale();
  // Os avisos ficam num popover, que o jsdom não abre: por isso `hidden: true`.
  await user.click(await screen.findByRole('button', { name: 'Desfazer', hidden: true }));
  await waitFor(() => expect(db.sales).toHaveLength(salesBefore + 4));
  expect(soldToday()).toBe(soldBefore + 500 + 250 + 1000 + 500);

  // 7. O cliente paga parte do fiado.
  await go(`/fiado/${customer.id}`);
  await findHeading(customer.name);
  await user.click(await screen.findByRole('button', { name: 'Receber pagamento' }));
  sheet = await screen.findByRole('dialog', { name: /Receber de/ });
  await user.type(within(sheet).getByLabelText('Quanto está pagando?'), '400');
  await user.click(within(sheet).getByRole('button', { name: 'Dinheiro' }));
  await user.click(within(sheet).getByRole('button', { name: 'Receber R$ 4,00' }));
  await waitFor(() => expect(customerFiadoSummary(customer, db.fiadoAccounts).balanceCents).toBe(600));

  // 8. Chegou mercadoria.
  await go('/estoque');
  const coxinha = db.products.find((product) => product.name === 'Coxinha');
  const stockBefore = coxinha.quantity;
  await user.click(await screen.findByRole('button', { name: /^Entrada\s*de Coxinha$/ }));
  sheet = await screen.findByRole('dialog', { name: 'Chegou mercadoria: Coxinha' });
  await user.click(within(sheet).getByRole('button', { name: '12 un' }));
  await user.click(within(sheet).getByRole('button', { name: 'Dar entrada' }));
  await waitFor(() => expect(db.products.find((p) => p.id === coxinha.id).quantity).toBe(stockBefore + 12));

  // 9. Fechar o dia com o dinheiro certinho (as vendas e o fiado em dinheiro entraram).
  await go('/caixa');
  await screen.findByText('Deve ter na gaveta agora');
  const expected = expectedInDrawer();
  await user.click(screen.getByRole('button', { name: 'Fechar o dia' }));
  sheet = await screen.findByRole('dialog', { name: 'Fechar o dia' });
  await user.type(within(sheet).getByLabelText(/Quanto dinheiro tem na gaveta/), String(expected));
  await user.click(within(sheet).getByRole('button', { name: 'Fechar o dia' }));
  await waitFor(() =>
    expect(db.cashDays.find((cash) => cash.date === today())).toMatchObject({ countedCents: expected }),
  );

  // 10. O Início mostra o que foi vendido hoje.
  await go('/inicio');
  const hero = (await screen.findByText('Hoje você vendeu')).parentElement;
  await waitFor(() => expect(hero).toHaveTextContent(formatBRL(soldToday())));

  // 11. Relatório de hoje: planilha e impressão.
  const createObjectURL = vi.fn(() => 'blob:relatorio');
  Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
  const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  await go('/relatorios?tipo=vendas&periodo=hoje');
  const excel = await screen.findByRole('button', { name: 'Baixar para o Excel' });
  await waitFor(() => expect(excel).toBeEnabled());
  await user.click(excel);
  expect(download.mock.contexts[0].download).toBe(`relatorio-vendas-${today()}.csv`);
  const csv = await createObjectURL.mock.calls[0][0].text();
  expect(csv).toContain(customer.name);
  await user.click(screen.getByRole('button', { name: 'Imprimir ou salvar em PDF' }));
  expect(print).toHaveBeenCalledTimes(1);
  // Um fluxo inteiro, com onze telas: mais tempo que os testes de uma tela só.
}, 60_000);
