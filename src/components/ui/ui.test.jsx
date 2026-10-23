import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, MoneyInput, QuantityInput, QuantityStepper, StatusPill, Tabs } from '@/components/ui';

function ControlledMoney({ keypad = false }) {
  const [value, setValue] = useState(0);
  return <MoneyInput label="Valor recebido" value={value} onChange={setValue} keypad={keypad} />;
}

function ControlledQuantity({ unit }) {
  const [value, setValue] = useState(0);
  return <QuantityInput label="Quantidade" value={value} onChange={setValue} unit={unit} keypad />;
}

describe('QuantityInput', () => {
  it('em unidades inteiras, cada dígito é uma unidade', async () => {
    const user = userEvent.setup();
    render(<ControlledQuantity unit="un" />);
    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByLabelText('Quantidade')).toHaveValue('12 un');
    await user.click(screen.getByRole('button', { name: /^Apagar/ }));
    expect(screen.getByLabelText('Quantidade')).toHaveValue('1 un');
  });

  it('em kg, os dígitos entram pela direita com 3 casas', async () => {
    const user = userEvent.setup();
    render(<ControlledQuantity unit="kg" />);
    const input = screen.getByLabelText('Quantidade');
    expect(input).toHaveValue('0,000 kg');
    await user.click(input);
    await user.keyboard('1500');
    expect(input).toHaveValue('1,500 kg');
  });
});

describe('MoneyInput', () => {
  it('digita como calculadora: os números entram pela direita', async () => {
    const user = userEvent.setup();
    render(<ControlledMoney />);
    const input = screen.getByLabelText('Valor recebido');

    await user.click(input);
    await user.keyboard('1250');
    expect(input).toHaveValue('R$ 12,50');

    await user.keyboard('{Backspace}');
    expect(input).toHaveValue('R$ 1,25');
  });

  it('funciona com o teclado numérico próprio', async () => {
    const user = userEvent.setup();
    render(<ControlledMoney keypad />);
    const keypad = screen.getByRole('group', { name: 'Teclado para valor recebido' });
    const key = (name) => within(keypad).getByRole('button', { name });

    await user.click(key('5'));
    await user.click(key('00'));
    await user.click(key('0'));
    expect(screen.getByLabelText('Valor recebido')).toHaveValue('R$ 50,00');

    await user.click(key(/apagar/i));
    expect(screen.getByLabelText('Valor recebido')).toHaveValue('R$ 5,00');
  });
});

describe('Button', () => {
  it('fica desabilitado e anuncia carregamento quando loading', () => {
    render(<Button loading>Salvar</Button>);
    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});

describe('QuantityStepper', () => {
  it('respeita mínimo e passos decimais sem erro de arredondamento', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState(0.1);
      return <QuantityStepper label="Peso" value={value} onChange={setValue} step={0.1} min={0} unit="kg" />;
    }
    render(<Controlled />);
    await user.click(screen.getByRole('button', { name: 'Aumentar' }));
    await user.click(screen.getByRole('button', { name: 'Aumentar' }));
    expect(screen.getByRole('status')).toHaveTextContent('0,3 kg');

    await user.click(screen.getByRole('button', { name: 'Diminuir' }));
    await user.click(screen.getByRole('button', { name: 'Diminuir' }));
    await user.click(screen.getByRole('button', { name: 'Diminuir' }));
    expect(screen.getByRole('status')).toHaveTextContent('0 kg');
    expect(screen.getByRole('button', { name: 'Diminuir' })).toBeDisabled();
  });
});

describe('Tabs', () => {
  it('troca de aba com as setas do teclado', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [tab, setTab] = useState('a');
      return (
        <Tabs
          label="Exemplo"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'a', label: 'Primeira' },
            { value: 'b', label: 'Segunda' },
          ]}
        >
          {(active) => <p>Conteúdo {active}</p>}
        </Tabs>
      );
    }
    render(<Controlled />);
    await user.click(screen.getByRole('tab', { name: 'Primeira' }));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Segunda' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Segunda' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Conteúdo b');
  });
});

describe('StatusPill', () => {
  it('mostra texto além da cor', () => {
    render(<StatusPill status="atrasado" />);
    expect(screen.getByText('Atrasado')).toBeInTheDocument();
  });
});
