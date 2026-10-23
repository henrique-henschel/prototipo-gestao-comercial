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
| 3    | Domínio e dados                       | ✅ `7794f72` |
| 4    | Shell e navegação                     | ✅ `4a01170` |
| 5    | Vender                                | ✅ `101823a` |
| 6    | Fiado e clientes                      | ✅ `4aad853` |
| 7    | Estoque                               | ✅ `f78f19d` |
| 8    | Caixa e despesas                      | ✅ `2710865` |
| 9    | Dashboard                             | ✅ `d0539ac` |
| 10   | Relatórios                            | ✅ `202c1d5` |
| 11   | Ajustes, acessibilidade, ajuda e tour | ✅           |
| 12   | Polimento                             | ⏳ próxima   |

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
  app/            ✅ config.js, routes.js, router.js, providers.jsx, guards.jsx, RootLayout.jsx
  styles/         index.css ✅, reset ✅, tokens ✅, base ✅, utilities ✅, animations ✅, print.css ✅
  components/
    ui/           ✅ 27 primitivos + index.js (ver docs/design-system.md)
    layout/       ✅ AppShell, Sidebar, BottomNav, TopBar, PageHeader, CenteredLayout, Brand,
                  SkipLink, NavigationProgress, ComingSoon + navigation.js
    charts/       ChartCard, RevenueBarChart, PaymentDonut, TopProductsChart, Sparkline (Fase 9)
  features/
    design-system/ ✅ catálogo vivo
    auth/         ✅ LoginPage, SignupPage, OnboardingPage
    more/         ✅ MorePage ("Mais" do celular)
    errors/       ✅ NotFoundPage, RouteErrorPage
    dashboard/    (Fase 9)
    sales/        ✅ SellPage (produtos, carrinho, pagamento, concluída), SalesPage, SaleDetailPage
    fiado/        QuemDeve, ContaCliente, ReceberPagamento (Fase 6)
    customers/    (Fase 6)
    inventory/    Produtos, ProdutoForm, Movimentacoes (Fase 7)
    cash/         CaixaDoDia, Despesas (Fase 8)
    reports/      ✅ ReportsPage, ReportPreview, ReportTable, tabelas (CSV/tela/PDF), texto do resumo
    settings/     ✅ SettingsPage, janelas de edição e useSaveSettings (salvar com "Desfazer")
    help/         ✅ HelpPage, perguntas frequentes (faq.js) e o tour (Tour, tourSteps.js)
  domain/
    models.js     ✅ @typedef JSDoc de todas as entidades
    constants.js  ✅ formas de pagamento, status, unidades, categorias, motivos, ajustes padrão
    rules/        ✅ money, sales, payments, fiado, customers, stock, cash, period, metrics, settings
  mocks/          ✅ random.js (mulberry32), seed.js, db.js
  services/       ✅ api.js + auth, products, sales, customers, fiado, cash, reports, settings
  store/          ✅ ToastProvider, PreferencesProvider, DataProvider, SessionProvider, CartProvider
  hooks/          useToast ✅, usePreferences ✅, useSpeech ✅, useData/useSales/useProducts/useCustomers/
                  useFiado/useCash/useSettings ✅, useSession/useLogout ✅, useCart/useMediaQuery/useVibrate ✅
  lib/            cx ✅, date ✅, format ✅, id ✅, whatsapp ✅, csv ✅, share ✅
scripts/          screenshot.mjs ✅ (verificação visual)
```

## 3. Arquitetura de dados (sem back-end)

- **Dinheiro sempre em centavos inteiros.** `src/domain/rules/money.js` já existe e tem testes: `toCents`, `fromCents`, `formatBRL`, `formatDecimal`, `parseCentsFromDigits`, `sumCents` e `percentOf`.
- **Datas:** `src/lib/date.js` (`today`, `toISODate`, `parseISODate`, `addDays`, `diffInDays`) e `src/lib/format.js` (`formatDate`, `formatDateLong`, `formatDayMonth`, `formatTime`, `formatNumber`, `formatPercent`, `formatRelativeDay`, `plural`) já existem e têm testes.
- `mocks/seed.js`: `createSeed({ now, seed })` gera 90 dias da "Barraca da Rosa" com PRNG de semente fixa (`mocks/random.js`, mulberry32) e datas **relativas a `now`**: 27 produtos (um inativo, dois sem controle de estoque, dois sem custo), 15 clientes com perfis de pagamento, ~440 vendas (inclusive canceladas, divididas e com desconto), contas de fiado e recebimentos, ~120 despesas, ~800 movimentações e o caixa de cada dia (os passados fechados, o de hoje aberto). Os dados nascem das próprias regras de `domain/rules`, então são coerentes: o estoque é a soma das movimentações, e o pago de cada conta é a soma dos abatimentos. Um roteiro (`FIADO_SCRIPT`) e os produtos com `scenario` garantem que hoje existam **todos** os status de fiado e de estoque. Hoje, os registros ficam entre as 6h (ou 8 horas atrás) e o horário atual, sem nada no futuro. `createEmptyData()` cria um negócio vazio ("começar do zero").
- `mocks/db.js`: o objeto `db`, inicializado pelo seed, e `resetDemo({ empty, user })`, que troca o conteúdo sem trocar a referência.
- `services/api.js`: `request(handler)` simula a rede, com latência de 150–400 ms (zero nos testes), `configureApi({ slow, failing })` para os modos "simular lentidão" (1,5–3 s) e "simular erro" (Fase 11), `ApiError` com `code`, `codes` e mensagem pronta em `ERROR_MESSAGES`, e cópia profunda do resultado (a interface nunca compartilha objetos com o banco). Os handlers validam tudo antes de alterar o banco.
- `services/*.service.js`: funções `async` documentadas com o endpoint REST equivalente (`POST /sales`, `POST /customers/:id/fiado-payments`...). As listas voltam em ordem cronológica, e as telas ordenam como precisarem. Operações compostas devolvem tudo o que mudou (ex.: `createSale` → `{ sale, products, movements, fiadoAccounts, cashDay }`).
- `store/DataProvider`: Context + `useReducer`, com estado e ações em contextos separados (`DataStateContext` e `DataActionsContext`, em `store/data-context.js`). O reducer (`data-reducer.js`) e as ações (`data-actions.js`) são JavaScript puro. Ações que dependem de números definidos pelo serviço (venda, recebimento de fiado, movimentos) são **confirmadas**: o estado muda quando a resposta chega. Edições, arquivamentos, exclusões e ajustes são **otimistas**: `optimistic/applied` guarda no próprio estado como desfazer, e `optimistic/reverted` faz o rollback se o serviço falhar. O provider carrega tudo ao montar e oferece `reload()`.
- Hooks de consumo (`src/hooks/`): `useDataStatus` (carregando, erro e "Tentar de novo"), `useSales`, `useProducts`, `useCustomers`, `useFiado` (com "Quem me deve" já ordenado e os indicadores), `useCash` (com o resumo do caixa de hoje) e `useSettings`.
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
| `/mais`                                     | Mais (celular)             | ✅ as áreas que não cabem na barra de baixo, a conta e "Sair"                                                                             |
| `/design-system`                            | Catálogo vivo              | ✅ rota pública                                                                                                                           |
| `*`                                         | 404 amigável               |                                                                                                                                           |

Navegação: no **celular**, BottomNav com Início, Fiado, **Vender** (central, em destaque), Estoque e Mais. No **desktop/tablet** (a partir de 768px), Sidebar com ícone e rótulo. As rotas são protegidas pelo `SessionProvider` simulado: sem sessão, a pessoa vai para `/entrar?voltar=<tela pedida>` e volta para lá depois de entrar. Os avisos ficam acima da BottomNav via `--toast-offset`.

## 6. Princípios de UX

Ver o checklist no `CLAUDE.md` e os princípios em `docs/design-system.md`: ícone sempre com texto, alvos ≥ 48px, uma ação principal por tela, teclado numérico próprio para valores, "Desfazer" em vez de confirmação, feedback multissensorial (aviso, animação, vibração e "Ouvir"), estados vazio/carregando/erro, tour de primeiro uso e WCAG 2.2 AA.

## 7. Design system

✅ Concluído na Fase 2 e documentado em `docs/design-system.md`. Componentes disponíveis: Button, IconButton, Field, Input, Select, Textarea, Switch, MoneyInput, NumericKeypad, QuantityStepper, Chip/ChipGroup, SegmentedControl, Tabs, Badge, StatusPill, Card/CardHeader, StatCard, Dialog/BottomSheet, Toaster (via `useToast`), EmptyState, Skeleton, ProgressBar, Avatar, SearchBar, DateShortcuts, HelpTip e SpeakButton.

## 8. Fases

### ✅ Fase 1: Fundação

Vite, React, alias, ESLint, Prettier, Vitest, fonte e documentação (`CLAUDE.md`, `README.md`, `docs/`).

### ✅ Fase 2: Design system

Tokens, temas (claro, escuro e alto contraste), escala de texto, 25 componentes, `PreferencesProvider`, `ToastProvider`, `money.js`, `lib/date.js` e `lib/format.js` com testes, e o catálogo `/design-system`.

### ✅ Fase 3: Domínio e dados

Entregue conforme abaixo e detalhado na seção 3. Decisões tomadas durante a fase: a fórmula do "Recebido" foi corrigida (regra 7), a compra de mercadoria para revender é entrada de estoque e não despesa (regra 6.3), o crédito do cliente é usado automaticamente no próximo recebimento (regra 3.5) e o "Desfazer" vale pelo instante do toque (regra 1.7). Também foram criadas regras de cadastro (`customers.js`, `validateProduct`, `validateExpense`) e de ajustes (`settings.js`).

1. `domain/constants.js`: formas de pagamento (com o slot de cor `--chart-n` fixo de cada uma), status de fiado, estoque e venda, unidades, categorias de produto e de despesa, e motivos de cancelamento.
2. `domain/models.js`: `@typedef` de Negocio, Produto, Venda, ItemVenda, Pagamento, Cliente, ContaFiado, Abatimento, MovimentoEstoque, Despesa, Caixa e Ajustes.
3. `domain/rules/`: `sales.js` (subtotal, desconto, total), `payments.js` (troco, pagamento dividido, taxas), `fiado.js` (status, saldo, limite, abatimento FIFO, crédito), `stock.js` (situação, margem, aplicar movimentos), `cash.js` (gaveta esperada, diferença) e `metrics.js` (faturamento, lucro, ticket, comparativos, séries por dia, ranking de produtos). **Todos com testes**, cobrindo os casos numerados de `docs/regras-de-negocio.md`.
4. `mocks/seed.js` (determinístico, com data de referência como parâmetro) e `mocks/db.js` (`resetDemo`).
5. `services/`: auth, products, sales, customers, fiado, cash, reports e settings; `async`, com latência configurável e modos de erro e lentidão.
6. `store/DataProvider` (padrão de três arquivos) e hooks de consumo (`useProducts`, `useSales`, `useCustomers`, `useFiado`, `useCash`...).

### ✅ Fase 4: Shell e navegação

`app/router.js` com rotas carregadas sob demanda (`lazy`), `providers.jsx`, `routes.js` (caminhos e `safeReturnPath`) e `guards.jsx` (`RequireAuth`, `RequireOnboarded`, `PublicOnly`); AppShell, Sidebar, BottomNav, TopBar, PageHeader, SkipLink, NavigationProgress e CenteredLayout; `SessionProvider` (padrão de três arquivos) com entrar, conta de demonstração, criar conta e sair; boas-vindas em 3 passos; "Mais"; 404 e tela de erro; `/design-system` como rota pública. O `App.test.jsx` cobre guardas, login, cadastro e boas-vindas, navegação, sair e 404.

Decisões tomadas durante a fase:

- **View Transitions com o `<ViewTransition>` do React** em volta do conteúdo do `AppShell`. A v8 do React Router marcou como obsoleta a opção `viewTransition` dos links e recomenda o componente do React (19.3+); por isso não existe `lib/viewTransition.js`. O movimento reduzido é tratado em `styles/animations.css`.
- **`DataProvider` só na área logada** (dentro de `RequireAuth`): os dados carregam depois de entrar, e sair descarta tudo.
- **Sessão só em memória**, como o resto: recarregar a página sai da conta. O `?voltar=` devolve a pessoa à tela que ela tinha aberto.
- **Telas das próximas fases** já têm rota e arquivo em `features/<área>/pages/`, com o componente `ComingSoon` (cabeçalho real + aviso "Esta tela está sendo construída"). Cada fase substitui o conteúdo do arquivo.
- **Boas-vindas**: o último passo pergunta se a pessoa quer começar com os dados de exemplo; desligado, o negócio começa vazio (`createEmptyData`). Uma conta nova começa sem nome de negócio e sem categorias.
- **Foco na troca de tela**: o `<main>` recebe o foco (sem contorno), para o leitor de tela anunciar a tela nova; nas boas-vindas, o foco vai para a pergunta de cada passo.

### ✅ Fase 5: Vender (fluxo crítico)

Entregue: `/vender` com grade de produtos (os mais vendidos dos últimos 30 dias primeiro), busca sem acento, chips de categoria e "Valor avulso"; carrinho com quantidade, desconto em R$ ou % (teclado próprio), observação e "Desfazer" ao tirar itens; aviso de estoque antes de cobrar (ou bloqueio, conforme o ajuste); pagamento em dinheiro (atalhos de cédulas, troco em destaque e "Ouvir"), Pix (QR simulado e chave), débito, crédito (à vista ou parcelado, com a taxa da maquininha explicada), fiado (cliente, vencimento e alerta de bloqueio, atraso e limite) e dividido (barra do que falta; o dinheiro acima do que falta vira troco); venda concluída com recibo pelo WhatsApp (`lib/whatsapp.js`, `features/sales/receipt.js`) e "Desfazer" no aviso; `/vendas` agrupado por dia, com filtros na URL e busca; `/vendas/:id` com cancelamento por motivo. Testes: reducer do carrinho, recibo, link do WhatsApp e integração (dinheiro com troco, desfazer, dividida, fiado, cliente bloqueado, histórico e cancelamento estornando o estoque).

Decisões tomadas durante a fase:

- **Carrinho no `CartProvider`** (padrão de três arquivos, dentro do `RequireAuth`): a venda montada não se perde ao abrir outra tela. O reducer (`store/cart-reducer.js`) guarda só a escolha do vendedor; nome, preço e estoque vêm sempre do produto atual, e os totais de `calcSaleTotals`.
- **Etapas na URL**: `/vender?etapa=pagamento` e `/vender?venda=<id>`, para o "voltar" do celular voltar uma etapa. A venda desfeita some do histórico, e a tela concluída volta sozinha para os produtos, com os itens de volta no carrinho (só se nenhuma venda nova começou).
- **Um só "Desfazer" da venda**, no aviso (5 s, `UNDO_WINDOW_MS`): ele continua valendo depois de tocar em "Nova venda". Um botão repetido na tela concluída confundia e cobria o troco junto com o aviso.
- **Duas colunas a partir de 64rem** (`useMediaQuery`, porque muda a estrutura): produtos | carrinho e pagamento | resumo. Abaixo disso, a barra fixa do carrinho (`--cart-bar-height`) e o carrinho numa janela de baixo.
- **Botão de concluir no fluxo, não fixo**: com texto grande, um botão fixo cobria o teclado numérico.
- **Cores dos cards de produto** viraram tokens (`--product-<cor>`), um por chave de `PRODUCT_COLORS`; a Fase 7 reaproveita o `ProductTile` na prévia do formulário.
- **Correções no design system** encontradas aqui: o `Dialog` não rolava o corpo (o rodapé saía da tela), o aviso espremia o texto até quebrar palavras e o `MoneyInput` cortava o valor com texto grande (agora limitado pela largura com `cqi`).

Plano original da fase:

PDV (grade, busca, categorias e valor avulso), carrinho (quantidade, desconto e observação), pagamento (todas as formas, dividido e troco com "Ouvir"), venda concluída (animação, recibo por WhatsApp e "Desfazer"), histórico, detalhe e cancelamento com motivo. Testes de integração: venda em dinheiro com troco, venda dividida e cancelamento estornando o estoque.

Notas da Fase 3 para esta fase: use `useSales().createSale` e trate `ApiError` (`error.message` já é o texto da tela, e `error.codes` traz todos os problemas). Antes de cobrar, mostre o aviso de estoque com `findStockShortages` e o de fiado com `fiadoAlerts`; o serviço só recusa a falta de estoque quando o bloqueio está ligado. O aviso de "Desfazer" deve usar `duration: UNDO_WINDOW_MS`, porque o `ToastProvider` usa 8 s por padrão em avisos com ação.

### ✅ Fase 6: Fiado e clientes

Entregue: `/fiado` ("Quem me deve") com indicadores (para receber, atrasado, clientes atrasados e % de inadimplência), filtros de situação na URL (atrasados, vencem logo, em dia), ordem "quem está mais atrasado" ou "quem deve mais", busca e "Cobrar no WhatsApp" em cada linha; "Receber pagamento" pergunta quem está pagando (`CustomerPicker` com `onlyDebtors`) e abre a conta com `?receber=1`. `/fiado/:customerId` com o saldo em destaque, uso do limite, compras em aberto na ordem do FIFO, histórico de compras e recebimentos, receber pagamento (prévia do que cada valor quita, crédito usado e excedente que só vira crédito com o botão "Receber e guardar crédito" ou é corrigido por "Receber só o que deve"), "Desfazer" no aviso e no histórico, "Não vender fiado" com "Desfazer", editar, "Nova venda para…", arquivar com "Desfazer" e apagar com confirmação. `/clientes` com filtros (devendo, sem fiado, arquivados), busca por nome, apelido ou WhatsApp e cadastro/edição (`CustomerFormSheet`). Testes: regras novas, mensagem de cobrança, `formatPhone`, serviços e integração (ordem e filtros, link do WhatsApp, recebimento FIFO com desfazer, excedente como crédito, desfazer pelo histórico, bloqueio valendo na venda, cadastro com validação, edição, arquivar e apagar).

Decisões tomadas durante a fase:

- **Desfazer recebimento só no mesmo dia** (`validateUndoFiadoPayment`, código `prazo_desfazer_recebimento`), além de ser só o último do cliente: o recebimento já entrou no caixa, e o caixa de dias anteriores não deve mudar (Fase 8).
- **Cliente com crédito também não pode ser apagado** (`validateCustomerDeletion`, código `cliente_com_credito`): o crédito é dinheiro do cliente.
- **O excedente nunca vira crédito por engano**: o botão muda para "Receber e guardar crédito" e o aviso oferece "Receber só o que deve" (para quem vai dar troco). É a confirmação pedida pela regra 3.8, sem janela de "Tem certeza?".
- **Mensagem de cobrança em `features/fiado/charge.js`** (mesmo padrão do `receipt.js`), com o nome do negócio em negrito no topo (sem "Aqui é da...", que supõe gênero) e a chave Pix quando houver. Sem WhatsApp cadastrado, o botão de cobrar não aparece e a conta oferece "Cadastrar WhatsApp para cobrar".
- **A conta do cliente é também o detalhe do cliente**: `/clientes` leva para `/fiado/:id` com `state.from`, e o "Voltar" volta para a lista de origem.
- **Indicadores somam o que está em aberto** (`fiadoIndicators`); a linha de cada cliente mostra o saldo já descontado o crédito. Para não parecer conta errada, a lista não mostra um total próprio.
- **Ordem da lista num `Select`**: o `SegmentedControl` não quebra linha e passava da tela com texto Enorme.
- **`normalizeSearch`** (`lib/text.js`) substituiu as cópias de `normalize` nas buscas.
- **Prazos maiores nos testes** (`testTimeout` de 20 s e `asyncUtilTimeout` de 5 s): com a máquina lenta, a suíte de integração estourava o tempo sem nenhum erro de código.
- **Correção no design system**: o recuo lateral do `Button` `hero` virou `clamp(var(--space-3), 4vw, var(--space-8))`; com texto Enorme a 360px, o recuo fixo deixava o botão mais largo que a tela.

Plano original da fase:

"Quem me deve" (ordenado por urgência, totais e filtros), conta do cliente, receber pagamento (FIFO), limite e bloqueio com alerta na venda, cobrança por WhatsApp (`lib/whatsapp.js`) e CRUD simulado de clientes.

### ✅ Fase 7: Estoque

Entregue: `/estoque` com indicadores (precisa repor e valor parado no estoque, pelo custo), o que acabou e o que está acabando primeiro, filtros de situação (acabando, acabou, sem controle, fora da venda) e de categoria na URL, busca por nome ou código e "Entrada" em cada linha. `/estoque/novo` e `/estoque/:productId` com o formulário (nome, categoria, emoji sugerido pela categoria, cor do card, unidade, preço, custo, controle de estoque, quantidade inicial, aviso de "acabando", código e "À venda"), a prévia viva do `ProductTile` e o lucro por unidade com o alerta de "vendendo no prejuízo"; na edição, quanto tem agora, entrada de mercadoria (com custo), contagem (ajuste) e perda com motivo, todas com prévia ("16 un → 14 un") e "Desfazer", e o histórico de movimentações com link para a venda. Novo componente `QuantityInput` no design system. Testes: regras novas, `QuantityInput`, `formatQuantity`, serviço de desfazer e integração (ordem e filtros, entrada rápida com desfazer, cadastro com validação, prévia, prejuízo e estoque inicial, perda com motivo, contagem e histórico, tirar da venda).

Decisões tomadas durante a fase:

- **Quantidade no teclado próprio** (`QuantityInput` + `parseQuantityFromDigits`), como o dinheiro: sem vírgula, com 3 casas em kg e litro. O `QuantityStepper` continua no carrinho, onde o comum é somar de um em um.
- **"Desfazer" de movimentação por 5 segundos** (`validateUndoMovement`, `revertMovement`, `undoStockMovement`), só para a última do produto: igual à venda, a movimentação some como se não tivesse existido. A entrada passou a guardar `previousCostCents` para o custo também voltar. Depois do prazo, o histórico é imutável.
- **Custo zerado é "não sei"**: o formulário manda `null`, e a margem fica sem valor (o lucro seria enganoso).
- **Uma ação principal por tela**: na edição, "Salvar alterações" é a principal; entrada, contagem e perda são secundárias.
- **Emoji sugerido pela categoria** enquanto a pessoa não escolhe um, 12 sugestões com "Ver mais emojis" (com texto Enorme, a grade inteira virava 18 linhas) e "Outro emoji" para o teclado do celular.
- **Prévia no topo no celular e fixa à direita no computador**; o `ProductTile` fica `inert` (na prévia, não é botão).
- **Linha do produto como a do devedor**: link (emoji, nome, preço) em cima e rodapé com quantidade, situação e "Entrada", para a seta não cair sozinha numa linha no celular.

Plano original da fase:

Lista com filtros e situação, formulário com prévia do card (emoji, cor e margem), entrada rápida de mercadoria, ajuste e perda, e histórico de movimentações.

### ✅ Fase 8: Caixa e despesas

Entregue: `/caixa` com o selo da situação (aberto desde, fechado às, ainda não aberto), indicadores (vendido, entrou, vendido fiado e despesas), "Abrir o caixa" com o troco inicial no teclado próprio (o padrão vem dos Ajustes) e "Mudar" o troco inicial; o cartão "Dinheiro na gaveta" com o valor esperado, uma frase em linguagem simples e a conta linha a linha (troco inicial + vendas em dinheiro + fiado recebido em dinheiro − despesas da gaveta); "O que entrou" por forma de pagamento, com o fiado à parte como "vendido a receber" e os recebimentos de fiado; despesas com categoria, valor, "de onde saiu o dinheiro" e descrição, o lembrete da regra 6.3 ao escolher "Mercadoria", e "Desfazer" ao lançar e ao apagar; "Fechar o dia" com a contagem e o resultado ao vivo ("Sobrou", "Faltou", "Bateu certinho"), "Desfazer" no aviso e "Reabrir o dia"; "Dias anteriores" com o vendido e o resultado do fechamento, abrindo cada dia em `/caixa?dia=AAAA-MM-DD` (só para ver, com "Voltar para hoje"). Testes: regras novas, serviço (despesa devolvida e dia fechado) e integração (abrir, corrigir o troco inicial, lançar e desfazer, apagar e desfazer, fechar e reabrir, consultar um dia anterior).

Decisões tomadas durante a fase:

- **Dia fechado não muda despesas** (`validateCashDayChange`, código `caixa_fechado`): a gaveta já foi conferida. Para corrigir, reabra o dia. Despesas só são lançadas hoje (o serviço usa a hora atual).
- **"Desfazer" de apagar devolve a mesma despesa** (`restoreExpense`, `PUT /expenses/:id`), com o mesmo id e horário, em vez de criar outra.
- **Fechar tem "Desfazer"** no aviso (reabre o dia), além do botão "Reabrir o dia"; nada pede "Tem certeza?".
- **"Entrou" no resumo do dia** (`receivedCents` em `summarizeCashDay`) usa a fórmula do "Recebido" da regra 7, para a tela não refazer a conta.
- **Explicação visível, não escondida**: o dinheiro esperado tem uma frase e a conta linha a linha no próprio cartão; um `HelpTip` no cabeçalho espremia o título com texto Enorme.
- **Resultado da contagem acima do teclado**: no celular, abaixo dele, o "Sobrou/Faltou" ficava fora da tela.
- **Se o esperado mudar depois de fechar** (venda nova, fiado recebido), o cartão avisa e sugere reabrir, sem mexer no fechamento guardado.
- **Dias anteriores numa lista com link**, e não num seletor: cada linha já mostra o vendido e se sobrou ou faltou; "Ver mais dias" mostra mais 7 por vez.

Plano original da fase:

Caixa do dia (troco inicial, entradas por forma de pagamento, recebimentos de fiado), despesas, fechar o dia com conferência e reabertura.

### ✅ Fase 9: Dashboard

Entregue:

- **`/inicio`:**
  - "Hoje você vendeu R$ X" em destaque, com "Vender" como a ação principal.
  - "Precisa de atenção": fiado atrasado e vencendo logo, produtos que acabaram e que estão acabando, cada um com link para a lista já filtrada.
  - Período na URL (`?periodo=hoje|7dias|este_mes`), que vale para tudo abaixo dele.
  - Indicadores (vendido, recebido, lucro estimado e média por venda) com a diferença em reais para o período anterior.
  - "Quanto você vendeu nos últimos 7 dias" (ou em cada dia do mês), "Como os clientes pagaram" (rosca) e "Mais vendidos".
  - Atalhos, e o estado vazio que ensina a fazer a primeira venda.
- **Componentes:** wrappers em `src/components/charts/` (`ChartCard`, `ColumnChart`, `DonutChart`, `RankedBars`, `ChartTooltip`), com exemplos em `/design-system#graficos`.
- **Testes:** regra nova, textos da comparação, formatadores e integração (destaque, avisos com links, troca de período, tabela dos gráficos e estado vazio).

Decisões tomadas durante a fase:

- **Hoje × ontem até esta hora** (`compareWithPrevious(input, { now })`): às 8h, comparar com o dia inteiro de ontem deixava tudo vermelho. Quando o período termina hoje, o último dia do período anterior é cortado na mesma hora.
- **Diferença em reais, não em %** ("R$ 12,00 a mais"), com a base escrita uma vez acima dos cartões ("Comparando com ontem até esta hora"). O lucro passando de positivo para negativo dava "1.935,9% a menos".
- **"Recebido" comparado também** (`received` em `compareWithPrevious`), para a tela não refazer a conta.
- **Ordem fixa da rosca** (`PAYMENT_RING_ORDER`): com 5 formas, nenhuma paleta passa no validador da skill `dataviz` em todos os pares. Pix ↔ débito e crédito ↔ fiado são os pares parecidos, e eles nunca ficam vizinhos. A legenda escreve nome, valor e % de cada fatia.
- **Mais vendidos em HTML** (`RankedBars`), e não em barras deitadas do Recharts: nomes longos com texto Enorme espremiam o gráfico.
- **Gráfico escondido do leitor de tela, tabela em "Ver os números"**. A camada de teclado do Recharts fica desligada, para não haver foco dentro de algo escondido.
- **Um período para tudo**: as fichas de período ficam acima dos indicadores e dos gráficos (regra da skill `dataviz`). Em "Hoje", o gráfico de colunas mostra os 7 dias, com "hoje" no eixo.

Plano original da fase:

Cards (StatCard), gráficos Recharts (vendas dos 7 dias, rosca por forma de pagamento, mais vendidos), avisos (fiados vencendo ou atrasados, estoque acabando) e atalhos. **Carregar a skill `dataviz` antes de escrever os gráficos.** Usar a paleta `--chart-*` já validada, com uma cor fixa por entidade, tabela alternativa e nenhum eixo duplo.

### ✅ Fase 10: Relatórios

Entregue:

- **`/relatorios`** com filtros na barra de endereço (`?tipo=`, `?periodo=` e, em "Escolher datas", `?de=&ate=`): o tipo (`REPORT_TYPES`) em fichas e o período (`PERIOD_PRESETS`, "Este mês" por padrão) em fichas com duas datas no "Escolher datas". Fiado e estoque são uma foto de agora e escondem o período.
- **Prévia de cada tipo** (`ReportPreview`): indicadores (`StatCard`), gráficos de `components/charts` com o valor escrito e a tabela (rosca das formas, colunas por dia, ranking dos mais vendidos e das despesas por tipo) e as tabelas do relatório (`ReportTable`), que viram blocos "rótulo: valor" no celular e mostram 10 linhas com "Ver todas".
- **Levar o relatório**: "Baixar para o Excel" (a ação principal, `lib/csv.js`), "Imprimir ou salvar em PDF" (`window.print()` + `styles/print.css`, com o cabeçalho do negócio, o período e quando foi feito) e "Enviar resumo" (`lib/share.js`: menu de compartilhar do aparelho ou, sem ele, "Enviar resumo no WhatsApp").
- **Estados**: carregando (esqueleto na primeira vez; depois, o relatório anterior apagado até o novo chegar), erro com "Tentar de novo" e vazio que ensina o próximo passo (e desliga as exportações).
- **Regras novas**: `customPeriod` (datas trocadas, nada depois de hoje) e `expensesByCategory`. O `getReport` passou a devolver as linhas prontas para a tabela (nome do cliente na venda, fechamento de cada dia, valor parado de cada produto) e a comparação do resumo cortada na hora de agora.
- **Testes**: regras novas, `formatPeriod`, `lib/csv.js` (formatos, aspas, fórmulas, BOM e download), `lib/share.js` e integração (resumo com os números das regras, filtros na URL, "Escolher datas", fiado sem período, planilha com BOM e cabeçalho, impressão e WhatsApp, erro com "Tentar de novo" e vazio).

Decisões tomadas durante a fase:

- **As mesmas tabelas para a tela, a planilha e o PDF** (`features/reports/reportTables.js`): cada coluna tem o tipo (`money`, `date`, `percent`...) e o valor cru; `lib/csv.js` formata para o Excel e `formatReportCell` para a tela. Assim os três sempre batem.
- **"Este mês" é o período padrão**: relatório é para fechar as contas; o dia a dia já está no Início.
- **Planilha (CSV) é a ação principal**; PDF e WhatsApp são secundárias. Sem nada no relatório, as três ficam desligadas, com o motivo escrito.
- **Tabela vira lista no celular** (container query de 40rem, só na tela): com 8 colunas, a rolagem para o lado seria difícil para o público. No papel, a tabela fica sempre em colunas e com todas as linhas.
- **Gráficos de relatório sem animação** (`animate={false}`) e encolhidos pelo `viewBox` na impressão: o Recharts só mede de novo depois que a folha já foi desenhada.
- **Proteção contra fórmula no Excel**: textos que começam com `=`, `+`, `-` ou `@` (um nome de cliente, por exemplo) ganham um apóstrofo.
- **Correção no design system**: no `ChipGroup` com `wrap`, um chip mais largo que a tela ("Produtos mais vendidos" com texto Enorme) quebra o próprio texto em vez de alargar a página.
- **`npm run shot` imprime**: `--media print` emula a impressão e um nome terminado em `.pdf` salva o PDF da folha A4.

Plano original da fase:

Filtros de período e tipo, prévia, CSV (`lib/csv.js`), PDF (`styles/print.css` + `window.print()`) e compartilhamento (`lib/share.js`).

### ✅ Fase 11: Ajustes, acessibilidade, ajuda e tour

Entregue:

- **`/ajustes`** em cartões: seu negócio (nome e WhatsApp), chave Pix, formas de pagamento (chaves, com a última travada), taxas da maquininha (teclado próprio, com o exemplo numa venda de R$ 100,00), prazo do fiado (7 a 60 dias), "Não vender o que acabou", troco inicial padrão, aparência e acessibilidade (cores da tela, tamanho do texto com amostra, vibrar e botões "Ouvir"), modo demonstração (internet lenta e falha, via `configureApi`) e "Restaurar dados de exemplo" (com confirmação). Estados carregando e erro com "Tentar de novo". Duas colunas a partir de 75rem.
- **`/ajuda`**: "Ver o passo a passo de novo" (a ação principal), atalhos por assunto e 14 perguntas frequentes em `<details>`, cada uma com o caminho para a tela.
- **Tour de primeiro uso** (`features/help/components/Tour.jsx`): 5 passos curtos numa janela, com "Pular", "Voltar" e "Passo 2 de 5". Abre no Início ao terminar as boas-vindas e pela Ajuda.
- **Componente novo** `PercentInput` (porcentagem no teclado próprio, sem vírgula), com exemplo em `/design-system#valores`.
- **Regras novas**: `validateSettings` passou a conferir taxas, prazo do fiado e troco inicial; `validateBusiness`, `canDisablePaymentMethod` e `parsePercentFromDigits`/`percentDigits`. O `updateBusiness` valida e guarda o WhatsApp só com os dígitos.
- **"Ouvir" desligado esconde os botões**: `useSpeech` lê `preferences.speech` (antes a preferência não tinha efeito).
- **Testes**: regras novas, `PercentInput`, `formatRate` e integração (forma de pagamento com "Desfazer", última forma travada, taxa pelo teclado, nome obrigatório, prazo, estoque e troco, falha voltando a tela, acessibilidade, modo demonstração, restaurar com confirmação, erro ao carregar; Ajuda, tour passo a passo e tour ao fim das boas-vindas).

Decisões tomadas durante a fase:

- **Sem botão "Salvar" na tela**: chaves e fichas salvam ao tocar (atualização otimista) e os valores abrem uma janela com a própria ação principal. Cada alteração tem "Desfazer" no aviso (`useSaveSettings` grava de volta os valores de antes); só restaurar os dados de exemplo pede confirmação.
- **Aparência é do aparelho, ajustes são do negócio**: tema, texto, vibração e "Ouvir" ficam no `PreferencesProvider` e não passam pelo serviço; o cartão diz "Valem só para este aparelho".
- **Fichas, e não `SegmentedControl`, para tema e tamanho do texto**: com texto Enorme o controle segmentado não quebra linha.
- **Tour numa janela, sem "holofote" nos menus**: funciona igual no celular e no computador, com teclado e leitor de tela, e cita o nome de cada menu em negrito. Fica no estado da navegação (`state.tour` no Início), não num contexto: fechar troca a entrada do histórico, e o "voltar" não o reabre.
- **Tour só para quem acabou de criar a conta**: a conta de demonstração já tem 90 dias de uso; quem quiser vê o tour pela Ajuda.
- **Modo demonstração sem aviso global**: as próprias telas mostram o erro com "Tentar de novo", que é o que o modo quer mostrar; desligar fica nos Ajustes, que não precisam da internet para isso.
- **Linha da taxa empilha em cartão estreito** (container query de 15rem): com texto Enorme, "Mudar" cobria o nome da taxa.

Plano original da fase:

Dados do negócio, chave Pix, formas e taxas, regras de estoque e de fiado, acessibilidade (tema, tamanho do texto, vibração e "Ouvir"), modo demonstração (lentidão e erro) e restaurar dados; FAQ em linguagem simples; tour de primeiro uso.

### Fase 12: Polimento

Animações, estados vazio, carregando e erro em todas as telas, auditoria de acessibilidade (axe/Lighthouse ≥ 95), revisão dos textos, PWA básico (manifest para "instalar na tela inicial"), testes dos fluxos principais e capturas de tela no README.

## 9. Verificação (toda fase)

1. `npm run lint && npm test && npm run build` sem erros, e `npm run format:check`.
2. Verificação visual com `npm run dev` + `npm run shot` (skill `verificacao-visual`): 360px e 1440px, claro e escuro, alto contraste com texto a 150% e ausência de rolagem horizontal (`--eval "document.documentElement.scrollWidth"` deve ser igual à largura).
3. Fluxo manual de ponta a ponta a partir da Fase 5: login demo → venda em dinheiro, Pix, fiado e dividida → desfazer → receber fiado parcial → entrada de estoque → fechar o dia → dashboard refletindo tudo → exportar CSV e imprimir PDF.
4. Recarregar a página volta aos dados de exemplo (comportamento esperado).
