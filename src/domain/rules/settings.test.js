import { DEFAULT_SETTINGS } from '../constants.js';
import { canDisablePaymentMethod, mergeSettings, validateBusiness, validateSettings } from './settings.js';

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

describe('ajustes: valores (regra 9)', () => {
  it('taxas de 0% a 99,99%', () => {
    expect(validateSettings(mergeSettings(DEFAULT_SETTINGS, { fees: { debito: 99.99 } }))).toEqual([]);
    expect(validateSettings(mergeSettings(DEFAULT_SETTINGS, { fees: { debito: -1 } }))).toEqual([
      'taxa_invalida',
    ]);
    expect(validateSettings(mergeSettings(DEFAULT_SETTINGS, { fees: { creditoParcelado: 100 } }))).toEqual([
      'taxa_invalida',
    ]);
  });

  it('vencimento do fiado em dias inteiros, de 1 a 365', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, fiadoDefaultDays: 365 })).toEqual([]);
    expect(validateSettings({ ...DEFAULT_SETTINGS, fiadoDefaultDays: 0 })).toEqual(['prazo_invalido']);
    expect(validateSettings({ ...DEFAULT_SETTINGS, fiadoDefaultDays: 7.5 })).toEqual(['prazo_invalido']);
  });

  it('troco inicial padrão sem valor negativo', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, defaultOpeningCents: 5000 })).toEqual([]);
    expect(validateSettings({ ...DEFAULT_SETTINGS, defaultOpeningCents: -1 })).toEqual(['troco_invalido']);
  });

  it('2 não deixa desligar a última forma de pagamento', () => {
    const onlyCash = mergeSettings(DEFAULT_SETTINGS, {
      paymentMethods: { pix: false, debito: false, credito: false, fiado: false },
    });
    expect(canDisablePaymentMethod(DEFAULT_SETTINGS, 'pix')).toBe(true);
    expect(canDisablePaymentMethod(onlyCash, 'dinheiro')).toBe(false);
  });

  it('dados do negócio: nome obrigatório e WhatsApp com DDD', () => {
    expect(validateBusiness({ name: 'Barraca da Rosa', phone: '(11) 98765-4321' })).toEqual([]);
    expect(validateBusiness({ phone: '' })).toEqual([]);
    expect(validateBusiness({ name: '  ' })).toEqual(['nome_obrigatorio']);
    expect(validateBusiness({ phone: '9876' })).toEqual(['whatsapp_invalido']);
  });
});
