/**
 * Constantes do domínio: os valores possíveis de cada campo enumerado.
 * As chaves (em pt-BR, sem acento) são o contrato com o back-end e com
 * `components/ui/StatusPill/statusPresets.js`; os rótulos são os textos da interface.
 */

/* ---------- Pagamentos ---------- */

/** Ordem fixa de exibição das formas de pagamento. */
export const PAYMENT_METHOD_KEYS = /** @type {const} */ (['dinheiro', 'pix', 'debito', 'credito', 'fiado']);

/**
 * Formas de pagamento. `chartSlot` é a cor fixa da forma nos gráficos (`--chart-n`):
 * a mesma forma tem sempre a mesma cor, em qualquer gráfico ou filtro.
 */
export const PAYMENT_METHODS = {
  dinheiro: { label: 'Dinheiro', chartSlot: 3 },
  pix: { label: 'Pix', chartSlot: 1 },
  debito: { label: 'Cartão de débito', shortLabel: 'Débito', chartSlot: 7 },
  credito: { label: 'Cartão de crédito', shortLabel: 'Crédito', chartSlot: 2 },
  fiado: { label: 'Fiado', chartSlot: 4 },
};

/** Cédulas oferecidas como atalho ao receber em dinheiro, em centavos. */
export const CASH_BILLS = [200, 500, 1000, 2000, 5000, 10000];

/** Parcelamento no crédito (só informativo, para relatório e taxa). */
export const MAX_INSTALLMENTS = 12;

/* ---------- Vendas ---------- */

export const SALE_STATUS = /** @type {const} */ ({ CONCLUIDA: 'concluida', CANCELADA: 'cancelada' });

/** Tempo em que o "Desfazer" fica disponível depois de concluir uma venda. */
export const UNDO_WINDOW_MS = 5000;

export const DISCOUNT_TYPES = /** @type {const} */ ({ VALOR: 'valor', PERCENTUAL: 'percentual' });

export const CANCEL_REASONS = [
  { value: 'registro_errado', label: 'Registrei errado' },
  { value: 'cliente_desistiu', label: 'O cliente desistiu' },
  { value: 'devolucao', label: 'O cliente devolveu a mercadoria' },
  { value: 'pagamento_nao_caiu', label: 'O pagamento não caiu' },
  { value: 'outro', label: 'Outro motivo' },
];

/* ---------- Fiado ---------- */

export const FIADO_STATUS = /** @type {const} */ ({
  QUITADO: 'quitado',
  EM_DIA: 'em_dia',
  VENCE_EM_BREVE: 'vence_em_breve',
  VENCE_HOJE: 'vence_hoje',
  ATRASADO: 'atrasado',
});

/** Gravidade de cada status (maior = mais urgente), para ordenar e achar o pior. */
export const FIADO_STATUS_SEVERITY = {
  quitado: 0,
  em_dia: 1,
  vence_em_breve: 2,
  vence_hoje: 3,
  atrasado: 4,
};

/** "Vence em breve" = vence em 1 a 3 dias. */
export const FIADO_SOON_DAYS = 3;

/** Atalhos de vencimento, em dias a partir de hoje. */
export const FIADO_DUE_SHORTCUTS = [7, 15, 30];

/* ---------- Estoque ---------- */

export const STOCK_STATUS = /** @type {const} */ ({ OK: 'ok', ACABANDO: 'acabando', ACABOU: 'acabou' });

/**
 * Unidades de venda. `decimal` indica se a quantidade aceita frações (até 3 casas);
 * `step` é o passo do botão +/−.
 */
export const UNITS = {
  un: { label: 'Unidade', short: 'un', decimal: false, step: 1 },
  kg: { label: 'Quilo', short: 'kg', decimal: true, step: 0.1 },
  g: { label: 'Grama', short: 'g', decimal: false, step: 50 },
  l: { label: 'Litro', short: 'L', decimal: true, step: 0.5 },
  pacote: { label: 'Pacote', short: 'pct', decimal: false, step: 1 },
  caixa: { label: 'Caixa', short: 'cx', decimal: false, step: 1 },
  duzia: { label: 'Dúzia', short: 'dz', decimal: false, step: 1 },
};

export const STOCK_MOVEMENT_TYPES = {
  entrada: { label: 'Entrada de mercadoria', direction: 1 },
  venda: { label: 'Venda', direction: -1 },
  estorno: { label: 'Devolução ao estoque', direction: 1 },
  ajuste: { label: 'Contagem (ajuste)', direction: 0 },
  perda: { label: 'Perda', direction: -1 },
};

export const LOSS_REASONS = [
  { value: 'vencido', label: 'Venceu' },
  { value: 'quebrado', label: 'Quebrou ou estragou' },
  { value: 'outro', label: 'Outro motivo' },
];

export const PRODUCT_CATEGORIES = [
  { value: 'bebidas', label: 'Bebidas', emoji: '🥤' },
  { value: 'lanches', label: 'Lanches', emoji: '🥪' },
  { value: 'salgados', label: 'Salgados', emoji: '🥟' },
  { value: 'doces', label: 'Doces', emoji: '🍬' },
  { value: 'frutas', label: 'Frutas e verduras', emoji: '🍎' },
  { value: 'mercearia', label: 'Mercearia', emoji: '🛒' },
  { value: 'utilidades', label: 'Utilidades', emoji: '🧴' },
  { value: 'outros', label: 'Outros', emoji: '📦' },
];

/** Cores de card de produto. A tradução para CSS fica na interface. */
export const PRODUCT_COLORS = [
  { value: 'verde', label: 'Verde' },
  { value: 'azul', label: 'Azul' },
  { value: 'amarelo', label: 'Amarelo' },
  { value: 'laranja', label: 'Laranja' },
  { value: 'vermelho', label: 'Vermelho' },
  { value: 'rosa', label: 'Rosa' },
  { value: 'roxo', label: 'Roxo' },
  { value: 'cinza', label: 'Cinza' },
];

/* ---------- Caixa e despesas ---------- */

export const EXPENSE_CATEGORIES = [
  { value: 'mercadoria', label: 'Mercadoria', emoji: '📦' },
  { value: 'transporte', label: 'Transporte e gasolina', emoji: '⛽' },
  { value: 'alimentacao', label: 'Alimentação', emoji: '🍽️' },
  { value: 'ponto', label: 'Ponto e aluguel', emoji: '🏠' },
  { value: 'taxas', label: 'Taxas', emoji: '🧾' },
  { value: 'outros', label: 'Outros', emoji: '💸' },
];

/** Só despesas pagas com o dinheiro da gaveta mexem no dinheiro esperado. */
export const EXPENSE_METHODS = [
  { value: 'dinheiro', label: 'Dinheiro da gaveta' },
  { value: 'outro', label: 'Outra forma (Pix, cartão...)' },
];

/* ---------- Relatórios ---------- */

export const PERIOD_PRESETS = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'ontem', label: 'Ontem' },
  { value: '7dias', label: 'Últimos 7 dias' },
  { value: 'este_mes', label: 'Este mês' },
  { value: 'mes_passado', label: 'Mês passado' },
  { value: 'personalizado', label: 'Escolher datas' },
];

export const REPORT_TYPES = [
  { value: 'resumo', label: 'Resumo geral' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'formas', label: 'Formas de pagamento' },
  { value: 'produtos', label: 'Produtos mais vendidos' },
  { value: 'fiado', label: 'Fiado e devedores' },
  { value: 'estoque', label: 'Estoque' },
  { value: 'caixa', label: 'Caixa e despesas' },
];

/* ---------- Ajustes ---------- */

/**
 * Valores padrão dos ajustes que alteram regras (tabela 9 de docs/regras-de-negocio.md).
 * @type {import('./models.js').Settings}
 */
export const DEFAULT_SETTINGS = {
  paymentMethods: { dinheiro: true, pix: true, debito: true, credito: true, fiado: true },
  fees: { debito: 0, creditoAVista: 0, creditoParcelado: 0 },
  pixKey: '',
  fiadoDefaultDays: 30,
  blockSaleWithoutStock: false,
  defaultOpeningCents: 0,
};
