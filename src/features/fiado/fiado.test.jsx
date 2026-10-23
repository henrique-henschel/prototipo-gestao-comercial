import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { accountBalance, customerFiadoSummary } from '@/domain/rules/fiado.js';
import { formatBRL } from '@/domain/rules/money.js';
import { db, resetDemo } from '@/mocks/db.js';
import { DEMO_SESSION, renderApp } from '@/test/renderApp.js';

function customerByName(name) {
  return db.customers.find((customer) => customer.name === name);
}

function summaryOf(name) {
  return customerFiadoSummary(customerByName(name), db.fiadoAccounts);
}

/** Abre a conta do cliente e espera carregar. */
async function openAccount(name) {
  const user = userEvent.setup();
  const view = renderApp(`/fiado/${customerByName(name).id}`, { session: DEMO_SESSION });
  await screen.findByRole('heading', { level: 1, name });
  return { user, ...view };
}

/** Abre "Receber pagamento", digita o valor e escolhe a forma. */
async function fillReceipt(user, { cents, method }) {
  await user.click(screen.getByRole('button', { name: 'Receber pagamento' }));
  const sheet = await screen.findByRole('dialog', { name: /Receber de/ });
  await user.type(within(sheet).getByLabelText('Quanto está pagando?'), String(cents));
  await user.click(within(sheet).getByRole('button', { name: method }));
  return sheet;
}

beforeEach(() => {
  resetDemo();
});

describe('quem me deve', () => {
  it('lista quem deve do mais urgente para o menos, com indicadores e filtros', async () => {
    const user = userEvent.setup();
    renderApp('/fiado', { session: DEMO_SESSION });
    const list = await screen.findByRole('list', { name: 'Quem me deve' });
    const rows = within(list).getAllByRole('listitem');
    const debtors = db.customers.filter((c) => summaryOf(c.name).openCents > 0);
    expect(rows).toHaveLength(debtors.length);

    // O primeiro é o atrasado há mais tempo.
    const mostOverdue = [...debtors].sort(
      (a, b) => summaryOf(b.name).maxDaysOverdue - summaryOf(a.name).maxDaysOverdue,
    )[0];
    expect(rows[0]).toHaveTextContent(mostOverdue.name);
    expect(rows[0]).toHaveTextContent('Atrasado');
    expect(screen.getByText('Para receber').parentElement).toHaveTextContent(
      formatBRL(debtors.reduce((sum, c) => sum + summaryOf(c.name).openCents, 0)),
    );

    await user.click(screen.getByRole('button', { name: /^Atrasados/ }));
    const overdue = within(list).getAllByRole('listitem');
    expect(overdue.length).toBe(debtors.filter((c) => summaryOf(c.name).overdueCents > 0).length);
    overdue.forEach((row) => expect(row).toHaveTextContent('Atrasado'));

    await user.click(screen.getByRole('button', { name: /^Todos/ }));
    await user.selectOptions(screen.getByLabelText('Mostrar primeiro'), 'valor');
    const biggest = [...debtors].sort(
      (a, b) => summaryOf(b.name).balanceCents - summaryOf(a.name).balanceCents,
    )[0];
    expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent(biggest.name);
  });

  it('"Cobrar no WhatsApp" abre a conversa com a mensagem pronta', async () => {
    renderApp('/fiado', { session: DEMO_SESSION });
    const maria = customerByName('Maria das Graças');
    const link = await screen.findByRole('link', { name: /Cobrar no WhatsApp: Maria das Graças/ });
    const href = link.getAttribute('href');
    expect(href).toMatch(new RegExp(`^https://wa\\.me/55${maria.phone}\\?text=`));
    const text = decodeURIComponent(href.split('?text=')[1]);
    expect(text).toContain('Olá, Maria!');
    expect(text).toContain(formatBRL(summaryOf('Maria das Graças').balanceCents));
    expect(text).toContain('Barraca da Rosa');
  });

  it('"Receber pagamento" pergunta quem está pagando e abre o recebimento', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/fiado', { session: DEMO_SESSION });
    await user.click(await screen.findByRole('button', { name: 'Receber pagamento' }));
    const picker = await screen.findByRole('dialog', { name: 'Quem está pagando?' });
    // Só quem deve aparece, e não há cadastro rápido.
    expect(within(picker).queryByRole('button', { name: /Cadastrar cliente novo/ })).not.toBeInTheDocument();
    expect(within(picker).queryByRole('button', { name: /Luciana Ferreira/ })).not.toBeInTheDocument();
    await user.click(within(picker).getByRole('button', { name: /Maria das Graças/ }));

    await screen.findByRole('heading', { level: 1, name: 'Maria das Graças' });
    expect(await screen.findByRole('dialog', { name: 'Receber de Maria' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/fiado/${customerByName('Maria das Graças').id}`);
    expect(router.state.location.search).toBe('?receber=1');
  });
});

describe('conta do cliente', () => {
  it('recebe parte da dívida quitando a compra mais antiga primeiro, com "Desfazer"', async () => {
    const { user } = await openAccount('João Batista');
    const joao = customerByName('João Batista');
    const before = summaryOf('João Batista');
    const oldest = db.fiadoAccounts
      .filter((a) => a.customerId === joao.id && accountBalance(a) > 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
    const paymentsBefore = db.fiadoPayments.length;

    const sheet = await fillReceipt(user, { cents: 1000, method: 'Pix' });
    expect(sheet).toHaveTextContent(`Depois disso, João ainda deve ${formatBRL(before.balanceCents - 1000)}`);
    await user.click(within(sheet).getByRole('button', { name: 'Receber R$ 10,00' }));

    await waitFor(() => expect(db.fiadoPayments).toHaveLength(paymentsBefore + 1));
    const payment = db.fiadoPayments.at(-1);
    expect(payment).toMatchObject({ customerId: joao.id, amountCents: 1000, method: 'pix' });
    expect(payment.allocations[0]).toEqual({ accountId: oldest.id, amountCents: 1000 });
    expect(summaryOf('João Batista').balanceCents).toBe(before.balanceCents - 1000);
    expect(await screen.findByText('Recebido R$ 10,00 de João')).toBeInTheDocument();
    const history = screen.getByRole('list', { name: 'Histórico do fiado' });
    expect(within(history).getAllByRole('listitem')[0]).toHaveTextContent('Pagou em Pix');

    await user.click(screen.getByRole('button', { name: 'Desfazer', hidden: true }));
    await waitFor(() => expect(db.fiadoPayments).toHaveLength(paymentsBefore));
    expect(summaryOf('João Batista').balanceCents).toBe(before.balanceCents);
    expect(await screen.findByText('Recebimento desfeito')).toBeInTheDocument();
  });

  it('o valor acima da dívida só vira crédito com o botão próprio', async () => {
    const { user } = await openAccount('Maria das Graças');
    const maria = customerByName('Maria das Graças');
    const due = summaryOf('Maria das Graças').balanceCents;

    const sheet = await fillReceipt(user, { cents: due + 500, method: 'Dinheiro' });
    expect(sheet).toHaveTextContent(`Passou ${formatBRL(500)} do que Maria deve`);
    // "Receber só o que deve" corrige o valor (o troco fica com o vendedor).
    await user.click(within(sheet).getByRole('button', { name: `Receber só ${formatBRL(due)}` }));
    expect(within(sheet).getByLabelText('Quanto está pagando?')).toHaveValue(formatBRL(due));
    expect(sheet).toHaveTextContent('Fica tudo pago!');

    await user.type(within(sheet).getByLabelText('Quanto está pagando?'), '0');
    await user.click(within(sheet).getByRole('button', { name: 'Receber e guardar crédito' }));
    await waitFor(() => expect(customerByName('Maria das Graças').creditCents).toBe(due * 10 - due));
    expect(customerFiadoSummary(maria, db.fiadoAccounts).openCents).toBe(0);
    expect(await screen.findByText(/Maria tem crédito/)).toBeInTheDocument();
  });

  it('desfaz o último recebimento de hoje pelo histórico', async () => {
    const { user } = await openAccount('Ana Paula Souza');
    const paymentsBefore = db.fiadoPayments.length;
    const sheet = await fillReceipt(user, { cents: 500, method: 'Dinheiro' });
    await user.click(within(sheet).getByRole('button', { name: 'Receber R$ 5,00' }));
    await waitFor(() => expect(db.fiadoPayments).toHaveLength(paymentsBefore + 1));

    // Só o último recebimento (o de hoje) pode ser desfeito.
    const undoButtons = await screen.findAllByRole('button', { name: 'Desfazer este recebimento' });
    expect(undoButtons).toHaveLength(1);
    await user.click(undoButtons[0]);
    await waitFor(() => expect(db.fiadoPayments).toHaveLength(paymentsBefore));
  });

  it('bloquear o fiado vale na hora de vender, e "Desfazer" libera de novo', async () => {
    const { user, router } = await openAccount('Ana Paula Souza');
    await user.click(screen.getByRole('switch', { name: /^Não vender fiado/ }));
    await waitFor(() => expect(customerByName('Ana Paula Souza').fiadoBlocked).toBe(true));
    await user.click(screen.getByRole('button', { name: 'Desfazer', hidden: true }));
    await waitFor(() => expect(customerByName('Ana Paula Souza').fiadoBlocked).toBe(false));
    await user.click(screen.getByRole('switch', { name: /^Não vender fiado/ }));
    await waitFor(() => expect(customerByName('Ana Paula Souza').fiadoBlocked).toBe(true));

    // "Nova venda para Ana" já escolhe a cliente; o alerta da venda vem do mesmo cadastro.
    await user.click(screen.getByRole('button', { name: 'Nova venda para Ana' }));
    await screen.findByRole('heading', { level: 1, name: 'Vender' });
    expect(router.state.location.pathname).toBe('/vender');
    await user.click(await screen.findByRole('button', { name: /^Cafezinho/ }));
    await user.click(screen.getByRole('button', { name: 'Cobrar' }));
    await screen.findByRole('heading', { level: 1, name: 'Cobrar' });
    await user.click(screen.getByRole('button', { name: 'Fiado' }));
    await user.click(screen.getByRole('button', { name: 'Anotar no fiado' }));
    const alert = await screen.findByRole('dialog', { name: /Cuidado com o fiado de Ana/ });
    expect(alert).toHaveTextContent('Você marcou para não vender fiado para Ana.');
  });
});
