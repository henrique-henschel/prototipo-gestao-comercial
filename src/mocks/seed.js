import { DEFAULT_SETTINGS } from '@/domain/constants.js';
import { summarizeCashDay } from '@/domain/rules/cash.js';
import { accountBalance, applyAllocations, openAccounts, receiveFiado } from '@/domain/rules/fiado.js';
import { sumCents } from '@/domain/rules/money.js';
import { finalizePayments, suggestCashAmounts } from '@/domain/rules/payments.js';
import { calcSaleTotals, lineTotal } from '@/domain/rules/sales.js';
import { applyMovement, roundQuantity } from '@/domain/rules/stock.js';
import { addDays, dateOf, diffInDays, parseISODate, toISODate } from '@/lib/date.js';
import { createRandom } from './random.js';

/**
 * Dados de exemplo da "Barraca da Rosa": cerca de 90 dias de vendas, fiado,
 * estoque, despesas e caixa, gerados com PRNG de semente fixa e datas relativas
 * a `now`. A mesma semente e o mesmo `now` geram sempre os mesmos dados.
 *
 * Os dados nascem das próprias regras de `domain/rules` (totais, troco, taxas,
 * abatimento FIFO, movimentos de estoque), então são coerentes entre si.
 */

export const DEMO_SEED = 20261021;
export const HISTORY_DAYS = 90;

/** @type {import('@/domain/models.js').User} */
export const DEMO_USER = { id: 'user_demo', name: 'Rosa Oliveira', email: 'rosa@exemplo.com.br' };

const DEMO_SETTINGS = {
  ...DEFAULT_SETTINGS,
  fees: { debito: 1.99, creditoAVista: 3.49, creditoParcelado: 4.99 },
  pixKey: 'rosa@exemplo.com.br',
  defaultOpeningCents: 5000,
};

// [nome, emoji, cor, categoria, unidade, preço, custo, mínimo, popularidade, opções]
// `scenario` garante produtos "acabando" e "acabou" hoje; `activeUntil` desativa o produto
// depois desse dia do histórico.
const PRODUCTS = [
  ['Água mineral 500 ml', '💧', 'azul', 'bebidas', 'un', 300, 110, 12, 10],
  ['Refrigerante lata', '🥤', 'vermelho', 'bebidas', 'un', 600, 320, 12, 9],
  ['Suco natural 300 ml', '🧃', 'laranja', 'bebidas', 'un', 700, 260, 6, 6],
  ['Cafezinho', '☕', 'cinza', 'bebidas', 'un', 250, 50, 0, 8, { trackStock: false }],
  ['Cerveja lata', '🍺', 'amarelo', 'bebidas', 'un', 700, 390, 12, 6],
  ['Água de coco', '🥥', 'verde', 'bebidas', 'un', 600, 250, 6, 5, { scenario: 'acabando' }],
  ['Coxinha', '🍗', 'laranja', 'salgados', 'un', 600, 210, 10, 10],
  ['Pastel de carne', '🥟', 'amarelo', 'salgados', 'un', 800, 290, 10, 8],
  ['Pão de queijo', '🧀', 'amarelo', 'salgados', 'un', 300, 90, 15, 7, { scenario: 'acabando' }],
  ['Esfiha de carne', '🫓', 'laranja', 'salgados', 'un', 500, 170, 8, 5],
  ['Sanduíche natural', '🥪', 'verde', 'lanches', 'un', 1200, 480, 4, 5],
  ['Cachorro-quente', '🌭', 'vermelho', 'lanches', 'un', 1000, 360, 5, 6],
  ['Tapioca', '🌮', 'rosa', 'lanches', 'un', 1000, null, 0, 4, { trackStock: false }],
  ['Milho cozido', '🌽', 'amarelo', 'lanches', 'un', 500, 150, 5, 4, { activeUntil: 40 }],
  ['Brigadeiro', '🍫', 'roxo', 'doces', 'un', 300, 90, 10, 6],
  ['Bolo de pote', '🍰', 'rosa', 'doces', 'un', 1000, 370, 5, 4, { scenario: 'acabando' }],
  ['Biscoito recheado', '🍪', 'laranja', 'doces', 'pacote', 350, 160, 10, 4],
  ['Bala de goma', '🍬', 'rosa', 'doces', 'pacote', 500, 210, 5, 3],
  ['Picolé', '🍦', 'azul', 'doces', 'un', 400, 150, 10, 5],
  ['Banana', '🍌', 'amarelo', 'frutas', 'duzia', 800, 400, 2, 3],
  ['Laranja', '🍊', 'laranja', 'frutas', 'kg', 599, 250, 3, 3],
  ['Morango', '🍓', 'vermelho', 'frutas', 'caixa', 1000, 550, 3, 2, { scenario: 'acabou' }],
  ['Pipoca doce', '🍿', 'amarelo', 'mercearia', 'pacote', 500, 120, 8, 4],
  ['Amendoim torrado', '🥜', 'laranja', 'mercearia', 'pacote', 400, null, 6, 3],
  ['Isqueiro', '🔥', 'vermelho', 'utilidades', 'un', 500, 200, 5, 2],
  ['Carregador de celular', '🔌', 'cinza', 'utilidades', 'un', 2500, 1100, 2, 1, { scenario: 'acabou' }],
  ['Guarda-chuva', '☂️', 'roxo', 'utilidades', 'un', 2500, 1200, 2, 1],
];

// [chave, nome, observação, perfil, limite em centavos, opções]
// Perfis: `bom` paga perto do vencimento, `atrasa` paga atrasado, `devedor` quase não paga,
// `roteiro` só compra fiado pelo FIADO_SCRIPT.
const CUSTOMERS = [
  ['maria', 'Maria das Graças', 'Dona Maria da banca de revistas', 'roteiro', 20000],
  ['ze', 'José Raimundo', 'Zé do gás', 'roteiro', 5000, { blocked: true }],
  ['joao', 'João Batista', 'Seu João, taxista do ponto', 'roteiro', 15000],
  ['ana', 'Ana Paula Souza', '', 'roteiro', null],
  ['carlos', 'Carlos Henrique', 'Carlão, segurança da loja ao lado', 'roteiro', 10000],
  ['chica', 'Francisca Lima', 'Chica', 'atrasa', 10000],
  ['luciana', 'Luciana Ferreira', '', 'bom', null, { noPhone: true }],
  ['toninho', 'Antônio Carlos', 'Toninho', 'bom', null],
  ['patricia', 'Patrícia Gomes', '', 'atrasa', 8000],
  ['raimundo', 'Raimundo Nonato', 'Vigia da praça', 'bom', null],
  ['tiana', 'Sebastiana Rocha', 'Tiana, feirante', 'bom', 15000],
  ['marcos', 'Marcos Vinícius', '', 'devedor', 8000],
  ['rita', 'Rita de Cássia', 'Professora da escola', 'bom', null],
  ['edson', 'Edson Pereira', 'Motoboy', 'bom', null],
  ['juliana', 'Juliana Alves', '', 'bom', null],
];

/**
 * Compras fiado roteirizadas, para que hoje existam contas em todos os status:
 * atrasada (Maria e Zé), vence hoje (João), vence em breve (Ana), em dia (Carlos) e quitadas.
 * `amount: 'tudo'` paga o saldo inteiro do cliente naquele dia.
 */
const FIADO_SCRIPT = [
  {
    customer: 'maria',
    daysAgo: 70,
    term: 30,
    payments: [{ daysAgo: 41, amount: 'tudo', method: 'dinheiro' }],
  },
  {
    customer: 'maria',
    daysAgo: 27,
    term: 15,
    minTotal: 3000,
    payments: [{ daysAgo: 6, amount: 1000, method: 'pix' }],
  },
  {
    customer: 'ze',
    daysAgo: 64,
    term: 15,
    minTotal: 3000,
    payments: [{ daysAgo: 44, amount: 1500, method: 'dinheiro' }],
  },
  { customer: 'ze', daysAgo: 50, term: 15 },
  { customer: 'joao', daysAgo: 46, term: 15, payments: [{ daysAgo: 32, amount: 'tudo', method: 'pix' }] },
  { customer: 'joao', daysAgo: 15, term: 15 },
  { customer: 'ana', daysAgo: 33, term: 30, payments: [{ daysAgo: 6, amount: 'tudo', method: 'pix' }] },
  { customer: 'ana', daysAgo: 5, term: 7 },
  { customer: 'carlos', daysAgo: 3, term: 30 },
];

const PAYMENT_PLANS = [
  ['dinheiro', 38],
  ['pix', 34],
  ['debito', 9],
  ['credito', 6],
  ['fiado', 9],
  ['dinheiro+pix', 2],
  ['entrada+fiado', 2],
];

/** Vendas por dia da semana (domingo = 0): [mínimo, máximo]. */
const SALES_PER_WEEKDAY = [
  [3, 5],
  [3, 6],
  [3, 6],
  [3, 6],
  [3, 6],
  [4, 7],
  [5, 8],
];

const CANCEL_REASONS = ['registro_errado', 'cliente_desistiu', 'devolucao'];
const OPENING_MINUTE = 7 * 60;
const CLOSING_MINUTE = 19 * 60 + 30;

/**
 * Gera os dados de exemplo.
 * @param {{ now?: Date, seed?: number }} [options] `now` é a data e hora de referência ("hoje")
 */
export function createSeed({ now = new Date(), seed = DEMO_SEED } = {}) {
  const rng = createRandom(seed);
  const today = toISODate(now);
  const firstDay = addDays(today, -(HISTORY_DAYS - 1));
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const counters = {};
  const nextId = (prefix) => {
    counters[prefix] = (counters[prefix] ?? 0) + 1;
    return `${prefix}_${String(counters[prefix]).padStart(4, '0')}`;
  };
  /** Instante local de um dia, em minutos desde a meia-noite. */
  const at = (day, minute) => {
    const date = parseISODate(day);
    date.setMinutes(minute);
    return date.toISOString();
  };

  /* ---------- Cadastros ---------- */

  const products = new Map();
  const productMeta = new Map();
  for (const [name, emoji, color, category, unit, price, cost, min, popularity, options = {}] of PRODUCTS) {
    const id = nextId('prod');
    const trackStock = options.trackStock ?? true;
    products.set(id, {
      id,
      name,
      emoji,
      color,
      category,
      unit,
      priceCents: price,
      costCents: cost,
      quantity: 0,
      minQuantity: min,
      code: category === 'bebidas' ? `789${String(rng.int(1e9, 9999999999))}` : null,
      trackStock,
      active: true,
      createdAt: at(firstDay, 6 * 60),
      updatedAt: at(firstDay, 6 * 60),
    });
    productMeta.set(id, { popularity, scenario: options.scenario ?? null, activeUntil: options.activeUntil });
  }

  const customers = new Map();
  const customerIdByKey = new Map();
  const customerProfile = new Map();
  CUSTOMERS.forEach(([key, name, note, profile, limit, options = {}], index) => {
    const id = nextId('cli');
    customerIdByKey.set(key, id);
    customerProfile.set(id, profile);
    customers.set(id, {
      id,
      name,
      phone: options.noPhone
        ? null
        : `${rng.pick(['11', '21', '31', '71', '81', '85'])}9${rng.int(8000, 9999)}${rng.int(1000, 9999)}`,
      note,
      creditLimitCents: limit,
      fiadoBlocked: options.blocked ?? false,
      creditCents: 0,
      archived: false,
      createdAt: at(addDays(firstDay, Math.min(index, 20)), 9 * 60),
    });
  });
  const regularCustomerIds = [...customers.keys()].filter((id) => customerProfile.get(id) !== 'roteiro');

  /* ---------- Registros ---------- */

  const sales = [];
  let fiadoAccounts = [];
  const fiadoPayments = [];
  const stockMovements = [];
  const expenses = [];

  function move(productId, input) {
    const result = applyMovement(products.get(productId), { id: nextId('mov'), ...input });
    products.set(productId, result.product);
    stockMovements.push(result.movement);
  }

  function restockQuantity(product) {
    if (product.unit === 'duzia') return 6;
    if (product.unit === 'kg') return 10;
    if (product.unit === 'caixa') return 8;
    return Math.max(product.minQuantity * 3, product.unit === 'pacote' ? 12 : 24);
  }

  function sellableProducts(dayIndex, isToday) {
    return [...products.values()].filter((product) => {
      const meta = productMeta.get(product.id);
      if (meta.activeUntil !== undefined && dayIndex >= meta.activeUntil) return false;
      if (isToday && meta.scenario) return false;
      return !product.trackStock || product.quantity >= 1;
    });
  }

  function pickQuantity(product) {
    if (product.unit === 'kg') return roundQuantity(rng.int(10, 40) * 0.05);
    if (product.unit === 'duzia' || product.unit === 'caixa') return 1;
    return rng.weighted([
      [1, 70],
      [2, 22],
      [3, 8],
    ]);
  }

  function buildItems(dayIndex, isToday, minTotal = 0) {
    const items = [];
    const lines = rng.weighted([
      [1, 45],
      [2, 33],
      [3, 15],
      [4, 7],
    ]);
    while (items.length < lines || sumCents(items.map((item) => item.totalCents)) < minTotal) {
      const available = sellableProducts(dayIndex, isToday).filter(
        (product) => !items.some((item) => item.productId === product.id),
      );
      if (available.length === 0) break;
      const product = rng.weighted(available.map((p) => [p, productMeta.get(p.id).popularity]));
      let quantity = pickQuantity(product);
      if (product.trackStock) quantity = Math.min(quantity, product.quantity);
      items.push({
        id: nextId('item'),
        productId: product.id,
        name: product.name,
        emoji: product.emoji,
        unit: product.unit,
        quantity,
        unitPriceCents: product.priceCents,
        unitCostCents: product.costCents,
        totalCents: lineTotal({ unitPriceCents: product.priceCents, quantity }),
      });
    }
    if (rng.chance(0.05) || items.length === 0) {
      const price = rng.int(4, 30) * 50;
      items.push({
        id: nextId('item'),
        productId: null,
        name: rng.pick(['Valor avulso', 'Encomenda de salgados', 'Saco de gelo']),
        emoji: null,
        unit: 'un',
        quantity: 1,
        unitPriceCents: price,
        unitCostCents: null,
        totalCents: price,
      });
    }
    return items;
  }

  function fiadoTerm() {
    return rng.weighted([
      [7, 2],
      [15, 3],
      [30, 5],
    ]);
  }

  /** Parcelas sem troco e taxa (ver `finalizePayments`). */
  function buildPayments(plan, totalCents, day, term) {
    const half = Math.round(totalCents / 2 / 500) * 500;
    switch (plan) {
      case 'dinheiro': {
        const options = suggestCashAmounts(totalCents);
        const receivedCents = rng.chance(0.35) ? totalCents : rng.pick(options);
        return [{ method: 'dinheiro', amountCents: totalCents, receivedCents }];
      }
      case 'credito':
        return [
          { method: 'credito', amountCents: totalCents, installments: rng.chance(0.75) ? 1 : rng.int(2, 6) },
        ];
      case 'fiado':
        return [{ method: 'fiado', amountCents: totalCents, dueDate: addDays(day, term) }];
      case 'dinheiro+pix':
        return [
          { method: 'dinheiro', amountCents: half, receivedCents: half },
          { method: 'pix', amountCents: totalCents - half },
        ];
      case 'entrada+fiado':
        return [
          { method: 'dinheiro', amountCents: half, receivedCents: half },
          { method: 'fiado', amountCents: totalCents - half, dueDate: addDays(day, term) },
        ];
      default:
        return [{ method: plan, amountCents: totalCents }];
    }
  }

  function createSale({ day, minute, dayIndex, isToday, plan, customerId = null, term, minTotal }) {
    const items = buildItems(dayIndex, isToday, minTotal);
    let discount = null;
    if (rng.chance(0.07)) {
      discount = rng.chance(0.5) ? { type: 'percentual', value: 10 } : { type: 'valor', value: 100 };
    }
    const totals = calcSaleTotals(items, discount);
    if (totals.totalCents === 0) discount = null;

    let paymentPlan = plan;
    const needsSplit = paymentPlan === 'dinheiro+pix' || paymentPlan === 'entrada+fiado';
    if (needsSplit && totals.subtotalCents < 1000) paymentPlan = 'pix';
    let saleCustomerId = customerId;
    if (paymentPlan.includes('fiado') && !saleCustomerId) saleCustomerId = rng.pick(regularCustomerIds);
    else if (!paymentPlan.includes('fiado') && !customerId && rng.chance(0.08)) {
      saleCustomerId = rng.pick(regularCustomerIds);
    }

    const { subtotalCents, discountCents, totalCents } = calcSaleTotals(items, discount);
    const { payments, changeCents } = finalizePayments(
      buildPayments(paymentPlan, totalCents, day, term ?? fiadoTerm()),
      DEMO_SETTINGS.fees,
    );
    const createdAt = at(day, minute);
    const sale = {
      id: nextId('venda'),
      number: 0,
      createdAt,
      items,
      subtotalCents,
      discount,
      discountCents,
      totalCents,
      payments,
      changeCents,
      customerId: saleCustomerId,
      note: '',
      status: 'concluida',
      cancellation: null,
    };
    sales.push(sale);

    for (const item of items) {
      if (item.productId && products.get(item.productId).trackStock) {
        move(item.productId, { type: 'venda', quantity: item.quantity, saleId: sale.id, createdAt });
      }
    }
    for (const payment of payments) {
      if (payment.method !== 'fiado') continue;
      fiadoAccounts.push({
        id: nextId('fiado'),
        customerId: saleCustomerId,
        saleId: sale.id,
        originalCents: payment.amountCents,
        paidCents: 0,
        createdAt,
        dueDate: payment.dueDate,
        cancelledAt: null,
      });
    }

    // Algumas vendas antigas foram canceladas logo depois (nunca as de fiado).
    if (!isToday && !paymentPlan.includes('fiado') && rng.chance(0.015)) {
      const cancelledAt = at(day, minute + 1);
      sale.status = 'cancelada';
      sale.cancellation = { reason: rng.pick(CANCEL_REASONS), note: '', at: cancelledAt };
      for (const item of items) {
        if (item.productId && products.get(item.productId).trackStock) {
          move(item.productId, {
            type: 'estorno',
            quantity: item.quantity,
            saleId: sale.id,
            createdAt: cancelledAt,
          });
        }
      }
    }
  }

  function customerOpenCents(customerId) {
    return sumCents(
      openAccounts(fiadoAccounts.filter((a) => a.customerId === customerId)).map(accountBalance),
    );
  }

  function receive(customerId, amountCents, method, createdAt) {
    if (!(amountCents > 0)) return;
    const customer = customers.get(customerId);
    const own = fiadoAccounts.filter((account) => account.customerId === customerId);
    const result = receiveFiado(own, customer, amountCents);
    fiadoAccounts = applyAllocations(fiadoAccounts, result.allocations);
    customers.set(customerId, { ...customer, creditCents: result.creditCents });
    fiadoPayments.push({
      id: nextId('receb'),
      customerId,
      amountCents,
      method,
      allocations: result.allocations,
      creditUsedCents: result.creditUsedCents,
      creditAddedCents: result.creditAddedCents,
      createdAt,
    });
  }

  /** Quanto um cliente regular paga hoje, conforme o perfil (0 = não paga). */
  function regularPaymentAmount(customerId, day) {
    const balance = customerOpenCents(customerId) - customers.get(customerId).creditCents;
    if (balance <= 0) return 0;
    const open = openAccounts(fiadoAccounts.filter((a) => a.customerId === customerId));
    const daysToDue = diffInDays(day, open.map((a) => a.dueDate).sort()[0]);
    const roundTo100 = (value) => Math.max(500, Math.round(value / 100) * 100);
    switch (customerProfile.get(customerId)) {
      case 'bom':
        if (!rng.chance(daysToDue <= 2 ? 0.45 : 0.04)) return 0;
        return rng.chance(0.25) ? Math.ceil((balance + 1) / 500) * 500 : balance;
      case 'atrasa':
        if (!rng.chance(daysToDue < -3 ? 0.12 : 0.02)) return 0;
        return rng.chance(0.55) ? balance : Math.min(balance, roundTo100(balance / 2));
      case 'devedor':
        if (!rng.chance(daysToDue < -10 ? 0.04 : 0)) return 0;
        return Math.min(balance, roundTo100(balance * 0.3));
      default:
        return 0;
    }
  }

  function addExpense(day, minute, description, category, amountCents, method) {
    expenses.push({
      id: nextId('desp'),
      description,
      category,
      amountCents,
      method,
      createdAt: at(day, minute),
    });
  }

  /* ---------- Simulação dia a dia ---------- */

  for (const product of products.values()) {
    if (product.trackStock) {
      move(product.id, {
        type: 'entrada',
        quantity: restockQuantity(product),
        unitCostCents: product.costCents,
        createdAt: at(firstDay, 6 * 60),
      });
    }
  }

  for (let dayIndex = 0; dayIndex < HISTORY_DAYS; dayIndex += 1) {
    const day = addDays(firstDay, dayIndex);
    const isToday = day === today;
    const daysAgo = HISTORY_DAYS - 1 - dayIndex;
    // Hoje, os registros ficam entre as 6h (ou 8 horas atrás) e agora.
    const windowStart = isToday ? Math.max(6 * 60, nowMinute - 8 * 60) : OPENING_MINUTE;
    const windowEnd = isToday ? nowMinute - 2 : CLOSING_MINUTE;
    const hasWindow = windowEnd - windowStart >= 30;
    const randomMinute = () => rng.int(windowStart, windowEnd);

    // Reposição de manhã cedo (exceto produtos do cenário nos últimos 14 dias).
    if (!isToday || nowMinute > 6 * 60 + 30) {
      for (const product of products.values()) {
        const meta = productMeta.get(product.id);
        const stopped =
          (meta.scenario && daysAgo < 14) || (meta.activeUntil !== undefined && dayIndex >= meta.activeUntil);
        if (product.trackStock && !stopped && product.quantity <= product.minQuantity) {
          move(product.id, {
            type: 'entrada',
            quantity: restockQuantity(product),
            unitCostCents: product.costCents,
            createdAt: at(day, 6 * 60 + 30),
          });
        }
      }
    }

    /** @type {{ minute: number, run: () => void }[]} */
    const events = [];
    if (hasWindow) {
      const [min, max] = SALES_PER_WEEKDAY[parseISODate(day).getDay()];
      const count = isToday
        ? Math.round((rng.int(min, max) * (windowEnd - windowStart)) / (8 * 60))
        : rng.int(min, max);
      for (let i = 0; i < count; i += 1) {
        const minute = randomMinute();
        const plan = rng.weighted(PAYMENT_PLANS);
        events.push({ minute, run: () => createSale({ day, minute, dayIndex, isToday, plan }) });
      }
      for (const customerId of regularCustomerIds) {
        const minute = randomMinute();
        events.push({
          minute,
          run: () => {
            const amount = regularPaymentAmount(customerId, day);
            receive(customerId, amount, rng.chance(0.6) ? 'dinheiro' : 'pix', at(day, minute));
          },
        });
      }
    }
    for (const script of FIADO_SCRIPT) {
      const customerId = customerIdByKey.get(script.customer);
      if (script.daysAgo === daysAgo) {
        const minute = rng.int(OPENING_MINUTE, CLOSING_MINUTE);
        events.push({
          minute,
          run: () =>
            createSale({
              day,
              minute,
              dayIndex,
              isToday,
              plan: 'fiado',
              customerId,
              term: script.term,
              minTotal: script.minTotal ?? 1500,
            }),
        });
      }
      for (const payment of script.payments ?? []) {
        if (payment.daysAgo !== daysAgo) continue;
        const minute = rng.int(OPENING_MINUTE, CLOSING_MINUTE);
        events.push({
          minute,
          run: () => {
            const balance = customerOpenCents(customerId) - customers.get(customerId).creditCents;
            const amount = payment.amount === 'tudo' ? balance : payment.amount;
            receive(customerId, amount, payment.method, at(day, minute));
          },
        });
      }
    }
    events.sort((a, b) => a.minute - b.minute).forEach((event) => event.run());

    // Despesas do dia.
    if (hasWindow) {
      if (rng.chance(0.5))
        addExpense(day, randomMinute(), 'Saco de gelo', 'mercadoria', rng.int(12, 20) * 50, 'dinheiro');
      if (rng.chance(0.25))
        addExpense(day, randomMinute(), 'Gasolina', 'transporte', rng.int(4, 8) * 500, 'dinheiro');
      if (rng.chance(0.35))
        addExpense(day, randomMinute(), 'Almoço', 'alimentacao', rng.int(15, 25) * 100, 'dinheiro');
      const dayOfMonth = parseISODate(day).getDate();
      if (dayOfMonth === 5) addExpense(day, randomMinute(), 'Aluguel do ponto', 'ponto', 15000, 'outro');
      if (dayOfMonth === 10) addExpense(day, randomMinute(), 'Taxa da prefeitura', 'taxas', 3500, 'outro');
      if (dayIndex % 7 === 3)
        addExpense(day, randomMinute(), 'Sacolas e guardanapos', 'outros', 1200, 'dinheiro');
    }

    // Perdas ocasionais.
    if (!isToday && rng.chance(0.06)) {
      const candidates = [...products.values()].filter((p) => p.trackStock && p.quantity >= 2);
      if (candidates.length > 0) {
        move(rng.pick(candidates).id, {
          type: 'perda',
          quantity: 1,
          reason: rng.pick(['vencido', 'quebrado']),
          createdAt: at(day, 19 * 60),
        });
      }
    }

    // Contagem de ontem à noite: fixa a situação dos produtos do cenário.
    if (daysAgo === 1) {
      for (const product of products.values()) {
        const { scenario } = productMeta.get(product.id);
        if (scenario === 'acabou' && product.quantity !== 0) {
          move(product.id, {
            type: 'ajuste',
            quantity: 0,
            note: 'Contagem do fim do dia',
            createdAt: at(day, 20 * 60),
          });
        }
        if (scenario === 'acabando') {
          const target = Math.max(1, Math.floor(product.minQuantity / 2));
          if (product.quantity > product.minQuantity || product.quantity <= 0) {
            move(product.id, {
              type: 'ajuste',
              quantity: target,
              note: 'Contagem do fim do dia',
              createdAt: at(day, 20 * 60),
            });
          }
        }
      }
    }
  }

  for (const [id, meta] of productMeta) {
    if (meta.activeUntil !== undefined) products.set(id, { ...products.get(id), active: false });
  }

  /* ---------- Numeração e caixa ---------- */

  sales.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  sales.forEach((sale, index) => {
    sale.number = index + 1;
  });

  const cashDays = [];
  for (let dayIndex = 0; dayIndex < HISTORY_DAYS; dayIndex += 1) {
    const day = addDays(firstDay, dayIndex);
    const daySales = sales.filter((sale) => dateOf(sale.createdAt) === day);
    if (daySales.length === 0) continue;
    const firstSaleAt = new Date(daySales[0].createdAt);
    const openedAt = new Date(firstSaleAt.getTime() - 10 * 60_000).toISOString();
    const cashDay = {
      date: day,
      openingCents: DEMO_SETTINGS.defaultOpeningCents,
      openedAt,
      closedAt: null,
      countedCents: null,
      expectedCents: null,
      note: '',
    };
    if (day !== today) {
      const { expectedCashCents } = summarizeCashDay({ date: day, sales, fiadoPayments, expenses, cashDay });
      const difference = rng.chance(0.85) ? 0 : rng.pick([-500, -200, -100, 50, 100, 300]);
      Object.assign(cashDay, {
        closedAt: at(day, CLOSING_MINUTE + 15),
        countedCents: expectedCashCents + difference,
        expectedCents: expectedCashCents,
        note: difference < 0 ? 'Acho que errei um troco.' : '',
      });
    }
    cashDays.push(cashDay);
  }

  const byCreatedAt = (a, b) => a.createdAt.localeCompare(b.createdAt);

  return {
    user: { ...DEMO_USER },
    business: {
      id: 'neg_0001',
      name: 'Barraca da Rosa',
      ownerName: DEMO_USER.name,
      phone: '11987654321',
      sells: ['bebidas', 'salgados', 'lanches', 'doces'],
      onboarded: true,
      createdAt: at(firstDay, 6 * 60),
    },
    settings: structuredClone(DEMO_SETTINGS),
    products: [...products.values()],
    customers: [...customers.values()],
    sales,
    fiadoAccounts,
    fiadoPayments: fiadoPayments.sort(byCreatedAt),
    stockMovements,
    expenses: expenses.sort(byCreatedAt),
    cashDays,
    nextSaleNumber: sales.length + 1,
  };
}

/**
 * Negócio novo, sem histórico ("começar do zero" nas boas-vindas).
 * @param {{ now?: Date, user?: import('@/domain/models.js').User }} [options]
 */
export function createEmptyData({ now = new Date(), user = DEMO_USER } = {}) {
  return {
    user: { ...user },
    business: {
      id: 'neg_0001',
      name: '',
      ownerName: user.name,
      phone: null,
      sells: [],
      onboarded: false,
      createdAt: now.toISOString(),
    },
    settings: structuredClone(DEFAULT_SETTINGS),
    products: [],
    customers: [],
    sales: [],
    fiadoAccounts: [],
    fiadoPayments: [],
    stockMovements: [],
    expenses: [],
    cashDays: [],
    nextSaleNumber: 1,
  };
}
