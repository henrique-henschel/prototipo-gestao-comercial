# Plano de implementação

Plano mestre do protótipo, aprovado antes do início do desenvolvimento e atualizado a cada fase. É a referência para retomar o trabalho em uma sessão nova: leia junto com o `CLAUDE.md` (convenções), `docs/regras-de-negocio.md` (o que o sistema faz) e `docs/design-system.md` (como a interface é feita).

## Contexto

Protótipo **front-end de alta fidelidade e definitivo** de um SaaS de gestão comercial para pequenos negócios e vendedores ambulantes: registrar vendas, receber por várias formas de pagamento (incluindo **fiado** com controle de inadimplência), gerenciar estoque, acompanhar faturamento, ver dashboards e exportar relatórios.

Decisões fechadas com o dono do produto:

- **Somente front-end React**, sem back-end, sem CRUD real e sem persistência. O estado vive **apenas em memória**, e recarregar a página volta aos dados de exemplo.
- **JavaScript (JSX)**, não TypeScript. Os contratos de domínio ficam em **JSDoc**.
- **CSS puro e moderno**, sem Tailwind. Gráficos com **Recharts**, estilizados pelos tokens.
- Público com baixa escolaridade e pouca familiaridade com tecnologia: UX extremamente simples, mas completa.
- O código será evoluído por uma empresa até o SaaS real: arquitetura limpa e camada de serviços como ponto de troca pela API.
- **Todo o contexto necessário fica no repositório.** Não usar memória persistente do agente.
- Fluxo de trabalho: **uma fase por vez**, verificada (lint, testes, build e capturas de tela) e com **um commit por fase**.

"Caderneta" é um nome provisório, definido em `APP_NAME` (`src/app/config.js`).

## Status

| Fase | Entrega                               | Status       |
| ---- | ------------------------------------- | ------------ |
| 1    | Fundação                              | ✅ `6a60070` |
| 2    | Design system                         | ✅ `590c2e6` |
| 3    | Domínio e dados                       | ⏳ próxima   |
| 4    | Shell e navegação                     | ⏳           |
| 5    | Vender                                | ⏳           |
| 6    | Fiado e clientes                      | ⏳           |
| 7    | Estoque                               | ⏳           |
| 8    | Caixa e despesas                      | ⏳           |
| 9    | Dashboard                             | ⏳           |
| 10   | Relatórios                            | ⏳           |
| 11   | Ajustes, acessibilidade, ajuda e tour | ⏳           |
| 12   | Polimento                             | ⏳           |

Agrupamento sugerido por sessão de trabalho: **3+4** → **5** → **6+7** → **8+9** → **10+11** → **12**.

Ao concluir uma fase: marque aqui e no Roadmap do `README.md`, atualize a seção "Estado atual" do `CLAUDE.md` e faça o commit.

## 1. Stack

| Item          | Escolha                                                                                                             | Observação                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build         | Vite 8 + `@vitejs/plugin-react`                                                                                     | alias `@/` → `src/`                                                                                                                                   |
| UI            | React 19 (JSX)                                                                                                      |                                                                                                                                                       |
| Rotas         | React Router **8** (`react-router`, modo biblioteca, `createBrowserRouter`)                                         | o plano original citava a v7; a v8 era a atual e tem a mesma API                                                                                      |
| Estilo        | CSS puro: `@layer`, custom properties, nesting nativo, CSS Modules                                                  |                                                                                                                                                       |
| Gráficos      | Recharts 3                                                                                                          | cores de `--chart-*`                                                                                                                                  |
| Ícones        | `lucide-react` 1.x                                                                                                  | alguns nomes mudaram: `CircleQuestionMark` (não `CircleHelp`) e `Trash` (não `Trash2`); confira em `node_modules/lucide-react/dist/lucide-react.d.ts` |
| Fonte         | Atkinson Hyperlegible (`@fontsource`)                                                                               |                                                                                                                                                       |
| QR Pix (mock) | `qrcode.react`                                                                                                      |                                                                                                                                                       |
| Formatação    | `Intl` pt-BR nativo                                                                                                 |                                                                                                                                                       |
| Exportação    | CSV nativo (`;` + BOM) e PDF via `window.print()` + `print.css`                                                     |                                                                                                                                                       |
| Qualidade     | ESLint **9** (flat config: react, react-hooks, jsx-a11y, react-refresh), Prettier, Vitest + Testing Library + jsdom | ESLint 10 ainda não é suportado por `eslint-plugin-react` e `jsx-a11y`                                                                                |
| Node          | ≥ 22                                                                                                                | o `scripts/screenshot.mjs` usa o `WebSocket` nativo                                                                                                   |

## 2. Estrutura de pastas (alvo)

```
src/
  app/            config.js ✅, router.jsx, providers.jsx, routes.js
  styles/         index.css ✅, reset ✅, tokens ✅, base ✅, utilities ✅, animations ✅, print.css (Fase 10)
  components/
    ui/           ✅ 25 primitivos + index.js (ver docs/design-system.md)
    layout/       AppShell, Sidebar, BottomNav, TopBar, PageHeader, SkipLink (Fase 4)
    charts/       ChartCard, RevenueBarChart, PaymentDonut, TopProductsChart, Sparkline (Fase 9)
  features/
    design-system/ ✅ catálogo vivo
    auth/         Entrar, Cadastro, BoasVindas (Fase 4)
    dashboard/    (Fase 9)
    sales/        Vender, Carrinho, Pagamento, VendaConcluida, HistoricoVendas, DetalheVenda (Fase 5)
    fiado/        QuemDeve, ContaCliente, ReceberPagamento (Fase 6)
    customers/    (Fase 6)
    inventory/    Produtos, ProdutoForm, Movimentacoes (Fase 7)
    cash/         CaixaDoDia, Despesas (Fase 8)
    reports/      (Fase 10)
    settings/     (Fase 11)
    help/         (Fase 11)
  domain/
    models.js     @typedef JSDoc de todas as entidades (Fase 3)
    constants.js  formas de pagamento, status, unidades, categorias (Fase 3)
    rules/        money.js ✅; sales, payments, fiado, stock, metrics (Fase 3)
  mocks/          seed.js, db.js (Fase 3)
  services/       *.service.js (Fase 3)
  store/          ToastProvider ✅, PreferencesProvider ✅; DataProvider, SessionProvider (Fases 3–4)
  hooks/          useToast ✅, usePreferences ✅, useSpeech ✅; useMediaQuery, useUndo, useVibrate...
  lib/            cx ✅, date ✅, format ✅; csv, whatsapp, share, id, viewTransition
scripts/          screenshot.mjs ✅ (verificação visual)
```

## 3. Arquitetura de dados (sem back-end)

- **Dinheiro sempre em centavos inteiros.** `src/domain/rules/money.js` já existe e tem testes: `toCents`, `fromCents`, `formatBRL`, `formatDecimal`, `parseCentsFromDigits`, `sumCents` e `percentOf`.
- **Datas:** `src/lib/date.js` (`today`, `toISODate`, `parseISODate`, `addDays`, `diffInDays`) e `src/lib/format.js` (`formatDate`, `formatDateLong`, `formatDayMonth`, `formatTime`, `formatNumber`, `formatPercent`, `formatRelativeDay`, `plural`) já existem e têm testes.
- `mocks/seed.js`: cerca de 90 dias de histórico, gerados com PRNG de semente fixa (ex.: mulberry32) e datas **relativas a hoje**. Inclui ~25 produtos com emoji, cor e categoria, ~15 clientes, ~400 vendas, fiados em todos os status, despesas e movimentações de estoque. Deve ser **determinístico** para os testes, aceitando a data de referência como parâmetro.
- `mocks/db.js`: objeto em memória inicializado pelo seed, com `resetDemo()`.
- `services/*.service.js`: funções `async` sobre o `db`, com latência simulada de 150–400 ms. As assinaturas espelham uma API REST futura e são documentadas em JSDoc. A latência é configurável e zerada nos testes, e há os modos "simular lentidão" e "simular erro" (ligados em Ajustes > Modo demonstração, na Fase 11).
- `store/DataProvider`: Context + `useReducer` com ações (`sale/created`, `sale/cancelled`, `fiado/paid`, `stock/adjusted`...) que chamam os serviços. Atualizações otimistas com rollback em erro. Seguir o padrão de três arquivos (`x-context.js`, `XProvider.jsx`, `hooks/useX.js`).
- Regras de negócio **somente** em `domain/rules`, como funções puras e testadas.

## 4. Regras de negócio

Detalhadas e numeradas em **`docs/regras-de-negocio.md`**, que é o contrato. Resumo:

- **Vendas:** itens do estoque ou valor avulso; desconto em R$ ou %; cliente obrigatório no fiado; baixa automática de estoque. Aviso de venda sem estoque (ou bloqueio, conforme o ajuste). "Desfazer" por 5 s; cancelamento com motivo, que estorna estoque e fiado.
- **Pagamentos:** dinheiro (atalhos de cédulas e troco em destaque), Pix (QR mock), débito, crédito (à vista ou parcelado) e fiado. Pagamento dividido com soma exata. A taxa da maquininha entra no lucro, não no valor cobrado.
- **Fiado:** status calculado (`quitado`, `em_dia`, `vence_em_breve`, `vence_hoje`, `atrasado`); limite de crédito e bloqueio com alerta e confirmação; abatimento FIFO; crédito do cliente; cobrança por WhatsApp (`wa.me`); indicadores de inadimplência.
- **Estoque:** margem, movimentações imutáveis (entrada, venda, estorno, ajuste, perda) e situação (`ok`, `acabando`, `acabou`).
- **Caixa:** troco inicial, entradas por forma de pagamento, recebimentos de fiado, despesas, dinheiro esperado na gaveta e fechamento com conferência.
- **Métricas:** faturamento, recebido, custo, taxas, lucro estimado, ticket médio e comparação com o período anterior.
- **Relatórios:** por período e tipo; CSV, PDF (impressão) e compartilhamento.

Os presets visuais desses status já existem em `src/components/ui/StatusPill/statusPresets.js`, e as chaves devem bater com as de `domain/constants.js`.

## 5. Telas e rotas (pt-BR)

| Rota                                        | Tela                       | Destaques                                                                                                                                 |
| ------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `/entrar`, `/cadastro`                      | Login e cadastro simulados | qualquer dado entra; botão "Entrar com conta de demonstração"                                                                             |
| `/boas-vindas`                              | Onboarding em 3 passos     | nome do negócio, o que vende, formas de pagamento aceitas                                                                                 |
| `/inicio`                                   | Dashboard                  | "Hoje você vendeu R$ X", cards, gráfico de 7 dias, rosca por forma de pagamento, atalhos e avisos                                         |
| `/vender`                                   | PDV                        | grade de produtos grandes, busca, chips de categoria, "Valor avulso" e carrinho fixo "3 itens · R$ 25,00 → Cobrar"; no desktop, 2 colunas |
| (painel)                                    | Pagamento                  | botões grandes por forma, troco, Pix, cartão, fiado e pagamento dividido                                                                  |
| (tela)                                      | Venda concluída            | animação, valor e troco enormes, "Nova venda", "Enviar recibo" e "Desfazer"                                                               |
| `/vendas`, `/vendas/:id`                    | Histórico                  | agrupado por dia, filtros e cancelamento                                                                                                  |
| `/fiado`, `/fiado/:clienteId`               | Quem me deve               | lista por urgência, totais, conta do cliente, receber pagamento e cobrar no WhatsApp                                                      |
| `/clientes`                                 | Clientes                   | cadastro, limite, bloqueio e histórico                                                                                                    |
| `/estoque`, `/estoque/novo`, `/estoque/:id` | Produtos                   | filtros (acabando/acabou), entrada rápida e formulário com prévia do card                                                                 |
| `/caixa`                                    | Caixa do dia               | resumo, despesas e fechamento do dia                                                                                                      |
| `/relatorios`                               | Relatórios                 | filtros, prévia e exportações                                                                                                             |
| `/ajustes`                                  | Ajustes                    | negócio, Pix, formas e taxas, regras, acessibilidade, modo demonstração e restaurar dados                                                 |
| `/ajuda`                                    | Ajuda                      | perguntas frequentes e refazer o tour                                                                                                     |
| `/design-system`                            | Catálogo vivo              | ✅ já existe; hoje é renderizado direto pelo `App.jsx`                                                                                    |
| `*`                                         | 404 amigável               |                                                                                                                                           |

Navegação: no **celular**, BottomNav com Início, Fiado, **Vender** (central, em destaque), Estoque e Mais. No **desktop/tablet**, Sidebar com ícone e rótulo. As rotas são protegidas pelo `SessionProvider` simulado. Os avisos ficam acima da BottomNav via `--toast-offset`.

## 6. Princípios de UX

Ver o checklist no `CLAUDE.md` e os princípios em `docs/design-system.md`: ícone sempre com texto, alvos ≥ 48px, uma ação principal por tela, teclado numérico próprio para valores, "Desfazer" em vez de confirmação, feedback multissensorial (aviso, animação, vibração e "Ouvir"), estados vazio/carregando/erro, tour de primeiro uso e WCAG 2.2 AA.

## 7. Design system

✅ Concluído na Fase 2 e documentado em `docs/design-system.md`. Componentes disponíveis: Button, IconButton, Field, Input, Select, Textarea, Switch, MoneyInput, NumericKeypad, QuantityStepper, Chip/ChipGroup, SegmentedControl, Tabs, Badge, StatusPill, Card/CardHeader, StatCard, Dialog/BottomSheet, Toaster (via `useToast`), EmptyState, Skeleton, ProgressBar, Avatar, SearchBar, DateShortcuts, HelpTip e SpeakButton.

## 8. Fases

### ✅ Fase 1: Fundação

Vite, React, alias, ESLint, Prettier, Vitest, fonte e documentação (`CLAUDE.md`, `README.md`, `docs/`).

### ✅ Fase 2: Design system

Tokens, temas (claro, escuro e alto contraste), escala de texto, 25 componentes, `PreferencesProvider`, `ToastProvider`, `money.js`, `lib/date.js` e `lib/format.js` com testes, e o catálogo `/design-system`.

### Fase 3: Domínio e dados

1. `domain/constants.js`: formas de pagamento (com o slot de cor `--chart-n` fixo de cada uma), status de fiado, estoque e venda, unidades, categorias de produto e de despesa, e motivos de cancelamento.
2. `domain/models.js`: `@typedef` de Negocio, Produto, Venda, ItemVenda, Pagamento, Cliente, ContaFiado, Abatimento, MovimentoEstoque, Despesa, Caixa e Ajustes.
3. `domain/rules/`: `sales.js` (subtotal, desconto, total), `payments.js` (troco, pagamento dividido, taxas), `fiado.js` (status, saldo, limite, abatimento FIFO, crédito), `stock.js` (situação, margem, aplicar movimentos), `cash.js` (gaveta esperada, diferença) e `metrics.js` (faturamento, lucro, ticket, comparativos, séries por dia, ranking de produtos). **Todos com testes**, cobrindo os casos numerados de `docs/regras-de-negocio.md`.
4. `mocks/seed.js` (determinístico, com data de referência como parâmetro) e `mocks/db.js` (`resetDemo`).
5. `services/`: auth, products, sales, customers, fiado, cash, reports e settings; `async`, com latência configurável e modos de erro e lentidão.
6. `store/DataProvider` (padrão de três arquivos) e hooks de consumo (`useProducts`, `useSales`, `useCustomers`, `useFiado`, `useCash`...).

### Fase 4: Shell e navegação

`app/router.jsx` com rotas lazy, `providers.jsx`, `routes.js`; AppShell, Sidebar, BottomNav, TopBar, PageHeader e SkipLink; `SessionProvider` e login, cadastro e onboarding simulados; 404; View Transitions nas trocas de rota (`lib/viewTransition.js`); `/design-system` vira rota. Atualizar o `App.test.jsx`.

### Fase 5: Vender (fluxo crítico)

PDV (grade, busca, categorias e valor avulso), carrinho (quantidade, desconto e observação), pagamento (todas as formas, dividido e troco com "Ouvir"), venda concluída (animação, recibo por WhatsApp e "Desfazer"), histórico, detalhe e cancelamento com motivo. Testes de integração: venda em dinheiro com troco, venda dividida e cancelamento estornando o estoque.

### Fase 6: Fiado e clientes

"Quem me deve" (ordenado por urgência, totais e filtros), conta do cliente, receber pagamento (FIFO), limite e bloqueio com alerta na venda, cobrança por WhatsApp (`lib/whatsapp.js`) e CRUD simulado de clientes.

### Fase 7: Estoque

Lista com filtros e situação, formulário com prévia do card (emoji, cor e margem), entrada rápida de mercadoria, ajuste e perda, e histórico de movimentações.

### Fase 8: Caixa e despesas

Caixa do dia (troco inicial, entradas por forma de pagamento, recebimentos de fiado), despesas, fechar o dia com conferência e reabertura.

### Fase 9: Dashboard

Cards (StatCard), gráficos Recharts (vendas dos 7 dias, rosca por forma de pagamento, mais vendidos), avisos (fiados vencendo ou atrasados, estoque acabando) e atalhos. **Carregar a skill `dataviz` antes de escrever os gráficos.** Usar a paleta `--chart-*` já validada, com uma cor fixa por entidade, tabela alternativa e nenhum eixo duplo.

### Fase 10: Relatórios

Filtros de período e tipo, prévia, CSV (`lib/csv.js`), PDF (`styles/print.css` + `window.print()`) e compartilhamento (`lib/share.js`).

### Fase 11: Ajustes, acessibilidade, ajuda e tour

Dados do negócio, chave Pix, formas e taxas, regras de estoque e de fiado, acessibilidade (tema, tamanho do texto, vibração e "Ouvir"), modo demonstração (lentidão e erro) e restaurar dados; FAQ em linguagem simples; tour de primeiro uso.

### Fase 12: Polimento

Animações, estados vazio, carregando e erro em todas as telas, auditoria de acessibilidade (axe/Lighthouse ≥ 95), revisão dos textos, PWA básico (manifest para "instalar na tela inicial"), testes dos fluxos principais e capturas de tela no README.

## 9. Verificação (toda fase)

1. `npm run lint && npm test && npm run build` sem erros, e `npm run format:check`.
2. Verificação visual com `npm run dev` + `npm run shot` (ver o `CLAUDE.md`): 360px e 1440px, claro e escuro, alto contraste com texto a 150% e ausência de rolagem horizontal (`--eval "document.documentElement.scrollWidth"` deve ser igual à largura).
3. Fluxo manual de ponta a ponta a partir da Fase 5: login demo → venda em dinheiro, Pix, fiado e dividida → desfazer → receber fiado parcial → entrada de estoque → fechar o dia → dashboard refletindo tudo → exportar CSV e imprimir PDF.
4. Recarregar a página volta aos dados de exemplo (comportamento esperado).
