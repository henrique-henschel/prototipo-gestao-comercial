import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db, resetDemo } from '@/mocks/db.js';
import { DEMO_SESSION, renderApp } from '@/test/renderApp.js';

/** Espera o título (h1) da tela. */
function findHeading(name) {
  return screen.findByRole('heading', { level: 1, name });
}

function productByName(name) {
  return db.products.find((product) => product.name === name);
}

/** Abre a tela de vender e espera os produtos carregarem. */
async function openSell() {
  const user = userEvent.setup();
  const view = renderApp('/vender', { session: DEMO_SESSION });
  await findHeading('Vender');
  await screen.findByRole('list', { name: 'Produtos' });
  return { user, ...view };
}

/** "Cobrar" na barra do carrinho; se o estoque anotado não der, vende assim mesmo. */
async function checkout(user) {
  await user.click(screen.getByRole('button', { name: 'Cobrar' }));
  const anyway = screen.queryByRole('button', { name: /Vender assim mesmo/ });
  if (anyway) await user.click(anyway);
  await findHeading('Cobrar');
}

beforeEach(() => {
  resetDemo();
});

describe('vender', () => {
  it('venda em dinheiro com troco baixa o estoque e mostra a venda concluída', async () => {
    const { user, router } = await openSell();
    const before = productByName('Coxinha').quantity;
    const salesBefore = db.sales.length;

    await user.click(screen.getByRole('button', { name: /^Coxinha/ }));
    await user.click(screen.getByRole('button', { name: /^Coxinha/ }));
    expect(screen.getByRole('button', { name: /Ver carrinho/ })).toHaveTextContent('2 itensR$ 12,00');

    await checkout(user);
    expect(router.state.location.search).toBe('?etapa=pagamento');
    await user.click(screen.getByRole('button', { name: 'Dinheiro' }));
    await user.click(screen.getByRole('button', { name: 'R$ 20,00' }));
    expect(screen.getByText('Troco').parentElement).toHaveTextContent('R$ 8,00');

    await user.click(screen.getByRole('button', { name: 'Concluir venda' }));
    await findHeading('Venda concluída!');

    expect(db.sales).toHaveLength(salesBefore + 1);
    const sale = db.sales.at(-1);
    expect(sale.totalCents).toBe(1200);
    expect(sale.changeCents).toBe(800);
    expect(sale.payments).toEqual([
      expect.objectContaining({
        method: 'dinheiro',
        amountCents: 1200,
        receivedCents: 2000,
        changeCents: 800,
      }),
    ]);
    expect(productByName('Coxinha').quantity).toBe(before - 2);
    expect(router.state.location.search).toBe(`?venda=${sale.id}`);
    expect(await screen.findByText('Venda registrada')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Nova venda' }));
    await findHeading('Vender');
    expect(screen.queryByRole('button', { name: 'Cobrar' })).not.toBeInTheDocument();
  });

  it('"Desfazer" apaga a venda, devolve o estoque e os itens ao carrinho', async () => {
    const { user } = await openSell();
    const before = productByName('Coxinha').quantity;
    const salesBefore = db.sales.length;

    await user.click(screen.getByRole('button', { name: /^Coxinha/ }));
    await checkout(user);
    await user.click(screen.getByRole('button', { name: 'Pix' }));
    await user.click(screen.getByRole('button', { name: 'Recebi o Pix' }));
    await findHeading('Venda concluída!');

    // Os avisos ficam num popover, que o jsdom não abre: por isso `hidden: true`.
    await user.click(await screen.findByRole('button', { name: 'Desfazer', hidden: true }));
    await findHeading('Vender');
    expect(await screen.findByText('Venda desfeita')).toBeInTheDocument();
    expect(db.sales).toHaveLength(salesBefore);
    expect(productByName('Coxinha').quantity).toBe(before);
    expect(screen.getByRole('button', { name: /Ver carrinho/ })).toHaveTextContent('1 itemR$ 6,00');
  });

  it('venda dividida: Pix e dinheiro com troco, somando exatamente o total', async () => {
    const { user } = await openSell();
    for (let i = 0; i < 4; i += 1) await user.click(screen.getByRole('button', { name: /^Cafezinho/ }));
    await checkout(user);

    await user.click(screen.getByRole('button', { name: 'Dividir em mais de uma forma' }));
    expect(screen.getByRole('button', { name: 'Concluir venda' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Escolher a primeira forma' }));
    let sheet = await screen.findByRole('dialog', { name: 'Adicionar forma de pagamento' });
    await user.click(within(sheet).getByRole('button', { name: 'Pix' }));
    await user.type(within(sheet).getByRole('textbox', { name: 'Quanto em pix?' }), '400');
    await user.click(within(sheet).getByRole('button', { name: 'Adicionar' }));
    expect(await screen.findByText('R$ 6,00', { selector: 'strong' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Adicionar outra forma' }));
    sheet = await screen.findByRole('dialog', { name: 'Adicionar forma de pagamento' });
    await user.click(within(sheet).getByRole('button', { name: 'Dinheiro' }));
    await user.type(within(sheet).getByRole('textbox', { name: 'Quanto em dinheiro?' }), '1000');
    expect(within(sheet).getByText(/Troco:/)).toHaveTextContent('R$ 4,00');
    await user.click(within(sheet).getByRole('button', { name: 'Adicionar' }));

    expect(await screen.findByText('Pronto: a soma dá o total')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Concluir venda' }));
    await findHeading('Venda concluída!');

    const sale = db.sales.at(-1);
    expect(sale.totalCents).toBe(1000);
    expect(sale.changeCents).toBe(400);
    expect(sale.payments).toEqual([
      expect.objectContaining({ method: 'pix', amountCents: 400 }),
      expect.objectContaining({
        method: 'dinheiro',
        amountCents: 600,
        receivedCents: 1000,
        changeCents: 400,
      }),
    ]);
  });

  it('fiado exige cliente e anota a conta com vencimento', async () => {
    const { user } = await openSell();
    const customer = db.customers.find((c) => c.name === 'Ana Paula Souza');
    await user.click(screen.getByRole('button', { name: /^Cafezinho/ }));
    await checkout(user);

    await user.click(screen.getByRole('button', { name: 'Fiado' }));
    expect(screen.getByRole('button', { name: 'Anotar no fiado' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Escolher cliente' }));
    const picker = await screen.findByRole('dialog', { name: 'Quem está comprando?' });
    await user.click(within(picker).getByRole('button', { name: /Ana Paula Souza/ }));

    await user.click(screen.getByRole('button', { name: 'Anotar no fiado' }));
    const alert = screen.queryByRole('button', { name: 'Vender fiado assim mesmo' });
    if (alert) await user.click(alert);
    await findHeading('Venda concluída!');

    const sale = db.sales.at(-1);
    expect(sale.customerId).toBe(customer.id);
    expect(db.fiadoAccounts.at(-1)).toEqual(
      expect.objectContaining({ saleId: sale.id, customerId: customer.id, originalCents: 250 }),
    );
    expect(screen.getByText(/Anotado no fiado de/)).toHaveTextContent('Ana Paula Souza');
  });

  it('cliente bloqueado no fiado: alerta e só vende se o vendedor confirmar', async () => {
    const { user } = await openSell();
    const salesBefore = db.sales.length;
    await user.click(screen.getByRole('button', { name: /^Cafezinho/ }));
    await checkout(user);
    await user.click(screen.getByRole('button', { name: 'Fiado' }));
    await user.click(screen.getByRole('button', { name: 'Escolher cliente' }));
    const picker = await screen.findByRole('dialog', { name: 'Quem está comprando?' });
    await user.click(within(picker).getByRole('button', { name: /José Raimundo/ }));
    await user.click(screen.getByRole('button', { name: 'Anotar no fiado' }));

    const dialog = await screen.findByRole('dialog', { name: /Cuidado com o fiado de José/ });
    expect(dialog).toHaveTextContent('Você marcou para não vender fiado para José.');
    await user.click(within(dialog).getByRole('button', { name: 'Escolher outra forma' }));
    expect(db.sales).toHaveLength(salesBefore);

    await user.click(screen.getByRole('button', { name: 'Anotar no fiado' }));
    await user.click(await screen.findByRole('button', { name: 'Vender fiado assim mesmo' }));
    await findHeading('Venda concluída!');
    expect(db.sales).toHaveLength(salesBefore + 1);
  });
});

describe('histórico e cancelamento', () => {
  it('lista as vendas de hoje agrupadas por dia', async () => {
    renderApp('/vendas', { session: DEMO_SESSION });
    await findHeading('Vendas');
    expect(await screen.findByRole('heading', { level: 2, name: /^Hoje, / })).toBeInTheDocument();
    const last = [...db.sales].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    expect(screen.getByText(`Venda nº ${last.number}`).closest('a')).toHaveAttribute(
      'href',
      `/vendas/${last.id}`,
    );
  });

  it('cancelar exige o motivo, estorna o estoque e mantém a venda no histórico', async () => {
    const sale = [...db.sales]
      .reverse()
      .find(
        (s) =>
          s.status === 'concluida' &&
          !s.payments.some((p) => p.method === 'fiado') &&
          s.items.some(
            (item) => item.productId && db.products.find((p) => p.id === item.productId)?.trackStock,
          ),
      );
    const item = sale.items.find(
      (i) => i.productId && db.products.find((p) => p.id === i.productId).trackStock,
    );
    const sold = sale.items
      .filter((i) => i.productId === item.productId)
      .reduce((sum, i) => sum + i.quantity, 0);
    const before = db.products.find((p) => p.id === item.productId).quantity;

    const user = userEvent.setup();
    renderApp(`/vendas/${sale.id}`, { session: DEMO_SESSION });
    await findHeading(`Venda nº ${sale.number}`);
    await user.click(screen.getByRole('button', { name: 'Cancelar venda' }));

    const dialog = await screen.findByRole('dialog', { name: `Cancelar a venda nº ${sale.number}?` });
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar venda' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Escolha o motivo.');

    await user.click(within(dialog).getByRole('radio', { name: 'Registrei errado' }));
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar venda' }));

    expect(await screen.findByRole('heading', { name: 'Venda cancelada' })).toBeInTheDocument();
    await waitFor(() => expect(db.sales.find((s) => s.id === sale.id).status).toBe('cancelada'));
    expect(db.sales.find((s) => s.id === sale.id).cancellation.reason).toBe('registro_errado');
    expect(db.products.find((p) => p.id === item.productId).quantity).toBeCloseTo(before + sold, 3);
    expect(screen.queryByRole('button', { name: 'Cancelar venda' })).not.toBeInTheDocument();
  });
});
