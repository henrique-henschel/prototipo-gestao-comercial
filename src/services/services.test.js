import { accountBalance } from '@/domain/rules/fiado.js';
import { resetDemo } from '@/mocks/db.js';
import { ApiError, configureApi } from './api.js';
import { login, signup } from './auth.service.js';
import { closeCashDay, createExpense, listCashDays, reopenCashDay } from './cash.service.js';
import { createCustomer, deleteCustomer, listCustomers } from './customers.service.js';
import { listFiadoAccounts, receiveFiadoPayment, undoFiadoPayment } from './fiado.service.js';
import { addStockMovement, createProduct, listProducts } from './products.service.js';
import { getReport } from './reports.service.js';
import { cancelSale, createSale, listSales, undoSale } from './sales.service.js';
import { completeOnboarding, getBusiness, updateSettings } from './settings.service.js';
import { today } from '@/lib/date.js';

async function stockedProduct(minQuantity = 5) {
  const products = await listProducts();
  return products.find((p) => p.active && p.trackStock && p.quantity >= minQuantity);
}

async function newCustomer(name = 'Cliente Teste') {
  return createCustomer({ name, phone: '(11) 91234-5678' });
}

/** Espera a promessa falhar com um ApiError do código informado. */
async function expectApiError(promise, code) {
  const error = await promise.catch((caught) => caught);
  expect(error).toBeInstanceOf(ApiError);
  expect(error.code).toBe(code);
  expect(error.message).toBeTruthy();
  return error;
}

beforeEach(() => {
  resetDemo();
  configureApi({ failing: false, slow: false });
});

describe('serviço de vendas', () => {
  it('venda em dinheiro com troco baixa o estoque e abre o caixa', async () => {
    const product = await stockedProduct();
    const before = (await listSales()).length;
    const total = product.priceCents * 2;
    const { sale, products, movements } = await createSale({
      items: [{ productId: product.id, quantity: 2 }],
      payments: [{ method: 'dinheiro', amountCents: total, receivedCents: total + 1000 }],
    });

    expect(sale).toMatchObject({ totalCents: total, changeCents: 1000, status: 'concluida' });
    expect(sale.items[0]).toMatchObject({ name: product.name, unitPriceCents: product.priceCents });
    expect(products[0].quantity).toBe(product.quantity - 2);
    expect(movements[0]).toMatchObject({ type: 'venda', delta: -2, saleId: sale.id });
    expect((await listSales()).length).toBe(before + 1);
    expect((await listCashDays()).some((cash) => cash.date === today())).toBe(true);
  });

  it('venda dividida com fiado cria a conta com o vencimento padrão', async () => {
    const product = await stockedProduct();
    const customer = await newCustomer();
    const total = product.priceCents;
    const entrada = Math.floor(total / 2);
    const { sale, fiadoAccounts } = await createSale({
      items: [{ productId: product.id, quantity: 1 }],
      payments: [
        { method: 'pix', amountCents: entrada },
        { method: 'fiado', amountCents: total - entrada },
      ],
      customerId: customer.id,
    });
    expect(fiadoAccounts).toHaveLength(1);
    expect(fiadoAccounts[0]).toMatchObject({
      customerId: customer.id,
      saleId: sale.id,
      originalCents: total - entrada,
    });
    expect(fiadoAccounts[0].dueDate > today()).toBe(true);
  });

  it('recusa venda com soma errada, fiado sem cliente e item avulso zerado', async () => {
    const product = await stockedProduct();
    const items = [{ productId: product.id, quantity: 1 }];
    await expectApiError(
      createSale({ items, payments: [{ method: 'pix', amountCents: 1 }] }),
      'soma_diferente',
    );
    await expectApiError(
      createSale({ items, payments: [{ method: 'fiado', amountCents: product.priceCents }] }),
      'cliente_obrigatorio',
    );
    await expectApiError(
      createSale({ items: [{ quantity: 1, unitPriceCents: 0 }], payments: [] }),
      'valor_invalido',
    );
  });

  it('venda sem estoque passa por padrão e é bloqueada quando o ajuste está ligado', async () => {
    const product = await stockedProduct(1);
    const quantity = product.quantity + 5;
    const input = {
      items: [{ productId: product.id, quantity }],
      payments: [{ method: 'pix', amountCents: Math.round(product.priceCents * quantity) }],
    };
    await updateSettings({ blockSaleWithoutStock: true });
    const error = await expectApiError(createSale(input), 'sem_estoque');
    expect(error.details[0].productId).toBe(product.id);

    await updateSettings({ blockSaleWithoutStock: false });
    const { products } = await createSale(input);
    expect(products[0].quantity).toBeLessThan(0);
  });

  it('desfazer reverte tudo, e a venda some do histórico', async () => {
    const product = await stockedProduct();
    const { sale } = await createSale({
      items: [{ productId: product.id, quantity: 1 }],
      payments: [{ method: 'pix', amountCents: product.priceCents }],
    });
    const { products } = await undoSale(sale.id);
    expect(products[0].quantity).toBe(product.quantity);
    expect((await listSales()).some((s) => s.id === sale.id)).toBe(false);
    await expectApiError(undoSale(sale.id), 'nao_encontrado');
  });

  it('cancelar devolve o estoque e transforma o fiado pago em crédito', async () => {
    const product = await stockedProduct();
    const customer = await newCustomer();
    const { sale } = await createSale({
      items: [{ productId: product.id, quantity: 1 }],
      payments: [{ method: 'fiado', amountCents: product.priceCents }],
      customerId: customer.id,
    });
    await receiveFiadoPayment(customer.id, { amountCents: 100, method: 'dinheiro' });

    await expectApiError(cancelSale(sale.id, { reason: '' }), 'motivo_obrigatorio');
    const result = await cancelSale(sale.id, { reason: 'cliente_desistiu' });
    expect(result.sale).toMatchObject({ status: 'cancelada', cancellation: { reason: 'cliente_desistiu' } });
    expect(result.products[0].quantity).toBe(product.quantity);
    expect(result.movements[0].type).toBe('estorno');
    expect(result.refundCents).toBe(100);
    expect(result.customer.creditCents).toBe(100);
    expect(accountBalance(result.fiadoAccounts[0])).toBe(0);
    await expectApiError(cancelSale(sale.id, { reason: 'outro' }), 'ja_cancelada');
  });
});

describe('serviço de fiado', () => {
  it('recebe em FIFO, guarda o excedente como crédito e desfaz o último recebimento', async () => {
    const product = await stockedProduct();
    const customer = await newCustomer();
    const price = product.priceCents;
    for (const dueDate of ['2099-02-01', '2099-01-01']) {
      await createSale({
        items: [{ productId: product.id, quantity: 1 }],
        payments: [{ method: 'fiado', amountCents: price, dueDate }],
        customerId: customer.id,
      });
    }
    const { payment, customer: updated } = await receiveFiadoPayment(customer.id, {
      amountCents: price + 50,
      method: 'pix',
    });
    const accounts = await listFiadoAccounts({ customerId: customer.id });
    const older = accounts.find((a) => a.dueDate === '2099-01-01');
    const newer = accounts.find((a) => a.dueDate === '2099-02-01');
    expect(payment.allocations[0]).toEqual({ accountId: older.id, amountCents: price });
    expect(older.paidCents).toBe(price);
    expect(newer.paidCents).toBe(50);
    expect(updated.creditCents).toBe(0);

    const undone = await undoFiadoPayment(payment.id);
    expect(undone.customer.creditCents).toBe(0);
    expect(undone.fiadoAccounts.every((account) => account.paidCents === 0)).toBe(true);
    await expectApiError(
      receiveFiadoPayment(customer.id, { amountCents: 100, method: 'fiado' }),
      'fiado_nao_permitido',
    );
  });
});

describe('serviços de cadastro, estoque e caixa', () => {
  it('produto novo com estoque inicial gera uma entrada; perda exige motivo', async () => {
    const { product, movement } = await createProduct({
      name: 'Pamonha',
      emoji: '🌽',
      color: 'amarelo',
      category: 'lanches',
      unit: 'un',
      priceCents: 700,
      costCents: 300,
      minQuantity: 3,
      quantity: 10,
    });
    expect(product.quantity).toBe(10);
    expect(movement).toMatchObject({ type: 'entrada', delta: 10, note: 'Estoque inicial' });
    await expectApiError(addStockMovement(product.id, { type: 'perda', quantity: 1 }), 'motivo_obrigatorio');
    await expectApiError(addStockMovement(product.id, { type: 'venda', quantity: 1 }), 'movimento_invalido');
    const ajuste = await addStockMovement(product.id, { type: 'ajuste', quantity: 4 });
    expect(ajuste.product.quantity).toBe(4);
  });

  it('cliente com saldo não pode ser apagado', async () => {
    const customers = await listCustomers();
    const accounts = await listFiadoAccounts();
    const debtor = customers.find((c) =>
      accounts.some((a) => a.customerId === c.id && accountBalance(a) > 0),
    );
    await expectApiError(deleteCustomer(debtor.id), 'cliente_devendo');
    const fresh = await newCustomer('Sem dívida');
    await expect(deleteCustomer(fresh.id)).resolves.toEqual({ customerId: fresh.id });
    await expectApiError(newCustomer(''), 'nome_obrigatorio');
  });

  it('fecha o caixa com o esperado calculado e permite reabrir', async () => {
    const date = today();
    const product = await stockedProduct();
    await createSale({
      items: [{ productId: product.id, quantity: 1 }],
      payments: [{ method: 'dinheiro', amountCents: product.priceCents }],
    });
    await createExpense({ category: 'transporte', amountCents: 100, method: 'dinheiro' });
    const closed = await closeCashDay(date, { countedCents: 0 });
    expect(closed.closedAt).toBeTruthy();
    expect(closed.expectedCents).toBeGreaterThan(0);
    await expectApiError(closeCashDay(date, { countedCents: 0 }), 'caixa_fechado');
    const reopened = await reopenCashDay(date);
    expect(reopened).toMatchObject({ closedAt: null, countedCents: null });
  });

  it('monta os relatórios de todos os tipos', async () => {
    const period = { start: today(), end: today() };
    for (const type of ['resumo', 'vendas', 'formas', 'produtos', 'fiado', 'estoque', 'caixa']) {
      const report = await getReport({ type, period });
      expect(report).toMatchObject({ type, period });
      expect(report.data).toBeTruthy();
    }
  });
});

describe('autenticação, boas-vindas e modo demonstração', () => {
  it('qualquer e-mail e senha entram, mas os dois são obrigatórios', async () => {
    const session = await login({ email: 'Maria.Silva@Exemplo.com', password: '123' });
    expect(session.user).toMatchObject({ name: 'Maria Silva', email: 'maria.silva@exemplo.com' });
    await expectApiError(login({ email: '', password: '' }), 'login_incompleto');
  });

  it('cadastro leva às boas-vindas, que podem começar do zero', async () => {
    const session = await signup({ name: 'Joana', email: 'joana@exemplo.com', password: 'x' });
    expect(session.onboarded).toBe(false);
    expect(await getBusiness()).toMatchObject({ name: '', sells: [] });
    await completeOnboarding({
      businessName: 'Doces da Joana',
      sells: ['doces'],
      paymentMethods: { dinheiro: true, pix: true, debito: false, credito: false, fiado: true },
      keepSampleData: false,
    });
    expect(await getBusiness()).toMatchObject({
      name: 'Doces da Joana',
      onboarded: true,
      ownerName: 'Joana',
    });
    expect(await listProducts()).toEqual([]);
  });

  it('o modo "simular erro" faz toda chamada falhar', async () => {
    configureApi({ failing: true });
    await expectApiError(listProducts(), 'rede');
  });
});
