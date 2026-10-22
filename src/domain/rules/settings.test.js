import { DEFAULT_SETTINGS } from '../constants.js';
import { mergeSettings, validateSettings } from './settings.js';

describe('ajustes', () => {
  it('9 mescla alterações parciais de formas e taxas', () => {
    const next = mergeSettings(DEFAULT_SETTINGS, { paymentMethods: { pix: false }, fees: { debito: 1.5 } });
    expect(next.paymentMethods).toEqual({
      dinheiro: true,
      pix: false,
      debito: true,
      credito: true,
      fiado: true,
    });
    expect(next.fees).toEqual({ debito: 1.5, creditoAVista: 0, creditoParcelado: 0 });
    expect(next.fiadoDefaultDays).toBe(30);
  });

  it('2 exige pelo menos uma forma de pagamento ativa', () => {
    const allOff = Object.fromEntries(
      Object.keys(DEFAULT_SETTINGS.paymentMethods).map((key) => [key, false]),
    );
    expect(validateSettings(DEFAULT_SETTINGS)).toEqual([]);
    expect(validateSettings(mergeSettings(DEFAULT_SETTINGS, { paymentMethods: allOff }))).toEqual([
      'forma_inativa',
    ]);
  });
});
