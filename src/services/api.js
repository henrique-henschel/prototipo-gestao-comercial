import { db } from '@/mocks/db.js';

/**
 * Infraestrutura comum dos serviços: simula a rede (latência e falhas) sobre o banco
 * em memória. Quando a API real existir, `request` vira um `fetch` e os handlers
 * viram endpoints; as assinaturas dos serviços continuam as mesmas.
 */

const IS_TEST = import.meta.env.MODE === 'test';

/** Latência normal e no modo "simular lentidão", em ms [mínimo, máximo]. */
export const NORMAL_LATENCY = IS_TEST ? [0, 0] : [150, 400];
export const SLOW_LATENCY = [1500, 3000];

/**
 * @typedef {object} ApiConfig
 * @property {[number, number]} latency faixa de latência normal
 * @property {boolean} slow "simular lentidão" (Ajustes > Modo demonstração)
 * @property {boolean} failing "simular erro": toda chamada falha como se a internet tivesse caído
 */

/** @type {ApiConfig} */
const config = { latency: NORMAL_LATENCY, slow: false, failing: false };

/** @param {Partial<ApiConfig>} changes */
export function configureApi(changes) {
  Object.assign(config, changes);
}

/** @returns {ApiConfig} */
export function getApiConfig() {
  return { ...config };
}

/** Mensagens em linguagem simples para cada código de erro de regra. */
export const ERROR_MESSAGES = {
  rede: 'Não foi possível conectar. Confira a internet e tente de novo.',
  nao_encontrado: 'Não encontramos esse registro. Ele pode ter sido apagado.',
  // Vendas e pagamentos
  sem_itens: 'Adicione pelo menos um produto ou valor.',
  total_zero: 'O total ficou zerado. Confirme se é um brinde.',
  cliente_obrigatorio: 'Para vender fiado, escolha quem está comprando.',
  produto_inativo: 'Um dos produtos não está mais à venda.',
  sem_pagamento: 'Escolha como o cliente vai pagar.',
  forma_inativa: 'Essa forma de pagamento está desligada nos Ajustes.',
  valor_invalido: 'Confira os valores: nenhum pode ficar zerado.',
  soma_diferente: 'A soma dos pagamentos tem que ser igual ao total.',
  dinheiro_insuficiente: 'O dinheiro recebido não cobre o valor.',
  troco_fora_do_dinheiro: 'Só o pagamento em dinheiro tem troco.',
  sem_estoque: 'Tem produto sem estoque suficiente. A venda sem estoque está bloqueada nos Ajustes.',
  prazo_desfazer: 'Já passou o tempo de desfazer. Use "Cancelar venda" no histórico.',
  ja_cancelada: 'Essa venda já foi cancelada.',
  motivo_obrigatorio: 'Escolha o motivo.',
  // Fiado e clientes
  cliente_arquivado: 'Esse cliente está arquivado.',
  fiado_nao_permitido: 'Fiado não pode ser pago com fiado. Escolha outra forma.',
  desfazer_recebimento: 'Só dá para desfazer o último recebimento desse cliente.',
  prazo_desfazer_recebimento: 'Só dá para desfazer um recebimento no mesmo dia em que ele foi feito.',
  nome_obrigatorio: 'Digite o nome.',
  whatsapp_invalido: 'Confira o WhatsApp: DDD e número, como (11) 98765-4321.',
  limite_invalido: 'Confira o limite do fiado.',
  cliente_devendo: 'Esse cliente ainda deve. Você pode arquivar, mas não apagar.',
  cliente_com_credito: 'Esse cliente tem crédito com você. Você pode arquivar, mas não apagar.',
  // Estoque
  preco_invalido: 'Confira o preço de venda.',
  custo_invalido: 'Confira o custo.',
  unidade_invalida: 'Escolha a unidade.',
  categoria_invalida: 'Escolha a categoria.',
  quantidade_invalida: 'Confira a quantidade.',
  movimento_invalido: 'Esse tipo de movimento não pode ser feito à mão.',
  sem_controle_estoque: 'Esse produto não tem controle de estoque.',
  prazo_desfazer_movimento: 'Já passou o tempo de desfazer. Se precisar, faça uma contagem do estoque.',
  // Caixa
  forma_invalida: 'Escolha como a despesa foi paga.',
  caixa_ja_aberto: 'O caixa desse dia já está aberto.',
  caixa_fechado: 'O caixa desse dia já foi fechado.',
  caixa_nao_fechado: 'O caixa desse dia ainda está aberto.',
  caixa_inexistente: 'O caixa desse dia ainda não foi aberto.',
  // Acesso
  login_incompleto: 'Digite seu e-mail e sua senha.',
};

/**
 * Erro devolvido pelos serviços. `message` já está pronta para mostrar na tela.
 */
export class ApiError extends Error {
  /**
   * @param {string} code código principal (chave de ERROR_MESSAGES)
   * @param {{ codes?: string[], details?: unknown }} [extra] todos os códigos e dados adicionais
   */
  constructor(code, { codes = [code], details } = {}) {
    super(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.rede);
    this.name = 'ApiError';
    this.code = code;
    this.codes = codes;
    this.details = details;
  }
}

/**
 * Lança um ApiError de validação se houver códigos de erro.
 * @param {string[]} codes resultado de uma função `validate*` de domain/rules
 * @param {unknown} [details]
 */
export function assertValid(codes, details) {
  if (codes.length > 0) throw new ApiError(codes[0], { codes, details });
}

/**
 * Busca um registro pelo id ou lança `nao_encontrado`.
 * @template {{ id: string }} T
 * @param {T[]} list
 * @param {string} id
 * @returns {T}
 */
export function findOrFail(list, id) {
  const found = list.find((item) => item.id === id);
  if (!found) throw new ApiError('nao_encontrado');
  return found;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executa um handler sobre o banco como se fosse uma chamada de rede.
 * O handler é síncrono: ele valida tudo antes de alterar o banco, então uma falha
 * nunca deixa dados pela metade. O resultado é copiado para que a interface nunca
 * compartilhe objetos com o banco.
 * @template T
 * @param {(database: import('@/mocks/db.js').Database) => T} handler
 * @returns {Promise<T>}
 */
export async function request(handler) {
  const [min, max] = config.slow ? SLOW_LATENCY : config.latency;
  const delay = min + Math.random() * (max - min);
  if (delay > 0) await wait(delay);
  if (config.failing) throw new ApiError('rede');
  return structuredClone(handler(db));
}

/** Data e hora atual em ISO (ponto único, para facilitar os testes). */
export function nowISO() {
  return new Date().toISOString();
}
