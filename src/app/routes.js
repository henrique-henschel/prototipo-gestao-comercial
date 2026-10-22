/**
 * Caminhos das telas (em pt-BR, como aparecem na barra de endereço).
 * Use sempre estas constantes em vez de escrever o caminho à mão.
 */
export const ROUTES = {
  login: '/entrar',
  signup: '/cadastro',
  onboarding: '/boas-vindas',
  home: '/inicio',
  sell: '/vender',
  sales: '/vendas',
  /** @param {string} id */
  sale: (id) => `/vendas/${id}`,
  fiado: '/fiado',
  /** @param {string} customerId */
  fiadoCustomer: (customerId) => `/fiado/${customerId}`,
  customers: '/clientes',
  inventory: '/estoque',
  newProduct: '/estoque/novo',
  /** @param {string} id */
  product: (id) => `/estoque/${id}`,
  cash: '/caixa',
  reports: '/relatorios',
  settings: '/ajustes',
  help: '/ajuda',
  more: '/mais',
  designSystem: '/design-system',
};

/** Parâmetro de busca com a tela a abrir depois de entrar ("/entrar?voltar=/fiado"). */
export const RETURN_PARAM = 'voltar';

/**
 * Destino seguro depois do login: só caminhos internos ("/fiado"), nunca outro site
 * ("//exemplo.com", "https://...").
 * @param {string|null} value
 * @param {string} [fallback]
 */
export function safeReturnPath(value, fallback = ROUTES.home) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}
