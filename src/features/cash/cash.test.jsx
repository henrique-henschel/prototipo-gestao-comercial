import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { summarizeCashDay } from '@/domain/rules/cash.js';
import { formatBRL } from '@/domain/rules/money.js';
import { dateOf, today } from '@/lib/date.js';
import { db, resetDemo } from '@/mocks/db.js';
import { DEMO_SESSION, renderApp } from '@/test/renderApp.js';

function todayCash() {
  return db.cashDays.find((cash) => cash.date === today());
}

function expectedToday() {
  return summarizeCashDay({ date: today(), ...db, cashDay: todayCash() }).expectedCashCents;
}

async function openCash(path = '/caixa') {
  const user = userEvent.setup();
  const view = renderApp(path, { session: DEMO_SESSION });
  return { user, ...view };
}

/**
 * Os dados de exemplo sorteiam as despesas de cada dia (lição "Dados de exemplo dependem do
 * dia"): se hoje ainda não tem nenhuma, o teste lança uma antes de abrir a tela.
 */
function ensureExpenseToday() {
  if (db.expenses.some((item) => dateOf(item.createdAt) === today())) return;
  db.expenses.push({
    id: 'desp_teste',
    description: 'Saco de gelo',
    category: 'mercadoria',
    amountCents: 800,
    method: 'dinheiro',
    createdAt: new Date().toISOString(),
  });
}

async function typeMoney(user, input, digits) {
  await user.clear(input);
  await user.type(input, digits);
}

beforeEach(() => {
  resetDemo();
});

describe('caixa do dia', () => {
  it('abre o caixa com o troco inicial', async () => {
    db.cashDays = db.cashDays.filter((cash) => cash.date !== today());
    const { user } = await openCash();
    await screen.findByText('Caixa ainda não aberto');
    await typeMoney(user, screen.getByLabelText(/Quanto tem de troco na gaveta/), '8000');
    await user.click(screen.getByRole('button', { name: 'Abrir o caixa' }));

    await waitFor(() => expect(todayCash()).toMatchObject({ openingCents: 8000, closedAt: null }));
    expect(await screen.findByRole('button', { name: 'Fechar o dia' })).toBeInTheDocument();
    expect(screen.getByText(/^Caixa aberto desde/)).toBeInTheDocument();
  });

  it('mostra o dinheiro esperado na gaveta e corrige o troco inicial', async () => {
    const { user } = await openCash();
    expect(await screen.findByText('Deve ter na gaveta agora')).toBeInTheDocument();
    const before = expectedToday();
    expect(screen.getAllByText(formatBRL(before)).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /^Mudar/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Troco inicial' });
    await typeMoney(user, within(sheet).getByLabelText(/Quanto tinha na gaveta/), '10000');
    await user.click(within(sheet).getByRole('button', { name: 'Salvar troco inicial' }));

    await waitFor(() => expect(todayCash().openingCents).toBe(10000));
    expect(expectedToday()).toBe(before + 10000 - 5000);
    expect(await screen.findAllByText(formatBRL(expectedToday()))).not.toHaveLength(0);
  });

  it('lança despesa em dinheiro, que sai da gaveta, com "Desfazer"', async () => {
    const { user } = await openCash();
    await screen.findByText('Deve ter na gaveta agora');
    const before = { count: db.expenses.length, expected: expectedToday() };

    await user.click(screen.getByRole('button', { name: 'Lançar despesa' }));
    const sheet = await screen.findByRole('dialog', { name: 'Lançar despesa' });
    await user.click(within(sheet).getByRole('button', { name: 'Lançar despesa' }));
    expect(within(sheet).getByText('Escolha com o que gastou.')).toBeInTheDocument();
    expect(within(sheet).getByText('Digite quanto gastou.')).toBeInTheDocument();

    await user.click(within(sheet).getByRole('button', { name: /Mercadoria/ }));
    expect(within(sheet).getByRole('note')).toHaveTextContent('Dê entrada no estoque');
    await user.click(within(sheet).getByRole('button', { name: /Outros/ }));
    expect(within(sheet).queryByRole('note')).not.toBeInTheDocument();
    await typeMoney(user, within(sheet).getByLabelText(/Quanto gastou/), '1500');
    await user.type(within(sheet).getByLabelText(/O que foi/), 'Gelo');
    await user.click(within(sheet).getByRole('button', { name: 'Lançar despesa' }));

    await waitFor(() => expect(db.expenses).toHaveLength(before.count + 1));
    expect(db.expenses.at(-1)).toMatchObject({
      description: 'Gelo',
      category: 'outros',
      method: 'dinheiro',
      amountCents: 1500,
    });
    expect(expectedToday()).toBe(before.expected - 1500);
    const list = await screen.findByRole('list', { name: 'Despesas do dia' });
    expect(list).toHaveTextContent('Gelo');

    await user.click(screen.getByRole('button', { name: 'Desfazer', hidden: true }));
    await waitFor(() => expect(db.expenses).toHaveLength(before.count));
    // Se o Gelo era a única despesa do dia, a lista dá lugar ao "nenhuma despesa".
    await waitFor(() => expect(screen.queryByText('Gelo')).not.toBeInTheDocument());
  });

  it('apaga uma despesa e o "Desfazer" devolve a mesma despesa', async () => {
    ensureExpenseToday();
    const { user } = await openCash();
    const list = await screen.findByRole('list', { name: 'Despesas do dia' });
    const expense = db.expenses.find((item) => dateOf(item.createdAt) === today());

    await user.click(
      within(list).getByRole('button', { name: new RegExp(`^Apagar.*${expense.description}`) }),
    );
    await waitFor(() => expect(db.expenses.some((item) => item.id === expense.id)).toBe(false));
    expect(await screen.findByText('Despesa apagada')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Desfazer', hidden: true }));
    await waitFor(() => expect(db.expenses.find((item) => item.id === expense.id)).toEqual(expense));
    await waitFor(() =>
      expect(screen.getByRole('list', { name: 'Despesas do dia' })).toHaveTextContent(expense.description),
    );
  });

  it('fecha o dia mostrando o que sobrou, e reabre', async () => {
    const { user } = await openCash();
    await screen.findByText('Deve ter na gaveta agora');
    const expected = expectedToday();
    const counted = expected + 300;

    await user.click(screen.getByRole('button', { name: 'Fechar o dia' }));
    const sheet = await screen.findByRole('dialog', { name: 'Fechar o dia' });
    await typeMoney(user, within(sheet).getByLabelText(/Quanto dinheiro tem na gaveta/), String(counted));
    expect(within(sheet).getByText(`Sobrou ${formatBRL(300)}`)).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Fechar o dia' }));

    await waitFor(() =>
      expect(todayCash()).toMatchObject({ countedCents: counted, expectedCents: expected }),
    );
    expect(await screen.findByText('Você contou')).toBeInTheDocument();
    expect(screen.getAllByText(`Sobrou ${formatBRL(300)}`).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Lançar despesa' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Apagar/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reabrir o dia' }));
    await waitFor(() => expect(todayCash()).toMatchObject({ closedAt: null, countedCents: null }));
    expect(await screen.findByRole('button', { name: 'Fechar o dia' })).toBeInTheDocument();
  });

  it('consulta um dia anterior, só para ver', async () => {
    const { user } = await openCash();
    const days = await screen.findByRole('list', { name: 'Dias anteriores' });
    const past = db.cashDays
      .filter((cash) => cash.date !== today())
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    await user.click(within(days).getAllByRole('link')[0]);
    expect(await screen.findByRole('heading', { level: 1, name: /^Caixa de/ })).toBeInTheDocument();
    expect(screen.getByText('Você contou')).toBeInTheDocument();
    expect(screen.getAllByText(formatBRL(past.countedCents)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Lançar despesa' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voltar para hoje/ })).toBeInTheDocument();
  });
});
