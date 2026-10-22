import { canDeleteCustomer, isValidPhone, normalizePhone, validateCustomer } from './customers.js';

describe('clientes', () => {
  it('normaliza o WhatsApp para DDD + número', () => {
    expect(normalizePhone('(11) 98765-4321')).toBe('11987654321');
    expect(normalizePhone('+55 11 98765-4321')).toBe('11987654321');
    expect(normalizePhone('')).toBeNull();
    expect(isValidPhone('1133334444')).toBe(true);
    expect(isValidPhone('987654')).toBe(false);
    expect(isValidPhone(null)).toBe(true);
  });

  it('4 exige nome; WhatsApp e limite são opcionais, mas válidos', () => {
    expect(validateCustomer({ name: 'Maria', phone: '' })).toEqual([]);
    expect(validateCustomer({ name: '  ' })).toEqual(['nome_obrigatorio']);
    expect(validateCustomer({ name: 'Maria', phone: '1234' })).toEqual(['whatsapp_invalido']);
    expect(validateCustomer({ name: 'Maria', creditLimitCents: -1 })).toEqual(['limite_invalido']);
  });

  it('4 só exclui cliente sem saldo em aberto', () => {
    expect(canDeleteCustomer({ openCents: 0 })).toBe(true);
    expect(canDeleteCustomer({ openCents: 500 })).toBe(false);
  });
});
