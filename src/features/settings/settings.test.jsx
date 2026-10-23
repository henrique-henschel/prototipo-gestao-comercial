import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db, resetDemo } from '@/mocks/db.js';
import { configureApi, getApiConfig } from '@/services/api.js';
import { DEMO_SESSION, renderApp } from '@/test/renderApp.js';

async function openSettings() {
  const user = userEvent.setup();
  const view = renderApp('/ajustes', { session: DEMO_SESSION });
  await screen.findByRole('region', { name: 'Formas de pagamento' });
  return { user, ...view };
}

/** Clica na ação de um aviso (os avisos ficam num popover que o jsdom não abre). */
async function clickToastAction(user, label) {
  await user.click(await screen.findByRole('button', { name: label, hidden: true }));
}

beforeEach(() => {
  resetDemo();
  configureApi({ failing: false, slow: false });
});

afterEach(() => {
  configureApi({ failing: false, slow: false });
  delete document.documentElement.dataset.theme;
  document.documentElement.style.removeProperty('--font-scale');
});

describe('ajustes', () => {
  it('desliga uma forma de pagamento na hora, com "Desfazer"', async () => {
    const { user } = await openSettings();
    const pix = screen.getByRole('switch', { name: /^Pix/ });
    expect(pix).toBeChecked();

    await user.click(pix);
    expect(pix).not.toBeChecked();
    await waitFor(() => expect(db.settings.paymentMethods.pix).toBe(false));
    expect(await screen.findByText('Pix desligado')).toBeInTheDocument();

    await clickToastAction(user, 'Desfazer');
    await waitFor(() => expect(db.settings.paymentMethods.pix).toBe(true));
    expect(pix).toBeChecked();
  });

  it('não deixa desligar a última forma de pagamento', async () => {
    db.settings.paymentMethods = { dinheiro: true, pix: false, debito: false, credito: false, fiado: false };
    await openSettings();
    const cash = screen.getByRole('switch', { name: /^Dinheiro/ });
    expect(cash).toBeChecked();
    expect(cash).toBeDisabled();
    expect(cash).toHaveAccessibleName(/Pelo menos uma forma precisa ficar ligada/);
  });

  it('muda a taxa do débito pelo teclado, com o exemplo numa venda de R$ 100,00', async () => {
    const { user } = await openSettings();
    await user.click(screen.getByRole('button', { name: /^Mudar.*taxa do cartão de débito/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Taxa: Cartão de débito' });
    const keypad = within(sheet).getByRole('group', { name: /Teclado/ });

    await user.clear(within(sheet).getByLabelText('Taxa do cartão de débito'));
    for (const digit of ['2', '5', '0'])
      await user.click(within(keypad).getByRole('button', { name: digit }));
    expect(within(sheet).getByLabelText('Taxa do cartão de débito')).toHaveValue('2,50%');
    expect(sheet).toHaveTextContent('a taxa é R$ 2,50 e entram R$ 97,50');

    await user.click(within(sheet).getByRole('button', { name: 'Salvar taxa' }));
    await waitFor(() => expect(db.settings.fees.debito).toBe(2.5));
    const fees = screen.getByRole('region', { name: 'Taxas da maquininha' });
    expect(fees).toHaveTextContent('2,5%');
  });

  it('dados do negócio: o nome é obrigatório', async () => {
    const { user } = await openSettings();
    await user.click(screen.getByRole('button', { name: /^Mudar.*dados do negócio/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Seu negócio' });
    const name = within(sheet).getByLabelText('Nome do negócio');

    await user.clear(name);
    await user.click(within(sheet).getByRole('button', { name: 'Salvar' }));
    expect(within(sheet).getByText('Digite o nome do negócio.')).toBeInTheDocument();

    await user.type(name, 'Lanches do Zé');
    await user.click(within(sheet).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(db.business.name).toBe('Lanches do Zé'));
    expect(screen.getByRole('region', { name: 'Seu negócio' })).toHaveTextContent('Lanches do Zé');
  });

  it('prazo do fiado, venda sem estoque e troco inicial padrão', async () => {
    const { user } = await openSettings();
    await user.click(screen.getByRole('button', { name: '15 dias' }));
    await waitFor(() => expect(db.settings.fiadoDefaultDays).toBe(15));

    await user.click(screen.getByRole('switch', { name: /^Não vender o que acabou/ }));
    await waitFor(() => expect(db.settings.blockSaleWithoutStock).toBe(true));

    await user.click(screen.getByRole('button', { name: /^Mudar.*troco inicial/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Troco inicial padrão' });
    await user.clear(within(sheet).getByLabelText('Troco inicial'));
    for (const digit of ['8', '0', '0', '0'])
      await user.click(within(sheet).getByRole('button', { name: digit }));
    await user.click(within(sheet).getByRole('button', { name: 'Salvar troco inicial' }));
    await waitFor(() => expect(db.settings.defaultOpeningCents).toBe(8000));
  });

  it('se salvar falhar, a tela volta ao que era e explica', async () => {
    const { user } = await openSettings();
    configureApi({ failing: true });
    const credit = screen.getByRole('switch', { name: /^Cartão de crédito/ });
    await user.click(credit);
    expect(await screen.findByText(/Não foi possível conectar/)).toBeInTheDocument();
    await waitFor(() => expect(credit).toBeChecked());
    expect(db.settings.paymentMethods.credito).toBe(true);
  });

  it('aparência e acessibilidade valem na hora', async () => {
    const { user } = await openSettings();
    await user.click(screen.getByRole('button', { name: 'Alto contraste' }));
    expect(document.documentElement.dataset.theme).toBe('contrast');
    await user.click(screen.getByRole('button', { name: 'Enorme' }));
    expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1.5');
    const speech = screen.getByRole('switch', { name: /^Botões "Ouvir"/ });
    await user.click(speech);
    expect(speech).not.toBeChecked();
  });

  it('modo demonstração simula lentidão e falha', async () => {
    const { user } = await openSettings();
    await user.click(screen.getByRole('switch', { name: /^Simular internet lenta/ }));
    expect(getApiConfig().slow).toBe(true);
    await user.click(screen.getByRole('switch', { name: /^Simular falha de internet/ }));
    expect(getApiConfig().failing).toBe(true);
    await user.click(screen.getByRole('switch', { name: /^Simular falha de internet/ }));
    expect(getApiConfig().failing).toBe(false);
  });

  it('restaurar os dados de exemplo pede confirmação, porque não tem volta', async () => {
    const { user } = await openSettings();
    db.business.name = 'Outro nome';
    db.sales = [];
    await user.click(screen.getByRole('button', { name: 'Restaurar dados de exemplo' }));
    const dialog = await screen.findByRole('dialog', { name: 'Restaurar os dados de exemplo?' });

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(db.sales).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Restaurar dados de exemplo' }));
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Restaurar os dados de exemplo?' })).getByRole(
        'button',
        { name: 'Restaurar' },
      ),
    );
    await waitFor(() => expect(db.sales.length).toBeGreaterThan(0));
    expect(db.business.name).toBe('Barraca da Rosa');
    expect(await screen.findByText('Dados de exemplo restaurados')).toBeInTheDocument();
  });

  it('sem conseguir carregar, mostra o erro com "Tentar de novo"', async () => {
    configureApi({ failing: true });
    const user = userEvent.setup();
    renderApp('/ajustes', { session: DEMO_SESSION });
    expect(await screen.findByText('Não deu para carregar os ajustes')).toBeInTheDocument();

    configureApi({ failing: false });
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('region', { name: 'Formas de pagamento' })).toBeInTheDocument();
  });
});
