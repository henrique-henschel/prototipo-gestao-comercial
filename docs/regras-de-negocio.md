# Regras de negócio

Este documento é o **contrato funcional** do produto. As regras são implementadas como funções puras em `src/domain/rules/` e o back-end futuro deve revalidá-las no servidor. Qualquer mudança aqui deve vir acompanhada da mudança no código e nos testes, e vice-versa.

## Convenções gerais

- **Dinheiro**: sempre em **centavos inteiros** (`1250` = R$ 12,50). Arredondamento _half-up_ só na conversão de entrada ou no cálculo de percentuais.
- **Datas**: ISO 8601. "Hoje" e os vencimentos são comparados por **dia civil** no fuso do dispositivo.
- **Identificadores**: strings únicas geradas no cliente (no back-end real, geradas pelo servidor).
- **Quantidades**: números com até 3 casas decimais (produtos vendidos por kg); unidades inteiras para `un`, `pacote`, `caixa`.

## 1. Vendas

1. Uma venda tem um ou mais **itens**. Cada item é:
   - um **produto do estoque** (preço, custo e nome copiados no momento da venda, porque mudanças futuras no produto não alteram vendas passadas); ou
   - um **valor avulso**, digitado no teclado numérico, com descrição opcional e sem custo nem baixa de estoque.
2. **Subtotal** = soma de `preço unitário × quantidade` dos itens.
3. **Desconto** em R$ ou em %, aplicado sobre o subtotal. Não pode deixar o total negativo, e um desconto em % é limitado a 100%.
4. **Total** = subtotal − desconto. Uma venda de total zero só é permitida com confirmação explícita ("brinde").
5. **Cliente** é opcional, mas obrigatório quando houver qualquer parcela em fiado.
6. Ao **concluir** uma venda:
   - dá baixa no estoque dos produtos com controle de estoque;
   - registra os pagamentos e, se houver, as contas de fiado;
   - a venda entra no caixa do dia e nos relatórios.
7. **Desfazer**: por 5 segundos após concluir, um toast oferece "Desfazer", que reverte todos os efeitos como se a venda não tivesse existido (ela não fica no histórico).
8. **Cancelar** (depois do prazo de desfazer, no histórico): exige um motivo (lista simples + "outro").
   - Estorna o estoque e as contas de fiado geradas por essa venda.
   - A venda continua no histórico com o status **Cancelada** e sai do faturamento, do lucro e do caixa.
   - Se o fiado da venda já recebeu pagamentos, o valor pago vira **crédito do cliente**, e o vendedor é avisado.
9. **Venda sem estoque suficiente**: por padrão mostra um **aviso** e permite continuar, porque ambulantes nem sempre registram cada reposição. Com a opção "Bloquear venda sem estoque" ativa em Ajustes, a venda é impedida. Produtos marcados como "sem controle de estoque" nunca geram aviso.

## 2. Pagamentos

Formas: `dinheiro`, `pix`, `debito`, `credito`, `fiado`. Cada forma pode ser desativada em Ajustes.

1. **Dinheiro**: o vendedor informa quanto recebeu (atalhos de cédulas R$ 2, 5, 10, 20, 50, 100 e "valor certo"). **Troco** = recebido − valor da parcela em dinheiro. O troco não pode ser negativo; se o valor recebido não cobrir a parcela, a venda não é concluída e a interface mostra quanto falta.
2. **Pix**: mostra o QR e a chave Pix do negócio (simulado). O vendedor confirma com "Recebi o Pix".
3. **Débito / Crédito**: o crédito pode ser à vista ou parcelado (de 2 a 12x, apenas informativo para relatório). A **taxa da maquininha** configurada por forma (e por número de parcelas no crédito) **não altera o valor cobrado**: ela é custo e entra no cálculo do lucro.
4. **Fiado**: ver seção 3.
5. **Pagamento dividido**: uma venda pode ter várias parcelas de formas diferentes. A soma das parcelas deve ser **exatamente** igual ao total, e só a parcela em dinheiro pode gerar troco. A interface mostra uma barra com "quanto falta".

## 3. Fiado (anti-inadimplência)

1. Cada parcela em fiado gera uma **conta de fiado** (`ContaFiado`) ligada ao cliente e à venda, com valor, data da compra e **vencimento**.
2. **Vencimento**: atalhos de 7, 15 e 30 dias ou uma data escolhida. O padrão é configurável (30 dias).
3. **Entrada**: o cliente pode pagar parte na hora (outra forma de pagamento), e o restante vira fiado.
4. **Status de uma conta** (calculado, nunca armazenado):

   | Status           | Condição                                        | Visual                |
   | ---------------- | ----------------------------------------------- | --------------------- |
   | `quitado`        | saldo = 0                                       | verde, ícone de check |
   | `em_dia`         | vencimento a mais de 3 dias                     | neutro                |
   | `vence_em_breve` | vence em 1 a 3 dias                             | âmbar, relógio        |
   | `vence_hoje`     | vence hoje                                      | âmbar forte, alerta   |
   | `atrasado`       | vencimento já passou (exibe "N dias de atraso") | vermelho, alerta      |

5. **Saldo do cliente** = soma dos saldos das contas abertas − crédito do cliente.
6. **Status do cliente** = o pior status entre as suas contas abertas, na ordem atrasado > vence hoje > vence em breve > em dia.
7. **Limite de crédito** (opcional, por cliente) e opção **"Não vender fiado para este cliente"**. Ao escolher fiado na venda, a interface **alerta** quando:
   - o novo saldo ultrapassaria o limite;
   - o cliente tem contas atrasadas;
   - o cliente está bloqueado para fiado.

   O vendedor pode **confirmar mesmo assim** (a decisão é dele) ou escolher outra forma de pagamento. O alerta mostra o saldo atual, o limite e os dias de atraso.

8. **Receber pagamento de fiado** (abatimento): valor livre, com qualquer forma exceto fiado.
   - Quita as contas **mais antigas primeiro** (FIFO por vencimento e, no empate, pela data da compra).
   - Um valor acima do saldo total vira crédito do cliente, após confirmação.
   - Todo abatimento gera um registro no histórico do cliente e entra no caixa do dia como "recebimento de fiado", e não como venda.
9. **Cobrança pelo WhatsApp**: link `https://wa.me/55<DDD><número>?text=...` com uma mensagem educada pronta, contendo o nome do negócio, o valor em aberto e o vencimento. Disponível na lista "Quem me deve" e na conta do cliente.
10. **Indicadores**: total a receber, total atrasado, % de inadimplência (atrasado ÷ a receber), quantidade de clientes devendo e maiores devedores.

## 4. Clientes

- Campos: nome (obrigatório), WhatsApp (opcional, mas exigido para a cobrança), apelido/observação, limite de crédito, bloqueio para fiado.
- O **cadastro rápido** dentro da venda pede só nome e WhatsApp.
- Um cliente com saldo em aberto não pode ser excluído, apenas arquivado.

## 5. Estoque

1. **Produto**: nome, emoji ou foto, cor do card, categoria, unidade (`un`, `kg`, `g`, `l`, `pacote`, `caixa`, `duzia`), preço de venda, custo (opcional), quantidade, estoque mínimo, código (opcional), "controlar estoque" (sim/não), ativo/inativo.
2. **Margem** = (preço − custo) ÷ preço. Fica sem valor quando não há custo. Se o preço for menor que o custo, a interface mostra um alerta de "vendendo no prejuízo".
3. **Movimentações** (histórico imutável):

   | Tipo      | Efeito na quantidade                               |
   | --------- | -------------------------------------------------- |
   | `entrada` | soma; pode atualizar o custo                       |
   | `venda`   | subtrai (automático)                               |
   | `estorno` | soma (cancelamento de venda)                       |
   | `ajuste`  | define a quantidade contada (registra a diferença) |
   | `perda`   | subtrai; motivo: vencido, quebrado, outro          |

4. **Situação do estoque** (calculada):
   - `acabou`: quantidade ≤ 0;
   - `acabando`: quantidade ≤ estoque mínimo;
   - `ok`: nos demais casos.

   Produtos sem controle de estoque não têm situação.

5. A quantidade pode ficar negativa só quando a venda sem estoque é permitida. Nesse caso a interface mostra "acabou" e sugere fazer uma entrada.

## 6. Caixa do dia e despesas

1. O **caixa do dia** é aberto com um **troco inicial** (opcional, padrão R$ 0,00) na primeira venda do dia ou manualmente.
2. **Entradas**: vendas por forma de pagamento (fiado aparece separado, como "vendido a receber") e recebimentos de fiado.
3. **Despesas**: descrição, categoria (mercadoria, transporte/gasolina, alimentação, ponto/aluguel, taxas, outros), valor e forma (dinheiro ou outra). Só as despesas pagas em dinheiro saem da gaveta.
4. **Dinheiro esperado na gaveta** = troco inicial + vendas em dinheiro (já descontado o troco) + recebimentos de fiado em dinheiro − despesas em dinheiro.
5. **Fechar o dia**: o vendedor informa quanto contou. Diferença = contado − esperado, exibida como "sobrou" ou "faltou". Um dia fechado pode ser reaberto.

## 7. Métricas e lucro

- **Faturamento (vendido)** = soma dos totais das vendas não canceladas no período, inclusive a parte em fiado.
- **Recebido** = vendido − fiado ainda em aberto + recebimentos de fiado do período.
- **Custo das mercadorias** = soma de `custo × quantidade` dos itens vendidos (itens sem custo contam como zero e a interface avisa que o lucro é estimado).
- **Taxas** = soma das taxas da maquininha das parcelas em cartão.
- **Lucro estimado** = faturamento − custo das mercadorias − taxas − despesas.
- **Ticket médio** = faturamento ÷ número de vendas.
- **Comparativos**: sempre contra o período anterior de mesma duração ("hoje × ontem", "esta semana × semana passada").

## 8. Relatórios e exportação

- **Períodos**: hoje, ontem, últimos 7 dias, este mês, mês passado, personalizado.
- **Tipos**: vendas (lista), por forma de pagamento, produtos mais vendidos, fiado/devedores, estoque (situação e valor em estoque), caixa e despesas, resumo geral.
- **Excel (CSV)**: separador `;`, decimal com vírgula, BOM UTF-8 (para o Excel em português abrir corretamente), datas `dd/mm/aaaa`.
- **PDF**: via impressão do navegador com folha de estilo própria (`print.css`), com cabeçalho do negócio, período e data de emissão.
- **Compartilhar**: Web Share API quando disponível; senão, um link do WhatsApp com o resumo em texto.

## 9. Ajustes que alteram regras

| Ajuste                                                           | Padrão    | Regra afetada |
| ---------------------------------------------------------------- | --------- | ------------- |
| Formas de pagamento ativas                                       | todas     | 2             |
| Taxas da maquininha (débito, crédito à vista, crédito parcelado) | 0%        | 2.3, 7        |
| Chave Pix                                                        | vazia     | 2.2           |
| Vencimento padrão do fiado                                       | 30 dias   | 3.2           |
| Bloquear venda sem estoque                                       | desligado | 1.9, 5.5      |
| Troco inicial padrão                                             | R$ 0,00   | 6.1           |
