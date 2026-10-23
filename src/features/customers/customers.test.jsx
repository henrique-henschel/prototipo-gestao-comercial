import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db, resetDemo } from '@/mocks/db.js';
import { DEMO_SESSION, renderApp } from '@/test/renderApp.js';

function customerByName(name) {
  return db.customers.find((customer) => customer.name === name);
}

async function openCustomers() {
  const user = userEvent.setup();
  const view = renderApp('/clientes', { session: DEMO_SESSION });
  await screen.findByRole('list', { name: 'Clientes' });
  return { user, ...view };
}

/** Cadastra pela tela de clientes e devolve o cliente gravado. */
async function createCustomer(user, { name, phone = '' }) {
  await user.click(screen.getByRole('button', { name: 'Cliente novo' }));
  const sheet = await screen.findByRole('dialog', { name: 'Cliente novo' });
  await user.type(within(sheet).getByLabelText('Nome'), name);
  if (phone) await user.type(within(sheet).getByLabelText(/WhatsApp/), phone);
  await user.click(within(sheet).getByRole('button', { name: 'Cadastrar cliente' }));
  await waitFor(() => expect(customerByName(name)).toBeDefined());
  return customerByName(name);
}

beforeEach(() => {
  resetDemo();
});

describe('clientes', () => {
  it('cadastra com limite e bloqueio, validando o WhatsApp antes de gravar', async () => {
    const { user } = await openCustomers();
    const before = db.customers.length;
    await user.click(screen.getByRole('button', { name: 'Cliente novo' }));
    const sheet = await screen.findByRole('dialog', { name: 'Cliente novo' });

    await user.click(within(sheet).getByRole('button', { name: 'Cadastrar cliente' }));
    expect(within(sheet).getByText('Digite o nome.')).toBeInTheDocument();

    await user.type(within(sheet).getByLabelText('Nome'), 'Dona Cida');
    await user.type(within(sheet).getByLabelText(/WhatsApp/), '1234');
    await user.click(within(sheet).getByRole('switch', { name: /^Limitar o fiado/ }));
    await user.click(within(sheet).getByRole('button', { name: 'Cadastrar cliente' }));
    expect(within(sheet).getByText(/Confira o WhatsApp/)).toBeInTheDocument();
    expect(within(sheet).getByText(/Digite o limite/)).toBeInTheDocument();
    expect(db.customers).toHaveLength(before);

    await user.clear(within(sheet).getByLabelText(/WhatsApp/));
    await user.type(within(sheet).getByLabelText(/WhatsApp/), '(21) 99876-5432');
    await user.type(within(sheet).getByLabelText('Limite do fiado'), '5000');
    await user.click(within(sheet).getByRole('switch', { name: /^Não vender fiado/ }));
    await user.click(within(sheet).getByRole('button', { name: 'Cadastrar cliente' }));

    await waitFor(() => expect(db.customers).toHaveLength(before + 1));
    expect(customerByName('Dona Cida')).toMatchObject({
      phone: '21998765432',
      creditLimitCents: 5000,
      fiadoBlocked: true,
      archived: false,
    });
    const row = within(screen.getByRole('list', { name: 'Clientes' })).getByRole('link', {
      name: /Dona Cida/,
    });
    expect(row).toHaveTextContent('(21) 99876-5432');
    expect(row).toHaveTextContent('Sem fiado');
  });

  it('edita os dados pela conta do cliente', async () => {
    const { user } = await openCustomers();
    await user.click(screen.getByRole('link', { name: /Luciana Ferreira/ }));
    await screen.findByRole('heading', { level: 1, name: 'Luciana Ferreira' });
    expect(screen.getByRole('link', { name: 'Voltar aos clientes' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    const sheet = await screen.findByRole('dialog', { name: 'Editar cliente' });
    await user.type(within(sheet).getByLabelText(/WhatsApp/), '11912345678');
    await user.type(within(sheet).getByLabelText(/Apelido/), 'Lu da feira');
    await user.click(within(sheet).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(customerByName('Luciana Ferreira')).toMatchObject({ phone: '11912345678', note: 'Lu da feira' }),
    );
    expect(await screen.findByText('(11) 91234-5678')).toBeInTheDocument();
  });

  it('arquiva com "Desfazer" e tira o cliente da lista', async () => {
    const { user } = await openCustomers();
    await user.click(screen.getByRole('link', { name: /Rita de Cássia/ }));
    await screen.findByRole('heading', { level: 1, name: 'Rita de Cássia' });

    await user.click(screen.getByRole('button', { name: 'Arquivar cliente' }));
    await waitFor(() => expect(customerByName('Rita de Cássia').archived).toBe(true));
    expect(screen.getByText(/Cliente arquivado: não aparece na hora de vender/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Desfazer', hidden: true }));
    await waitFor(() => expect(customerByName('Rita de Cássia').archived).toBe(false));

    await user.click(screen.getByRole('button', { name: 'Arquivar cliente' }));
    await waitFor(() => expect(customerByName('Rita de Cássia').archived).toBe(true));
    await user.click(screen.getByRole('link', { name: 'Voltar aos clientes' }));
    const list = await screen.findByRole('list', { name: 'Clientes' });
    expect(within(list).queryByRole('link', { name: /Rita de Cássia/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Arquivados/ }));
    expect(within(list).getByRole('link', { name: /Rita de Cássia/ })).toBeInTheDocument();
  });

  it('apaga só quem não deve nem tem crédito, com confirmação', async () => {
    const { user, router } = await openCustomers();
    const fresh = await createCustomer(user, { name: 'Cliente Teste' });
    await user.click(screen.getByRole('link', { name: /Cliente Teste/ }));
    await screen.findByRole('heading', { level: 1, name: 'Cliente Teste' });

    await user.click(screen.getByRole('button', { name: 'Apagar cliente' }));
    const dialog = await screen.findByRole('dialog', { name: 'Apagar Cliente Teste?' });
    await user.click(within(dialog).getByRole('button', { name: 'Não apagar' }));
    expect(customerByName('Cliente Teste')).toBeDefined();

    await user.click(screen.getByRole('button', { name: 'Apagar cliente' }));
    await user.click(within(dialog).getByRole('button', { name: 'Apagar cliente' }));
    await waitFor(() => expect(db.customers.some((c) => c.id === fresh.id)).toBe(false));
    await waitFor(() => expect(router.state.location.pathname).toBe('/clientes'));

    // Quem deve só pode ser arquivado.
    await user.click(await screen.findByRole('link', { name: /Maria das Graças/ }));
    await screen.findByRole('heading', { level: 1, name: 'Maria das Graças' });
    expect(screen.queryByRole('button', { name: 'Apagar cliente' })).not.toBeInTheDocument();
    expect(screen.getByText(/Quem ainda deve não pode ser apagado/)).toBeInTheDocument();
  });
});
