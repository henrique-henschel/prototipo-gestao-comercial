import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetDemo } from '@/mocks/db.js';
import { DEMO_SESSION, renderApp } from '@/test/renderApp.js';
import { FAQ } from './faq.js';
import { TOUR_STEPS } from './tourSteps.js';

async function openHelp() {
  const user = userEvent.setup();
  const view = renderApp('/ajuda', { session: DEMO_SESSION });
  await screen.findByRole('button', { name: 'Ver o passo a passo de novo' });
  return { user, ...view };
}

beforeEach(() => {
  resetDemo();
});

describe('ajuda', () => {
  it('mostra as perguntas por assunto, com a resposta e o caminho para a tela', async () => {
    const { user } = await openHelp();
    for (const group of FAQ) {
      expect(screen.getByRole('region', { name: new RegExp(group.title) })).toBeInTheDocument();
    }
    const question = screen.getByText('Como faço uma venda?');
    const details = question.closest('details');
    expect(details).not.toHaveAttribute('open');

    await user.click(question);
    expect(details).toHaveAttribute('open');
    expect(within(details).getByRole('link', { name: 'Ir para Vender' })).toHaveAttribute('href', '/vender');
  });

  it('refaz o tour no Início, passo a passo, e ao fechar ele não volta', async () => {
    const { user, router } = await openHelp();
    await user.click(screen.getByRole('button', { name: 'Ver o passo a passo de novo' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/inicio'));

    let tour = await screen.findByRole('dialog', { name: TOUR_STEPS[0].title });
    expect(tour).toHaveTextContent(`Passo 1 de ${TOUR_STEPS.length}`);
    for (const step of TOUR_STEPS.slice(1)) {
      await user.click(within(tour).getByRole('button', { name: 'Próximo' }));
      tour = screen.getByRole('dialog', { name: step.title });
    }
    await user.click(within(tour).getByRole('button', { name: 'Voltar' }));
    tour = screen.getByRole('dialog', { name: TOUR_STEPS.at(-2).title });
    await user.click(within(tour).getByRole('button', { name: 'Próximo' }));

    await user.click(screen.getByRole('button', { name: 'Começar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(router.state.location.state).toBeNull();
  });
});
