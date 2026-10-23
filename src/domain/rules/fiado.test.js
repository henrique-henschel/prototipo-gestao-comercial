import {
  accountBalance,
  accountStatus,
  allocatePayment,
  applyAllocations,
  cancelSaleAccounts,
  compareUrgency,
  customerFiadoSummary,
  customerTimeline,
  daysOverdue,
  dueDateIn,
  fiadoAlerts,
  fiadoIndicators,
  receiveFiado,
  validateUndoFiadoPayment,
  worstStatus,
} from './fiado.js';

const TODAY = '2026-10-21';

/** Conta de teste: vencimento relativo a hoje. */
function account(id, { due = 10, original = 1000, paid = 0, customerId = 'c1', createdAt, ...rest } = {}) {
  const dueDate = dueDateIn(due, TODAY);
  return {
    id,
    customerId,
    saleId: `s-${id}`,
    originalCents: original,
    paidCents: paid,
    createdAt: createdAt ?? `${dueDateIn(due - 30, TODAY)}T10:00:00.000Z`,
    dueDate,
    cancelledAt: null,
    ...rest,
  };
}

const customer = { id: 'c1', name: 'Maria', creditCents: 0, creditLimitCents: null, fiadoBlocked: false };

describe('fiado', () => {
  it('3.2 calcula o vencimento a partir de hoje', () => {
    expect(dueDateIn(30, TODAY)).toBe('2026-11-20');
  });

  it('3.4 calcula o status de cada conta', () => {
    expect(accountStatus(account('a', { paid: 1000 }), TODAY)).toBe('quitado');
    expect(accountStatus(account('a', { due: 4 }), TODAY)).toBe('em_dia');
    expect(accountStatus(account('a', { due: 3 }), TODAY)).toBe('vence_em_breve');
    expect(accountStatus(account('a', { due: 1 }), TODAY)).toBe('vence_em_breve');
    expect(accountStatus(account('a', { due: 0 }), TODAY)).toBe('vence_hoje');
    expect(accountStatus(account('a', { due: -1 }), TODAY)).toBe('atrasado');
    expect(daysOverdue(account('a', { due: -12 }), TODAY)).toBe(12);
    expect(daysOverdue(account('a', { due: 5 }), TODAY)).toBe(0);
  });

  it('conta de venda cancelada não tem saldo', () => {
    expect(accountBalance(account('a', { cancelledAt: '2026-10-20T10:00:00Z' }))).toBe(0);
    expect(accountBalance(account('a', { original: 1000, paid: 300 }))).toBe(700);
  });

  it('3.5 e 3.6 resumem o cliente: saldo menos crédito e pior status', () => {
    const accounts = [
      account('a', { due: -5, original: 2000, paid: 500 }),
      account('b', { due: 2, original: 1000 }),
      account('c', { due: -40, original: 800, paid: 800 }),
      account('d', { due: -9, customerId: 'outro' }),
    ];
    const summary = customerFiadoSummary({ ...customer, creditCents: 300 }, accounts, TODAY);
    expect(summary).toMatchObject({
      openCents: 2500,
      balanceCents: 2200,
      status: 'atrasado',
      openCount: 2,
      overdueCents: 1500,
      maxDaysOverdue: 5,
      nextDueDate: '2026-10-16',
    });
    expect(worstStatus([account('x', { due: 2 }), account('y', { due: 0 })], TODAY)).toBe('vence_hoje');
    expect(worstStatus([], TODAY)).toBe('quitado');
  });

  it('3.7 alerta limite, atraso e bloqueio', () => {
    const accounts = [account('a', { due: -3, original: 4000 })];
    const result = fiadoAlerts(
      { ...customer, creditLimitCents: 5000, fiadoBlocked: true },
      accounts,
      2000,
      TODAY,
    );
    expect(result).toEqual({
      alerts: ['bloqueado', 'atrasado', 'limite'],
      currentBalanceCents: 4000,
      newBalanceCents: 6000,
      limitCents: 5000,
      maxDaysOverdue: 3,
    });
    expect(fiadoAlerts(customer, [], 2000, TODAY).alerts).toEqual([]);
    expect(fiadoAlerts({ ...customer, creditLimitCents: 2000 }, [], 2000, TODAY).alerts).toEqual([]);
  });

  it('3.8 abate as contas mais antigas primeiro e devolve o excedente', () => {
    const accounts = [
      account('nova', { due: 20, original: 1000 }),
      account('velha', { due: -10, original: 1500, paid: 500 }),
      account('empate-b', { due: 5, original: 300, createdAt: '2026-10-02T10:00:00Z' }),
      account('empate-a', { due: 5, original: 300, createdAt: '2026-10-01T10:00:00Z' }),
    ];
    expect(allocatePayment(accounts, 1500)).toEqual({
      allocations: [
        { accountId: 'velha', amountCents: 1000 },
        { accountId: 'empate-a', amountCents: 300 },
        { accountId: 'empate-b', amountCents: 200 },
      ],
      leftoverCents: 0,
    });
    expect(allocatePayment(accounts, 3000).leftoverCents).toBe(400);

    const { allocations } = allocatePayment(accounts, 1500);
    const paid = applyAllocations(accounts, allocations);
    expect(paid.find((a) => a.id === 'velha').paidCents).toBe(1500);
    expect(paid.find((a) => a.id === 'nova')).toBe(accounts[0]);
    const reverted = applyAllocations(paid, allocations, -1);
    expect(reverted.map((a) => a.paidCents)).toEqual(accounts.map((a) => a.paidCents));
  });

  it('3.5 e 3.8 usam o crédito do cliente no recebimento e guardam o excedente', () => {
    const accounts = [account('a', { due: -2, original: 1200 })];
    expect(receiveFiado(accounts, { creditCents: 500 }, 1000)).toEqual({
      allocations: [{ accountId: 'a', amountCents: 1200 }],
      creditCents: 300,
      creditUsedCents: 200,
      creditAddedCents: 0,
    });
    expect(receiveFiado(accounts, { creditCents: 0 }, 2000)).toMatchObject({
      creditCents: 800,
      creditUsedCents: 0,
      creditAddedCents: 800,
    });
  });

  it('1.8 cancela as contas da venda e devolve o que já foi pago como crédito', () => {
    const accounts = [account('a', { original: 1000, paid: 400 }), account('b')];
    const { accounts: next, refundCents } = cancelSaleAccounts(accounts, 's-a', '2026-10-21T15:00:00Z');
    expect(refundCents).toBe(400);
    expect(next[0].cancelledAt).toBe('2026-10-21T15:00:00Z');
    expect(next[1]).toBe(accounts[1]);
  });

  it('3.10 ordena por urgência e calcula a inadimplência', () => {
    const rows = [
      { id: 'em-dia', status: 'em_dia', maxDaysOverdue: 0, balanceCents: 9000 },
      { id: 'atrasado-pouco', status: 'atrasado', maxDaysOverdue: 2, balanceCents: 100 },
      { id: 'atrasado-muito', status: 'atrasado', maxDaysOverdue: 20, balanceCents: 100 },
      { id: 'hoje', status: 'vence_hoje', maxDaysOverdue: 0, balanceCents: 100 },
    ];
    expect(rows.sort(compareUrgency).map((r) => r.id)).toEqual([
      'atrasado-muito',
      'atrasado-pouco',
      'hoje',
      'em-dia',
    ]);

    const customers = [customer, { ...customer, id: 'c2', name: 'João' }, { ...customer, id: 'c3' }];
    const accounts = [
      account('a', { due: -5, original: 1000 }),
      account('b', { due: 10, original: 3000, customerId: 'c2' }),
    ];
    const indicators = fiadoIndicators(customers, accounts, TODAY);
    expect(indicators).toMatchObject({
      receivableCents: 4000,
      overdueCents: 1000,
      defaultRate: 0.25,
      debtorsCount: 2,
      overdueCount: 1,
    });
    expect(indicators.topDebtors.map((row) => row.customer.id)).toEqual(['c2', 'c1']);
  });

  it('3.8 só desfaz o último recebimento do cliente, e no mesmo dia', () => {
    const payment = (id, createdAt, customerId = 'c1') => ({ id, customerId, createdAt });
    const old = payment('p1', '2026-10-20T15:00:00');
    const last = payment('p2', '2026-10-21T09:00:00');
    const otherCustomer = payment('p3', '2026-10-21T10:00:00', 'c2');
    const payments = [old, last, otherCustomer];
    expect(validateUndoFiadoPayment(last, payments, TODAY)).toEqual([]);
    expect(validateUndoFiadoPayment(old, payments, TODAY)).toEqual(['desfazer_recebimento']);
    expect(validateUndoFiadoPayment(last, payments, '2026-10-22')).toEqual(['prazo_desfazer_recebimento']);
  });

  it('monta o histórico do cliente com compras e recebimentos, do mais novo ao mais antigo', () => {
    const accounts = [
      account('a', { createdAt: '2026-10-01T10:00:00Z' }),
      account('b', { createdAt: '2026-10-15T10:00:00Z' }),
      account('outro', { customerId: 'c2', createdAt: '2026-10-16T10:00:00Z' }),
    ];
    const payments = [{ id: 'p1', customerId: 'c1', createdAt: '2026-10-10T10:00:00Z' }];
    expect(customerTimeline('c1', accounts, payments).map((entry) => `${entry.type}:${entry.id}`)).toEqual([
      'compra:b',
      'recebimento:p1',
      'compra:a',
    ]);
  });
});
