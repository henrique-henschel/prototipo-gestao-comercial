import { whatsappLink } from './whatsapp.js';

describe('whatsappLink', () => {
  it('usa o número com 55 e a mensagem codificada', () => {
    expect(whatsappLink({ phone: '(11) 98765-4321', text: 'Olá, Maria!' })).toBe(
      'https://wa.me/5511987654321?text=Ol%C3%A1%2C%20Maria!',
    );
  });

  it('sem número, deixa o WhatsApp perguntar para quem enviar', () => {
    expect(whatsappLink({ phone: null, text: 'Recibo' })).toBe('https://wa.me/?text=Recibo');
  });
});
