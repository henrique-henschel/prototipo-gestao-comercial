import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { safeReturnPath } from '@/app/routes.js';
import { resetDemo } from '@/mocks/db.js';
import { DEMO_SESSION, renderApp } from '@/test/renderApp.js';

/** Espera o título (h1) da tela. */
function findHeading(name) {
  return screen.findByRole('heading', { level: 1, name });
}

beforeEach(() => {
  resetDemo();
});

describe('rotas e sessão', () => {
  it('sem sessão, manda para "Entrar" lembrando a tela pedida', async () => {
    const { router } = renderApp('/fiado');
    await findHeading('Entrar');
    expect(router.state.location.pathname).toBe('/entrar');
    expect(router.state.location.search).toBe('?voltar=%2Ffiado');
  });

  it('a conta de demonstração entra e volta para a tela pedida', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/fiado');
    await user.click(await screen.findByRole('button', { name: 'Entrar com conta de demonstração' }));
    await findHeading('Quem me deve');
    expect(router.state.location.pathname).toBe('/fiado');
  });

  it('pede e-mail e senha antes de entrar', async () => {
    const user = userEvent.setup();
    renderApp('/entrar');
    await user.click(await screen.findByRole('button', { name: 'Entrar' }));
    expect(screen.getByText('Digite seu e-mail.')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveFocus();
  });

  it('criar conta leva às boas-vindas, e ao concluir abre o início', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/cadastro');
    await user.type(await screen.findByLabelText('Seu nome'), 'Joana Prado');
    await user.type(screen.getByLabelText('E-mail'), 'joana@exemplo.com');
    await user.type(screen.getByLabelText('Senha'), '1234');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    await findHeading('Como se chama o seu negócio?');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText('Digite o nome do seu negócio.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Nome do negócio'), 'Doces da Joana');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await findHeading('O que você vende?')).toHaveFocus();
    await user.click(screen.getByRole('button', { name: /Doces/ }));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    await findHeading('Como você recebe?');
    await user.click(screen.getByRole('switch', { name: /Começar com dados de exemplo/ }));
    await user.click(screen.getByRole('button', { name: 'Começar a usar' }));

    await findHeading('Início');
    expect(router.state.location.pathname).toBe('/inicio');
    expect(screen.getByText(/Olá, Joana!/)).toBeInTheDocument();
    expect(await screen.findByText('Tudo pronto!')).toBeInTheDocument();

    // O tour de primeiro uso abre por cima do Início e pode ser pulado.
    const tour = await screen.findByRole('dialog', { name: 'Boas-vindas!' });
    await user.click(within(tour).getByRole('button', { name: 'Pular' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('quem já entrou não vê a tela de entrar', async () => {
    const { router } = renderApp('/entrar', { session: DEMO_SESSION });
    await findHeading('Início');
    expect(router.state.location.pathname).toBe('/inicio');
  });

  it('só aceita voltar para caminhos do próprio app', () => {
    expect(safeReturnPath('/fiado')).toBe('/fiado');
    expect(safeReturnPath('//exemplo.com')).toBe('/inicio');
    expect(safeReturnPath('https://exemplo.com')).toBe('/inicio');
    expect(safeReturnPath(null)).toBe('/inicio');
  });
});

describe('navegação', () => {
  it('a barra lateral leva às áreas e marca a tela atual', async () => {
    const user = userEvent.setup();
    renderApp('/inicio', { session: DEMO_SESSION });
    await findHeading('Início');
    const [sidebarNav] = screen.getAllByRole('navigation', { name: 'Menu principal' });
    await user.click(within(sidebarNav).getByRole('link', { name: 'Estoque' }));
    await findHeading('Estoque');
    expect(within(sidebarNav).getByRole('link', { name: 'Estoque' })).toHaveAttribute('aria-current', 'page');
  });

  it('"Mais" lista as outras áreas e permite sair', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/mais', { session: DEMO_SESSION });
    await findHeading('Mais');
    const areas = screen.getByRole('navigation', { name: 'Outras áreas' });
    expect(
      within(areas)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual([
      expect.stringContaining('Vendas'),
      expect.stringContaining('Clientes'),
      expect.stringContaining('Caixa do dia'),
      expect.stringContaining('Relatórios'),
      expect.stringContaining('Ajustes'),
      expect.stringContaining('Ajuda'),
    ]);

    await user.click(screen.getByRole('button', { name: 'Sair da conta' }));
    await findHeading('Entrar');
    expect(router.state.location.pathname).toBe('/entrar');
    expect(await screen.findByText('Você saiu da conta')).toBeInTheDocument();
  });

  it('tem link para pular para o conteúdo', async () => {
    renderApp('/inicio', { session: DEMO_SESSION });
    await findHeading('Início');
    expect(screen.getByRole('link', { name: 'Pular para o conteúdo' })).toHaveAttribute('href', '#conteudo');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'conteudo');
  });

  it('mostra a página não encontrada para endereços desconhecidos', async () => {
    renderApp('/nao-existe');
    expect(await screen.findByRole('heading', { name: 'Não achamos essa página' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para o início' })).toHaveAttribute('href', '/inicio');
  });

  it('o catálogo do design system é uma rota pública', async () => {
    renderApp('/design-system');
    await findHeading('Design system');
    await waitFor(() =>
      expect(screen.getByRole('navigation', { name: 'Seções do design system' })).toBeVisible(),
    );
  });
});
