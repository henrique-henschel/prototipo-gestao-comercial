import { compareValues } from '@/domain/rules/metrics.js';
import { DASHBOARD_PERIODS, deltaOf } from './periods.js';

describe('comparação do Início', () => {
  it('diz a variação em reais, em palavras simples', () => {
    expect(deltaOf(compareValues(1250, 1000))).toEqual({
      text: 'R$ 2,50 a mais',
      direction: 'up',
      positive: true,
    });
    expect(deltaOf(compareValues(-5000, 300))).toMatchObject({
      text: 'R$ 53,00 a menos',
      direction: 'down',
      positive: false,
    });
    expect(deltaOf(compareValues(800, 0))).toMatchObject({ direction: 'up' });
    expect(deltaOf(compareValues(0, 0))).toMatchObject({ text: 'Igual', direction: 'flat' });
  });

  it('diz com o que compara', () => {
    const [today, week, month] = DASHBOARD_PERIODS;
    expect(today.against()).toBe('ontem até esta hora');
    expect(week.against()).toBe('os 7 dias antes');
    expect(month.against({ start: '2026-10-01', end: '2026-10-23' })).toBe('os 23 dias antes');
  });
});
