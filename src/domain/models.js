/**
 * Contratos de dados do domínio (JSDoc). São o acordo com o back-end futuro:
 * a API deve devolver objetos com estes formatos, e os serviços em
 * `src/services/` já os devolvem assim. Regras em docs/regras-de-negocio.md.
 *
 * Convenções:
 * - dinheiro em centavos inteiros (`*Cents`);
 * - data e hora em ISO 8601 completo (`createdAt`); dia civil em `AAAA-MM-DD` (`date`, `dueDate`);
 * - ids são strings geradas por `lib/id.js` (no back-end real, pelo servidor);
 * - status de fiado e de estoque são **calculados** por `domain/rules` e nunca armazenados.
 *
 * Este arquivo só declara tipos; importe-os com `import('@/domain/models.js').Sale`.
 */

/**
 * @typedef {import('./rules/money.js').Cents} Cents
 * @typedef {'dinheiro'|'pix'|'debito'|'credito'|'fiado'} PaymentMethod
 * @typedef {'quitado'|'em_dia'|'vence_em_breve'|'vence_hoje'|'atrasado'} FiadoStatus
 * @typedef {'ok'|'acabando'|'acabou'} StockStatus
 * @typedef {'concluida'|'cancelada'} SaleStatus
 * @typedef {'un'|'kg'|'g'|'l'|'pacote'|'caixa'|'duzia'} Unit
 * @typedef {'entrada'|'venda'|'estorno'|'ajuste'|'perda'} StockMovementType
 */

/**
 * Pessoa que usa o sistema (login simulado).
 * @typedef {object} User
 * @property {string} id
 * @property {string} name
 * @property {string} email
 */

/**
 * Negócio (Negocio).
 * @typedef {object} Business
 * @property {string} id
 * @property {string} name ex.: "Barraca da Rosa"
 * @property {string} ownerName
 * @property {string|null} phone só dígitos, com DDD
 * @property {string[]} sells categorias de produto que o negócio vende (onboarding)
 * @property {boolean} onboarded concluiu as boas-vindas
 * @property {string} createdAt
 */

/**
 * Ajustes que alteram regras (Ajustes). Taxas em percentual (ex.: 1.99 = 1,99%).
 * @typedef {object} Settings
 * @property {Record<PaymentMethod, boolean>} paymentMethods formas ativas
 * @property {{ debito: number, creditoAVista: number, creditoParcelado: number }} fees taxas da maquininha
 * @property {string} pixKey
 * @property {number} fiadoDefaultDays vencimento padrão do fiado, em dias
 * @property {boolean} blockSaleWithoutStock
 * @property {Cents} defaultOpeningCents troco inicial padrão do caixa
 */

/**
 * Produto do estoque (Produto).
 * @typedef {object} Product
 * @property {string} id
 * @property {string} name
 * @property {string} emoji
 * @property {string} color uma das chaves de `PRODUCT_COLORS`
 * @property {string} category uma das chaves de `PRODUCT_CATEGORIES`
 * @property {Unit} unit
 * @property {Cents} priceCents preço de venda por unidade
 * @property {Cents|null} costCents custo por unidade (opcional)
 * @property {number} quantity quantidade atual (até 3 casas; pode ser negativa, regra 5.5)
 * @property {number} minQuantity estoque mínimo ("acabando" quando quantity ≤ minQuantity)
 * @property {string|null} code código de barras ou interno
 * @property {boolean} trackStock controlar estoque
 * @property {boolean} active inativos não aparecem para vender
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * Item de venda (ItemVenda). Nome, preço e custo são copiados do produto no momento da venda.
 * Item avulso: `productId` nulo, sem custo e sem baixa de estoque.
 * @typedef {object} SaleItem
 * @property {string} id
 * @property {string|null} productId
 * @property {string} name
 * @property {string|null} emoji
 * @property {Unit} unit
 * @property {number} quantity
 * @property {Cents} unitPriceCents
 * @property {Cents|null} unitCostCents
 * @property {Cents} totalCents preço × quantidade, arredondado ao centavo
 */

/**
 * Parcela de pagamento (Pagamento).
 * @typedef {object} Payment
 * @property {PaymentMethod} method
 * @property {Cents} amountCents valor que esta parcela abate do total
 * @property {Cents} [receivedCents] dinheiro: quanto o cliente entregou
 * @property {Cents} [changeCents] dinheiro: troco devolvido
 * @property {number} [installments] crédito: 1 (à vista) a 12
 * @property {Cents} feeCents taxa da maquininha (custo; não altera o valor cobrado)
 * @property {string} [dueDate] fiado: vencimento `AAAA-MM-DD`
 */

/**
 * Desconto informado pelo vendedor.
 * @typedef {object} Discount
 * @property {'valor'|'percentual'} type
 * @property {number} value centavos (valor) ou 0–100 (percentual)
 */

/**
 * Venda (Venda).
 * @typedef {object} Sale
 * @property {string} id
 * @property {number} number número sequencial amigável ("Venda nº 412")
 * @property {string} createdAt
 * @property {SaleItem[]} items
 * @property {Cents} subtotalCents
 * @property {Discount|null} discount
 * @property {Cents} discountCents
 * @property {Cents} totalCents
 * @property {Payment[]} payments
 * @property {Cents} changeCents troco total (só dinheiro gera troco)
 * @property {string|null} customerId obrigatório quando há fiado
 * @property {string} note
 * @property {SaleStatus} status
 * @property {{ reason: string, note: string, at: string } | null} cancellation
 */

/**
 * Cliente (Cliente).
 * @typedef {object} Customer
 * @property {string} id
 * @property {string} name
 * @property {string|null} phone WhatsApp, só dígitos com DDD (exigido para cobrar)
 * @property {string} note apelido ou observação
 * @property {Cents|null} creditLimitCents limite de fiado (nulo = sem limite)
 * @property {boolean} fiadoBlocked "Não vender fiado para este cliente"
 * @property {Cents} creditCents crédito do cliente (pagou a mais ou teve venda cancelada)
 * @property {boolean} archived
 * @property {string} createdAt
 */

/**
 * Conta de fiado (ContaFiado): uma por parcela em fiado de uma venda.
 * Saldo = originalCents − paidCents. O status é calculado (regra 3.4).
 * @typedef {object} FiadoAccount
 * @property {string} id
 * @property {string} customerId
 * @property {string} saleId
 * @property {Cents} originalCents
 * @property {Cents} paidCents
 * @property {string} createdAt data da compra
 * @property {string} dueDate vencimento `AAAA-MM-DD`
 * @property {string|null} cancelledAt preenchido quando a venda é cancelada
 */

/**
 * Recebimento de fiado (Abatimento). Entra no caixa como "recebimento de fiado", não como venda.
 * @typedef {object} FiadoPayment
 * @property {string} id
 * @property {string} customerId
 * @property {Cents} amountCents dinheiro novo recebido
 * @property {Exclude<PaymentMethod, 'fiado'>} method
 * @property {{ accountId: string, amountCents: Cents }[]} allocations contas abatidas (FIFO)
 * @property {Cents} creditUsedCents crédito do cliente consumido neste abatimento
 * @property {Cents} creditAddedCents excedente que virou crédito do cliente
 * @property {string} createdAt
 */

/**
 * Movimentação de estoque (MovimentoEstoque). Histórico imutável.
 * @typedef {object} StockMovement
 * @property {string} id
 * @property {string} productId
 * @property {StockMovementType} type
 * @property {number} delta variação aplicada na quantidade (negativa para saídas)
 * @property {number} balanceAfter quantidade depois do movimento
 * @property {Cents|null} unitCostCents entrada: custo pago por unidade
 * @property {string|null} reason perda: uma das chaves de `LOSS_REASONS`
 * @property {string|null} saleId venda ou estorno
 * @property {string} note
 * @property {string} createdAt
 */

/**
 * Despesa (Despesa).
 * @typedef {object} Expense
 * @property {string} id
 * @property {string} description
 * @property {string} category uma das chaves de `EXPENSE_CATEGORIES`
 * @property {Cents} amountCents
 * @property {'dinheiro'|'outro'} method só `dinheiro` sai da gaveta
 * @property {string} createdAt
 */

/**
 * Caixa do dia (Caixa). Os totais são calculados por `domain/rules/cash.js`;
 * ao fechar, o esperado é guardado para o histórico não mudar depois.
 * @typedef {object} CashDay
 * @property {string} date `AAAA-MM-DD`
 * @property {Cents} openingCents troco inicial
 * @property {string} openedAt
 * @property {string|null} closedAt
 * @property {Cents|null} countedCents quanto o vendedor contou ao fechar
 * @property {Cents|null} expectedCents dinheiro esperado no momento do fechamento
 * @property {string} note
 */

/**
 * Período de consulta, em dias civis inclusivos.
 * @typedef {object} Period
 * @property {string} start `AAAA-MM-DD`
 * @property {string} end `AAAA-MM-DD`
 */

export {};
