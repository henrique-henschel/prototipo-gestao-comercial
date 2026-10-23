import { addDays, dateOf, diffInDays, eachDay, endOfMonth, startOfMonth, toISODate } from './date.js';
import {
  formatDate,
  formatDateMedium,
  formatDayOfMonth,
  formatPercent,
  formatPhone,
  formatQuantity,
  formatRelativeDay,
  formatWeekdayShort,
  plural,
} from './format.js';

describe('date', () => {
  it('soma dias respeitando a virada de mês e ano', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('acha o dia civil local, os limites do mês e a lista de dias', () => {
    expect(dateOf(new Date(2026, 9, 21, 23, 30).toISOString())).toBe('2026-10-21');
    expect(dateOf('2026-10-21')).toBe('2026-10-21');
    expect(startOfMonth('2026-02-17')).toBe('2026-02-01');
    expect(endOfMonth('2026-02-17')).toBe('2026-02-28');
    expect(endOfMonth('2028-02-03')).toBe('2028-02-29');
    expect(eachDay('2026-10-30', '2026-11-01')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
  });

  it('calcula a diferença em dias civis', () => {
    expect(diffInDays('2026-10-21', '2026-10-28')).toBe(7);
    expect(diffInDays('2026-10-21', '2026-10-18')).toBe(-3);
    expect(toISODate(new Date(2026, 9, 5))).toBe('2026-10-05');
  });
});

describe('format', () => {
  it('formata datas e percentuais em pt-BR', () => {
    expect(formatDate('2026-10-05')).toBe('05/10/2026');
    expect(formatDateMedium('2026-10-21')).toBe('qua., 21 de out.');
    expect(formatPercent(0.125)).toBe('12,5%');
    expect(formatWeekdayShort('2026-10-21')).toBe('qua');
    expect(formatDayOfMonth('2026-10-01')).toBe('1');
  });

  it('descreve o dia relativo em linguagem simples', () => {
    const ref = '2026-10-21';
    expect(formatRelativeDay('2026-10-21', ref)).toBe('hoje');
    expect(formatRelativeDay('2026-10-22', ref)).toBe('amanhã');
    expect(formatRelativeDay('2026-10-20', ref)).toBe('ontem');
    expect(formatRelativeDay('2026-10-26', ref)).toBe('em 5 dias');
    expect(formatRelativeDay('2026-10-18', ref)).toBe('há 3 dias');
  });

  it('pluraliza', () => {
    expect(plural(1, 'item', 'itens')).toBe('1 item');
    expect(plural(3, 'item', 'itens')).toBe('3 itens');
    expect(plural(2, 'venda')).toBe('2 vendas');
  });

  it('formata o WhatsApp com DDD', () => {
    expect(formatPhone('11987654321')).toBe('(11) 98765-4321');
    expect(formatPhone('1133334444')).toBe('(11) 3333-4444');
    expect(formatPhone('123')).toBe('123');
    expect(formatPhone(null)).toBe('');
  });

  it('formata quantidades com a unidade', () => {
    expect(formatQuantity(12, 'un')).toBe('12 un');
    expect(formatQuantity(1.25, 'kg')).toBe('1,25 kg');
    expect(formatQuantity(1.5, 'kg', { fixed: true })).toBe('1,500 kg');
    expect(formatQuantity(-2)).toBe('-2');
  });
});
