import {
  amountByMethod,
  calcChange,
  calcFee,
  feeRate,
  finalizePayments,
  paymentProgress,
  suggestCashAmounts,
  validatePayments,
} from './payments.js';

const fees = { debito: 1.99, creditoAVista: 3.49, creditoParcelado: 4.99 };
const allActive = { paymentMethods: { dinheiro: true, pix: true, debito: true, credito: true, fiado: true } };

describe('pagamentos', () => {
  it('2.1 calcula o troco e quanto falta, nunca negativo', () => {
    expect(calcChange(5000, 3250)).toEqual({ changeCents: 1750, missingCents: 0 });
    expect(calcChange(3250, 3250)).toEqual({ changeCents: 0, missingCents: 0 });
    expect(calcChange(2000, 3250)).toEqual({ changeCents: 0, missingCents: 1250 });
    expect(calcChange(undefined, 500)).toEqual({ changeCents: 0, missingCents: 500 });
  });

  it('2.1 sugere o valor certo e cédulas que cobrem a parcela', () => {
    expect(suggestCashAmounts(1750)).toEqual([1750, 1800, 2000, 5000]);
    expect(suggestCashAmounts(2000)).toEqual([2000, 5000, 10000]);
    expect(suggestCashAmounts(0)).toEqual([]);
  });

  it('2.5 acompanha o pagamento dividido até a soma exata', () => {
    expect(paymentProgress(3000, [{ amountCents: 1000 }])).toEqual({
      paidCents: 1000,
      remainingCents: 2000,
      exceedingCents: 0,
      isComplete: false,
    });
    expect(paymentProgress(3000, [{ amountCents: 1000 }, { amountCents: 2000 }]).isComplete).toBe(true);
    expect(paymentProgress(3000, [{ amountCents: 3500 }]).exceedingCents).toBe(500);
  });

  it('2.1 e 2.5 validam as parcelas', () => {
    const ok = [
      { method: 'dinheiro', amountCents: 1000, receivedCents: 2000 },
      { method: 'pix', amountCents: 500 },
    ];
    expect(validatePayments(1500, ok, allActive)).toEqual([]);
    expect(validatePayments(1500, [], allActive)).toEqual(['sem_pagamento']);
    expect(validatePayments(0, [], allActive)).toEqual([]);
    expect(validatePayments(2000, ok, allActive)).toEqual(['soma_diferente']);
    expect(validatePayments(1000, [{ method: 'dinheiro', amountCents: 1000, receivedCents: 500 }])).toEqual([
      'dinheiro_insuficiente',
    ]);
    expect(validatePayments(1000, [{ method: 'pix', amountCents: 1000, receivedCents: 2000 }])).toEqual([
      'troco_fora_do_dinheiro',
    ]);
    expect(
      validatePayments(1000, [
        { method: 'pix', amountCents: 0 },
        { method: 'pix', amountCents: 1000 },
      ]),
    ).toEqual(['valor_invalido']);
    const pixOff = { paymentMethods: { ...allActive.paymentMethods, pix: false } };
    expect(validatePayments(1000, [{ method: 'pix', amountCents: 1000 }], pixOff)).toEqual(['forma_inativa']);
  });

  it('2.3 calcula a taxa por forma e parcelamento sem mudar o valor cobrado', () => {
    expect(feeRate({ method: 'debito' }, fees)).toBe(1.99);
    expect(feeRate({ method: 'credito', installments: 1 }, fees)).toBe(3.49);
    expect(feeRate({ method: 'credito', installments: 3 }, fees)).toBe(4.99);
    expect(feeRate({ method: 'pix' }, fees)).toBe(0);
    expect(calcFee({ method: 'debito', amountCents: 10000 }, fees)).toBe(199);
    expect(calcFee({ method: 'credito', amountCents: 2550 }, fees)).toBe(89);
  });

  it('completa as parcelas com troco e taxa', () => {
    const { payments, changeCents } = finalizePayments(
      [
        { method: 'dinheiro', amountCents: 1250, receivedCents: 2000 },
        { method: 'debito', amountCents: 1000 },
      ],
      fees,
    );
    expect(changeCents).toBe(750);
    expect(payments[0]).toMatchObject({ changeCents: 750, feeCents: 0, amountCents: 1250 });
    expect(payments[1]).toMatchObject({ feeCents: 20, amountCents: 1000 });
    expect(amountByMethod(payments, 'dinheiro')).toBe(1250);
  });
});
