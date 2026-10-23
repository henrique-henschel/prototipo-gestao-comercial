import { chargeText } from './charge.js';

const TODAY = '2026-10-21';
const customer = { name: 'Maria das Graças' };

describe('cobrança pelo WhatsApp', () => {
  it('3.9 traz o negócio, o valor em aberto, o atraso e a chave Pix', () => {
    const text = chargeText({
      customer,
      summary: { balanceCents: 4550, nextDueDate: '2026-10-09' },
      businessName: 'Barraca da Rosa',
      pixKey: 'rosa@exemplo.com.br',
      today: TODAY,
    });
    expect(text).toContain('Olá, Maria!');
    expect(text.startsWith('*Barraca da Rosa*')).toBe(true);
    expect(text).toContain('*R$ 45,50*');
    expect(text).toContain('venceu em 09/10/2026 (12 dias atrás)');
    expect(text).toContain('pagar pelo Pix: rosa@exemplo.com.br');
  });

  it('fala do vencimento de hoje ou futuro e funciona sem Pix', () => {
    const today = chargeText({ customer, summary: { balanceCents: 1000, nextDueDate: TODAY }, today: TODAY });
    expect(today).toContain('que vence hoje');
    expect(today).toContain('passar aqui para acertar');
    expect(today.startsWith('Olá')).toBe(true);

    const later = chargeText({
      customer,
      summary: { balanceCents: 1000, nextDueDate: '2026-11-20' },
      today: TODAY,
    });
    expect(later).toContain('que vence em 20/11/2026');
  });
});
