import {
  formatBRL,
  formatDecimal,
  fromCents,
  parseCentsFromDigits,
  percentOf,
  sumCents,
  toCents,
} from './money.js';

describe('money', () => {
  it('converte reais para centavos sem erro de ponto flutuante', () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(1.005)).toBe(101);
    expect(toCents(-2.5)).toBe(-250);
    expect(toCents(Number.NaN)).toBe(0);
    expect(fromCents(1250)).toBe(12.5);
  });

  it('formata em reais no padrão brasileiro', () => {
    expect(formatBRL(1250)).toBe('R$ 12,50');
    expect(formatBRL(123456789)).toBe('R$ 1.234.567,89');
    expect(formatBRL(0)).toBe('R$ 0,00');
    expect(formatBRL(-500)).toBe('− R$ 5,00');
    expect(formatBRL(500, { signed: true })).toBe('+ R$ 5,00');
    expect(formatDecimal(705)).toBe('7,05');
  });

  it('lê a digitação estilo calculadora a partir dos dígitos', () => {
    expect(parseCentsFromDigits('R$ 0,005')).toBe(5);
    expect(parseCentsFromDigits('R$ 12,345')).toBe(12345);
    expect(parseCentsFromDigits('R$ 12,3')).toBe(123);
    expect(parseCentsFromDigits('')).toBe(0);
    expect(parseCentsFromDigits('abc')).toBe(0);
    expect(parseCentsFromDigits('999999', { max: 50000 })).toBe(50000);
  });

  it('soma e calcula percentuais em centavos', () => {
    expect(sumCents([100, 250, undefined, 5])).toBe(355);
    expect(percentOf(1000, 3.5)).toBe(35);
    expect(percentOf(999, 10)).toBe(100);
  });
});
