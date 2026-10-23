import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { stockStatus } from '@/domain/rules/stock.js';
import { db, resetDemo } from '@/mocks/db.js';
import { DEMO_SESSION, renderApp } from '@/test/renderApp.js';

function productByName(name) {
  return db.products.find((product) => product.name === name);
}

function movementsOf(name) {
  const product = productByName(name);
  return db.stockMovements.filter((movement) => movement.productId === product.id);
}

async function openInventory() {
  const user = userEvent.setup();
  const view = renderApp('/estoque', { session: DEMO_SESSION });
  const list = await screen.findByRole('list', { name: 'Produtos' });
  return { user, list, ...view };
}

async function openProduct(name) {
  const user = userEvent.setup();
  const view = renderApp(`/estoque/${productByName(name).id}`, { session: DEMO_SESSION });
  await screen.findByRole('heading', { level: 1, name });
  return { user, ...view };
}

beforeEach(() => {
  resetDemo();
});

describe('estoque', () => {
  it('mostra primeiro o que acabou e o que está acabando, com filtros', async () => {
    const { user, list } = await openInventory();
    const rows = within(list).getAllByRole('listitem');
    const active = db.products.filter((p) => p.active);
    expect(rows).toHaveLength(active.length);
    const firstStatus = stockStatus(active.find((p) => rows[0].textContent.includes(p.name)));
    expect(firstStatus).toBe('acabou');
    expect(rows[0]).toHaveTextContent('Acabou');

    await user.click(screen.getByRole('button', { name: /^Acabando/ }));
    const acabando = within(list).getAllByRole('listitem');
    expect(acabando).toHaveLength(active.filter((p) => stockStatus(p) === 'acabando').length);
    acabando.forEach((row) => expect(row).toHaveTextContent('Acabando'));

    await user.click(screen.getByRole('button', { name: /^Fora da venda/ }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(db.products.filter((p) => !p.active).length);
  });

  it('entrada rápida pela lista atualiza quantidade e custo, com "Desfazer"', async () => {
    const { user } = await openInventory();
    const before = productByName('Coxinha');
    const movementsBefore = db.stockMovements.length;

    await user.click(screen.getByRole('button', { name: /^Entrada\s*de Coxinha$/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Chegou mercadoria: Coxinha' });
    await user.click(within(sheet).getByRole('button', { name: '12 un' }));
    expect(sheet).toHaveTextContent(`${before.quantity + 12} un`);
    const cost = within(sheet).getByLabelText(/Quanto pagou em cada um/);
    expect(cost).toHaveValue('R$ 2,10');
    await user.clear(cost);
    await user.type(cost, '250');
    await user.click(within(sheet).getByRole('button', { name: 'Dar entrada' }));

    await waitFor(() => expect(db.stockMovements).toHaveLength(movementsBefore + 1));
    expect(productByName('Coxinha')).toMatchObject({ quantity: before.quantity + 12, costCents: 250 });
    expect(db.stockMovements.at(-1)).toMatchObject({ type: 'entrada', delta: 12, unitCostCents: 250 });
    expect(await screen.findByText('Entrada registrada')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Desfazer', hidden: true }));
    await waitFor(() => expect(db.stockMovements).toHaveLength(movementsBefore));
    expect(productByName('Coxinha')).toMatchObject({
      quantity: before.quantity,
      costCents: before.costCents,
    });
  });

  it('cadastra produto com prévia, alerta de prejuízo e estoque inicial', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/estoque/novo', { session: DEMO_SESSION });
    // O título aparece já enquanto os dados carregam; o formulário vem depois.
    const submit = await screen.findByRole('button', { name: 'Cadastrar produto' });
    const before = db.products.length;

    await user.click(submit);
    expect(screen.getByText('Digite o nome do produto.')).toBeInTheDocument();
    expect(screen.getByText('Escolha a categoria.')).toBeInTheDocument();
    expect(screen.getByText('Digite o preço de venda.')).toBeInTheDocument();
    expect(db.products).toHaveLength(before);

    await user.type(screen.getByLabelText('Nome'), 'Pamonha');
    await user.selectOptions(screen.getByLabelText('Categoria'), 'lanches');
    // Sem emoji escolhido, a categoria sugere o dela; a prévia mostra o card da venda.
    const preview = screen.getByRole('complementary', { name: 'Prévia do produto' });
    expect(preview).toHaveTextContent('🥪');
    expect(preview).toHaveTextContent('Pamonha');
    expect(screen.queryByRole('radio', { name: '🌽' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver mais emojis' }));
    await user.click(screen.getByRole('radio', { name: '🌽' }));
    await user.click(screen.getByRole('radio', { name: 'Amarelo' }));
    await user.type(screen.getByLabelText('Preço de venda'), '500');
    await user.type(screen.getByLabelText(/Quanto você paga/), '600');
    expect(screen.getByText(/Vendendo no prejuízo:/).parentElement).toHaveTextContent(
      'você perde R$ 1,00 em cada um',
    );
    await user.clear(screen.getByLabelText(/Quanto você paga/));
    await user.type(screen.getByLabelText(/Quanto você paga/), '200');
    expect(screen.getByText(/Você ganha/)).toHaveTextContent(
      'Você ganha R$ 3,00 em cada um (margem de 60%).',
    );
    expect(preview).toHaveTextContent('R$ 5,00');

    await user.type(screen.getByLabelText('Quanto tem agora?'), '20');
    await user.type(screen.getByLabelText('Avisar quando tiver só'), '5');
    await user.click(screen.getByRole('button', { name: 'Cadastrar produto' }));

    await waitFor(() => expect(db.products).toHaveLength(before + 1));
    expect(productByName('Pamonha')).toMatchObject({
      emoji: '🌽',
      color: 'amarelo',
      category: 'lanches',
      priceCents: 500,
      costCents: 200,
      quantity: 20,
      minQuantity: 5,
      trackStock: true,
      active: true,
    });
    expect(movementsOf('Pamonha')).toEqual([expect.objectContaining({ type: 'entrada', delta: 20 })]);
    await waitFor(() => expect(router.state.location.pathname).toBe('/estoque'));
    expect(await screen.findByText('Produto cadastrado')).toBeInTheDocument();
  });

  it('perda exige o motivo; contagem define a quantidade; tudo vai para o histórico', async () => {
    const { user } = await openProduct('Pastel de carne');
    const before = productByName('Pastel de carne').quantity;

    await user.click(screen.getByRole('button', { name: 'Perda' }));
    let sheet = await screen.findByRole('dialog', { name: 'Registrar perda: Pastel de carne' });
    await user.type(within(sheet).getByLabelText('Quantos perdeu?'), '2');
    await user.click(within(sheet).getByRole('button', { name: 'Registrar perda' }));
    expect(within(sheet).getByText('Escolha o motivo.')).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Quebrou ou estragou' }));
    await user.click(within(sheet).getByRole('button', { name: 'Registrar perda' }));
    await waitFor(() => expect(productByName('Pastel de carne').quantity).toBe(before - 2));
    expect(movementsOf('Pastel de carne').at(-1)).toMatchObject({
      type: 'perda',
      delta: -2,
      reason: 'quebrado',
    });

    await user.click(screen.getByRole('button', { name: 'Contar o estoque' }));
    sheet = await screen.findByRole('dialog', { name: 'Contar o estoque: Pastel de carne' });
    await user.type(within(sheet).getByLabelText(/Quantos tem agora/), '3');
    expect(sheet).toHaveTextContent(`(−${before - 2 - 3} un)`);
    await user.click(within(sheet).getByRole('button', { name: 'Salvar contagem' }));
    await waitFor(() => expect(productByName('Pastel de carne').quantity).toBe(3));

    const history = screen.getByRole('list', { name: 'Movimentações do estoque' });
    const [latest, previous] = within(history).getAllByRole('listitem');
    expect(latest).toHaveTextContent('Contagem (ajuste)');
    expect(latest).toHaveTextContent('ficou 3 un');
    expect(previous).toHaveTextContent('Perda');
    expect(previous).toHaveTextContent('Motivo: Quebrou ou estragou');
    expect(screen.getByText('Tem agora').parentElement).toHaveTextContent('Acabando');
  });

  it('tirar da venda guarda o produto em "Fora da venda" e some da tela de vender', async () => {
    const { user } = await openProduct('Picolé');
    await user.click(screen.getByRole('switch', { name: /^À venda/ }));
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(productByName('Picolé').active).toBe(false));

    const list = await screen.findByRole('list', { name: 'Produtos' });
    expect(within(list).queryByText('Picolé')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Fora da venda/ }));
    expect(within(list).getByText('Picolé')).toBeInTheDocument();
  });
});
