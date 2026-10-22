# CLAUDE.md

Guia de contexto para agentes e desenvolvedores que trabalham neste repositório.

## O que é

**Caderneta** (nome provisório, definido em `src/app/config.js`) é o **protótipo front-end de alta fidelidade** de um SaaS de gestão comercial para **pequenos negócios e vendedores ambulantes**: registrar vendas, receber por várias formas de pagamento (inclusive **fiado**, com controle de inadimplência), gerenciar estoque, acompanhar o faturamento, ver dashboards e exportar relatórios.

- **Somente front-end** (React 19 + JavaScript/JSX). Não há back-end, API real nem persistência.
- **O estado vive só em memória**: recarregar a página volta aos dados de exemplo. Isso é intencional. Não adicione `localStorage`/IndexedDB para dados de negócio.
- Este código é a **base definitiva** que uma empresa vai evoluir até o SaaS real. Qualidade, clareza e contratos explícitos importam mais que atalhos.
- **Público-alvo**: pessoas com baixa escolaridade e pouca familiaridade com tecnologia. Toda decisão de UI passa pelo checklist de UX abaixo.

As fases de entrega e o status de cada uma estão no `README.md` (seção Roadmap). Atualize o status ao concluir uma fase.

## Comandos

```bash
npm install          # Node >= 20
npm run dev          # servidor de desenvolvimento (http://localhost:5173)
npm run build        # build de produção em dist/
npm run preview      # serve o build
npm test             # Vitest (uma execução)
npm run test:watch   # Vitest em modo watch
npm run lint         # ESLint (react, react-hooks, jsx-a11y)
npm run format       # Prettier
```

Antes de considerar uma tarefa concluída: `npm run lint && npm test && npm run build` sem erros.

## Stack

Vite 8 · React 19 · React Router 8 (`react-router`, modo biblioteca com `createBrowserRouter`) · CSS puro (CSS Modules + `@layer`) · Recharts · lucide-react · Atkinson Hyperlegible (`@fontsource`) · qrcode.react · Vitest + Testing Library · ESLint 9 (flat config) · Prettier.

**Sem Tailwind e sem bibliotecas de componentes/CSS-in-JS.** O design system é feito à mão com CSS moderno.

## Estrutura

```
src/
  app/           config.js (nome, locale), router, providers, constantes de rota
  styles/        index.css (ordem dos @layer), reset, tokens, base, utilities, animations, print
  components/
    ui/          primitivos do design system (Button, MoneyInput, NumericKeypad, Dialog, Toast...)
    layout/      AppShell, Sidebar, BottomNav, TopBar, PageHeader
    charts/      wrappers do Recharts estilizados pelos tokens
  features/      uma pasta por área: auth, dashboard, sales, fiado, customers, inventory,
                 cash, reports, settings, help, design-system (pages/, components/, *.module.css)
  domain/
    models.js    @typedef JSDoc de todas as entidades (contrato com o back-end futuro)
    constants.js formas de pagamento, status, unidades, categorias
    rules/       regras de negócio PURAS e testadas (money, sales, payments, fiado, stock, metrics)
  mocks/         seed.js (dados determinísticos relativos a "hoje"), db.js (banco em memória)
  services/      *.service.js — funções async sobre o db com latência simulada
  store/         Context + useReducer (DataProvider, Session, Preferences, Toast)
  hooks/         hooks reutilizáveis (useMediaQuery, useUndo, useSpeech...)
  lib/           format (Intl pt-BR), csv, whatsapp, share, id, viewTransition
  test/          setup do Vitest
docs/            regras-de-negocio.md, design-system.md
```

O import com alias `@/` aponta para `src/` (ex.: `import { APP_NAME } from '@/app/config.js'`).

## Regras de arquitetura (obrigatórias)

1. **Regra de negócio só em `src/domain/rules/`**, como funções puras com testes. Componentes e serviços chamam essas funções e nunca recalculam regra por conta própria (troco, status de fiado, margem, lucro...).
2. **Dados só via `src/services/`.** Componentes nunca importam `mocks/` diretamente. Cada serviço é `async` e tem a assinatura que a API REST futura terá, documentada em JSDoc. **Este é o único ponto a trocar quando o back-end existir.**
3. **Dinheiro sempre em centavos inteiros** (`number` inteiro). Converter só na borda (entrada do usuário e exibição) com `domain/rules/money.js`. Nunca somar valores em reais com ponto flutuante.
4. **Datas** guardadas como string ISO 8601; formatação sempre via `lib/format.js` (Intl, `pt-BR`).
5. **Textos da interface em pt-BR**, linguagem simples e do dia a dia ("Quem me deve", "Troco", "Mercadoria acabando"). Código (variáveis, funções, arquivos) em inglês, exceto nomes de rotas e textos visíveis.
6. Modelos novos ou alterados → atualizar `domain/models.js` **e** `docs/regras-de-negocio.md`.
7. Dados de exemplo gerados com PRNG de semente fixa e datas relativas a hoje, para dashboards sempre "vivos" e testes estáveis.

## Convenções de CSS

- Ordem das camadas declarada em `src/styles/index.css`: `reset, tokens, base, components, utilities, overrides`. Todo `*.module.css` envolve suas regras em `@layer components { ... }`.
- **Nenhum valor mágico**: cores, espaçamentos, raios, sombras, fontes e durações vêm dos tokens (`var(--...)`) definidos em `styles/tokens.css`. (Na Fase 1 ainda há literais provisórios em `base.css`/`App.module.css`.)
- Cores em `oklch()`; variações com `color-mix()`; temas com `light-dark()` + `[data-theme]` (claro, escuro, alto contraste).
- Mobile-first (a partir de 360px), sem rolagem horizontal. Preferir **container queries** para componentes e media queries só para o layout da página.
- Usar CSS moderno com intenção: nesting nativo, `:has()`, `@starting-style`, View Transitions, `scroll-snap`, propriedades lógicas (`inline-size`, `margin-inline`...), `@property`.
- Um componente = `Componente.jsx` + `Componente.module.css` na mesma pasta; classes em camelCase.
- Toda animação respeita `prefers-reduced-motion` (já tratado no reset).

## Checklist de UX e acessibilidade

- [ ] Ícone **sempre acompanhado de texto** (ícone sozinho só com `aria-label` e em ações secundárias óbvias, como fechar).
- [ ] Alvos de toque ≥ 48px; ação principal da tela 56–64px; **uma ação principal por tela**.
- [ ] Texto base 18px, escalável por `--font-scale`; valores em dinheiro grandes com `font-variant-numeric: tabular-nums`.
- [ ] Valores digitados no teclado numérico próprio (`NumericKeypad`/`MoneyInput`), nunca campo livre com vírgula.
- [ ] **Desfazer** em vez de "Tem certeza?"; confirmação só para ações destrutivas e irreversíveis.
- [ ] Significado nunca só pela cor: verde = ok/entrou dinheiro, âmbar = atenção/fiado, vermelho = atrasado/acabou, azul = informação, sempre com ícone + texto.
- [ ] Estados de **vazio** (que ensinam o próximo passo), **carregando** (skeleton) e **erro** (com "Tentar de novo") em toda tela com dados.
- [ ] `aria-live` para mudanças importantes (total do carrinho, troco, toasts).
- [ ] Contraste WCAG 2.2 AA, foco visível, navegação completa por teclado, landmarks e skip link, `<dialog>` nativo com foco gerenciado.

## Definição de pronto (por tela)

Responsiva de 360px a desktop · tema claro, escuro e alto contraste · texto a 150% sem quebrar · operável só por teclado · estados vazio/carregando/erro · textos revisados em linguagem simples · `npm run lint && npm test && npm run build` passando.

## Documentação relacionada

- `README.md`: visão geral, como rodar, roadmap e guia de integração com back-end.
- `docs/regras-de-negocio.md`: regras detalhadas (vendas, pagamentos, fiado, estoque, caixa, relatórios).
- `docs/design-system.md`: princípios visuais, tokens e componentes.
