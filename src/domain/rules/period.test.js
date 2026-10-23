import { customPeriod } from './period.js';

describe('customPeriod (regra 8, "Escolher datas")', () => {
  const today = '2026-10-23';

  it('aceita um período dentro do passado', () => {
    expect(customPeriod('2026-10-01', '2026-10-15', today)).toEqual({
      start: '2026-10-01',
      end: '2026-10-15',
    });
  });

  it('desinverte as datas trocadas', () => {
    expect(customPeriod('2026-10-15', '2026-10-01', today)).toEqual({
      start: '2026-10-01',
      end: '2026-10-15',
    });
  });

  it('nunca passa de hoje', () => {
    expect(customPeriod('2026-10-20', '2026-11-05', today)).toEqual({ start: '2026-10-20', end: today });
    expect(customPeriod('2026-10-24', '2026-10-30', today)).toBeNull();
  });

  it('recusa datas que faltam ou não existem', () => {
    expect(customPeriod(null, '2026-10-15', today)).toBeNull();
    expect(customPeriod('2026-10-01', '', today)).toBeNull();
    expect(customPeriod('2026-02-31', '2026-03-05', today)).toBeNull();
    expect(customPeriod('01/10/2026', '2026-10-05', today)).toBeNull();
  });
});
