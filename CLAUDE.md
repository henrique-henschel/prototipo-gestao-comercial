# CLAUDE.md

Guia de contexto para agentes e desenvolvedores que trabalham neste repositório.

## O que é

**Caderneta** (nome provisório, definido em `src/app/config.js`) é o **protótipo front-end de alta fidelidade** de um SaaS de gestão comercial para **pequenos negócios e vendedores ambulantes**: registrar vendas, receber por várias formas de pagamento (inclusive **fiado**, com controle de inadimplência), gerenciar estoque, acompanhar o faturamento, ver dashboards e exportar relatórios.

- **Somente front-end** (React 19 + JavaScript/JSX). Não há back-end, API real nem persistência.
- **O estado vive só em memória**: recarregar a página volta aos dados de exemplo. Isso é intencional. Não adicione `localStorage`/IndexedDB para dados de negócio.
- Este código é a **base definitiva** que uma empresa vai evoluir até o SaaS real. Qualidade, clareza e contratos explícitos importam mais que atalhos.
- **Público-alvo**: pessoas com baixa escolaridade e pouca familiaridade com tecnologia. Toda decisão de UI passa pelo checklist de UX abaixo.

O plano mestre, com o detalhamento de cada fase, está em **`docs/plano-de-implementacao.md`**. Para retomar o trabalho, leia este arquivo, o plano e o documento citado na fase atual.

**Todo o contexto do projeto vive no repositório.** Não use memória persistente do agente. Decisões, convenções e lições novas vão para este arquivo ou para `docs/`.

## Comandos

```bash
npm install          # Node >= 22
npm run dev          # servidor de desenvolvimento (http://localhost:5173)
npm run build        # build de produção em dist/
npm run preview      # serve o build
npm test             # Vitest (uma execução)
npm run test:watch   # Vitest em modo watch
npm run lint         # ESLint (react, react-hooks, jsx-a11y)
npm run format       # Prettier (format:check só verifica)
npm run shot -- <arquivo.png> [rota] [--width 360] [--theme dark] [--full] [--eval "js"]
```

Antes de considerar uma tarefa concluída: `npm run lint && npm test && npm run build && npm run format:check` sem erros, mais a verificação visual (skill `verificacao-visual`).

## Verificação visual

Toda mudança de interface é conferida em imagem, não só nos testes: use a skill `verificacao-visual` (`.claude/skills/verificacao-visual/SKILL.md`), que explica o `npm run shot`, as telas logadas, o alto contraste e o texto Enorme. Mínimo por tela: 360px e 1440px, claro e escuro, e sem rolagem horizontal.

## Stack

Vite 8 · React 19 · React Router 8 (`react-router`, modo biblioteca com `createBrowserRouter`) · CSS puro (CSS Modules + `@layer`) · Recharts · lucide-react · Atkinson Hyperlegible (`@fontsource`) · qrcode.react · Vitest + Testing Library · ESLint 9 (flat config) · Prettier.

**Sem Tailwind e sem bibliotecas de componentes/CSS-in-JS.** O design system é feito à mão com CSS moderno.

## Convenções de código

- Primitivos de UI sempre pelo índice: `import { Button, MoneyInput } from '@/components/ui';`. O catálogo vivo de todos eles fica em `/design-system` (`src/features/design-system/`). Componente novo em `ui/` entra no índice **e** ganha exemplo no catálogo.
- Contextos seguem três arquivos (exigência do Fast Refresh, que não aceita componente e não-componente no mesmo módulo): `store/x-context.js` (createContext + tipos), `store/XProvider.jsx` (estado) e `hooks/useX.js` (consumo). Exemplos: `ToastProvider`/`useToast`, `PreferencesProvider`/`usePreferences` e `CartProvider`/`useCart`.

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
- **Nenhum valor mágico**: cores, espaçamentos, raios, sombras, fontes e durações vêm dos tokens (`var(--...)`) definidos em `styles/tokens.css`.
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

## Lições aprendidas (armadilhas já encontradas)

- **Grid com conteúdo rolável:** use `grid-template-columns: minmax(0, 1fr)` (e `min-inline-size: 0` nos itens). Com `auto`/`1fr`, uma faixa com `overflow-x: auto` (chips, navegação) alarga a coluna e cria rolagem horizontal na página.
- **`position: absolute` dentro de contêiner com rolagem:** o elemento precisa de um ancestral posicionado _dentro_ do contêiner. Exemplo: o rádio `.visually-hidden` do `SegmentedControl` vazava e alargava a página até a opção receber `position: relative`.
- **`::backdrop` também existe em popovers.** Estilize só `dialog::backdrop`. Um `::backdrop` global escureceu a página inteira por causa do popover dos avisos.
- **Avisos por cima de modais:** o `Toaster` é `popover="manual"` e é reaberto quando há um `dialog:modal` aberto, para voltar ao topo da camada superior.
- **Escapes Unicode em código:** as ferramentas de edição podem converter ` ` em um espaço inseparável literal (o ESLint acusa `no-irregular-whitespace`). Prefira classes como `\s` ou confira os bytes (`od -c`).
- **Mais escapes que viram caracteres:** o mesmo acontece com `\uFEFF` (o BOM do `lib/csv.js`) e com `\r\n` dentro de strings. Num script Python, monte-os com `chr(92)` e confira com `grep -n FEFF`.
- **Python no Windows grava CRLF:** `open(p, "w")` troca as quebras de linha por CRLF. Use `newline="\n"` (ou `write_bytes`) ao editar arquivos do repositório por script.
- **`!important` em camadas inverte a ordem:** declarações importantes de camadas _anteriores_ vencem as posteriores. O reset força durações mínimas com `prefers-reduced-motion`, então temporizadores não podem depender de `animationend` (o `Toaster` usa `setTimeout`).
- **Ícones do lucide-react 1.x:** confira o nome em `node_modules/lucide-react/dist/lucide-react.d.ts` antes de importar (ex.: `CircleQuestionMark`, `Trash`).
- **Fast Refresh:** um arquivo `.jsx` exporta apenas componentes. Contextos, constantes e hooks ficam em arquivos `.js` separados.
- **Atkinson Hyperlegible tem o zero cortado** ("Ø"). É proposital, para distinguir 0 de O, e não é bug.
- **Line endings:** `.gitattributes` força LF, porque o Git do Windows convertia para CRLF e quebrava o `prettier --check`.
- **Refs nas ações do store:** o lint do React Compiler (`react-hooks/refs`) recusa passar uma ref a uma função durante a renderização, mesmo que ela só seja lida depois. Por isso as ações de dados dependem só de `dispatch`, e o rollback das atualizações otimistas fica no próprio reducer (`pending`).
- **Dia civil × UTC:** registros guardam o instante em ISO (UTC), mas "dia" é sempre o dia civil local. Use `dateOf(iso)` (`lib/date.js`) para saber o dia de um instante; `iso.slice(0, 10)` devolve o dia em UTC e erra à noite no Brasil.
- **`overflow-wrap: anywhere` corta palavras:** ele também muda o tamanho mínimo do texto, então, com letra grande, "Vendas" virou "Venda / s". Use `overflow-wrap: break-word`.
- **`rem` em container query × media query:** em `@container`, `rem` segue o tamanho da raiz (cresce com `--font-scale`); em `@media`, `rem` é sempre 16px. Por isso o esqueleto troca de layout em 768px fixos, enquanto os componentes reagem ao texto grande.
- **Foco ao trocar de tela:** o `<main>` (`tabIndex={-1}`) recebe o foco, sem contorno. Nas boas-vindas, quem recebe o foco é a pergunta de cada passo.
- **Refs em objeto:** o lint do React Compiler acusa `ref={refs.email}` vindo de um objeto criado na renderização. Use uma `useRef` por campo.
- **`window.scrollTo` no jsdom:** não existe; o `ScrollRestoration` o chama a cada tela, e `src/test/setup.js` o substitui por uma função vazia.
- **Navegação do roteador é uma transição:** `setSearchParams`/`navigate` atualizam a tela depois das atualizações urgentes (mesmo com `await navigate`). Ao concluir a venda, esvaziar o carrinho renderizava o pagamento vazio, que redirecionava para os produtos. Não dependa da ordem: guarde o estado de que a tela precisa (o `justSold` da `SellPage`).
- **`<dialog>` e popover nos testes:** o jsdom não tem `showModal`; `src/test/setup.js` o substitui por alternar o atributo `open` (diálogos fechados ficam fora das consultas por papel). Os avisos ficam num popover que o jsdom não abre: procure as ações deles com `{ hidden: true }`.
- **`max-block-size: inherit` com porcentagem não se resolve** num filho de altura automática. A superfície do `Dialog` usa `--dialog-max-block` em `dvh`; sem isso o corpo não rola e o rodapé sai da tela.
- **Nome acessível com vários `<span>`:** o cálculo pode juntar os textos sem espaço. Nos testes, procure por parte do nome (`/Ver carrinho/`) e confira o resto com `toHaveTextContent`.
- **Nome acessível do `Switch`:** o `<label>` envolve o rótulo e a descrição, então o nome inclui os dois. Nos testes, procure por `{ name: /^Não vender fiado/ }`.
- **Título não é sinal de dados carregados:** as telas mostram o `PageHeader` também no estado "carregando". Nos testes, espere o conteúdo (a lista, o botão do formulário), não só o `h1`.
- **Listas de escolha com texto Enorme:** grades de opções em `rem` (emojis, cores) perdem colunas e ficam enormes. Mostre poucas opções e um "Ver mais".
- **Testes lentos ≠ código lento:** as telas são carregadas sob demanda e a suíte roda em paralelo; com o notebook na bateria, ela ficou 4–5× mais lenta e dezenas de testes estouraram o tempo (o commit anterior falhava igual). Por isso `testTimeout` é 20 s (`vite.config.js`) e `findBy`/`waitFor` esperam 5 s (`src/test/setup.js`). Antes de caçar regressão, compare com o último commit (`git worktree`) e rode em série (`--maxWorkers=1`).
- **Achar o que alarga a página:** quando `scrollWidth` passa da largura, ponha o contêiner suspeito em `width: min-content` no `--eval` e meça cada filho; `Range#getBoundingClientRect` engana porque inclui o texto escondido de `.visually-hidden`. Recuos em `rem` (como o do botão `hero`) crescem com o texto Enorme e são suspeitos comuns.
- **Nome acessível com texto visível:** quando um botão precisa de contexto para o leitor de tela ("Cobrar no WhatsApp" de quem?), acrescente um `<span className="visually-hidden">` em vez de `aria-label`, para o nome continuar começando pelo texto visível (WCAG 2.5.3).
- **Roteiro de fiado do seed:** pagamentos roteirizados abatem em FIFO tudo o que estiver aberto naquele dia, então um pagamento "tudo" depois de uma compra nova quita as duas. Ao mexer no `FIADO_SCRIPT`, confira o status final de cada cliente (o teste do seed exige todos os status).
- **Selo longo com texto Enorme:** o `StatusPill` tem `white-space: nowrap` (feito para selos curtos nas linhas). Um texto longo como "Caixa aberto desde 07:55" alargou a página a 360px; a tela do caixa deixa o selo quebrar linha (`.status > span`).
- **Resultado ao vivo acima do teclado:** numa janela com `MoneyInput` + teclado, o que reage ao valor digitado ("Sobrou R$ 3,00") vai acima do campo, com a altura reservada. Abaixo do teclado ele fica fora da tela no celular.
- **Dados de exemplo dependem do dia:** só o `FIADO_SCRIPT` é fixo; os outros clientes compram fiado por sorteio relativo a hoje. Nos testes, escolha o cliente pela condição (`accountBalance(...) === 0`), não por um nome fixo: o teste do "Receber pagamento" quebrou num dia em que a Luciana comprou fiado.
- **`npm run shot --full` reinicia gráficos:** a captura da página inteira redimensiona a janela, o `ResponsiveContainer` redesenha e a animação do Recharts recomeça, então barras e rosca saem vazias na imagem. Para ver gráficos, capture sem `--full`, rolando até eles com `scrollIntoView` e esperando ~2 s. (`fill="var(--chart-1)"` funciona nos atributos do SVG.)
- **"R$" separado do número:** `formatBRL` usa espaço comum, então o valor pode quebrar entre "R$" e o número num texto corrido. Quando isso acontecer, envolva o valor num `<span>` com `white-space: nowrap` (como nos avisos do Início).
- **BOM nos testes:** `Blob#text()` descarta o BOM ao ler; confira os primeiros bytes com `arrayBuffer()` (`EF BB BF`). O jsdom não tem `URL.createObjectURL`: atribua a função em `URL` e apague depois, porque `vi.stubGlobal('URL', ...)` quebra o roteador.
- **Recharts na impressão:** o gráfico fica dentro de um `<div>` de largura 0 (`overflow: visible`), então `max-inline-size: 100%` no `.recharts-wrapper` o zerava. O `print.css` dá 100% a esse `<div>` e encolhe o SVG pelo `viewBox`. Uma coluna `auto` com `min(…, 100%)` dentro também some no papel: a rosca tem tamanho fixo na impressão.
- **Container query × impressão:** a troca "tabela vira lista" fica dentro de `@media screen`; no papel (texto a 10pt), a mesma largura em `rem` disparava a lista.
- **Redirecionamento descarta o `state`:** ao concluir as boas-vindas, o `<Navigate>` da própria tela leva ao Início e trocaria qualquer `navigate(..., { state })` feito antes. Para abrir o tour, a tela guarda que acabou de concluir e passa o `state` no próprio `<Navigate>`.

## Estado atual e próximos passos

- **Concluído:** Fases 1 a 11: fundação, design system, domínio e dados, shell e navegação, vender, fiado e clientes, estoque, caixa e despesas, dashboard, relatórios e ajustes/ajuda/tour. Todas as telas do plano existem: vender (`/vender`, `/vendas`, `/vendas/:id`), fiado (`/fiado`, `/fiado/:customerId`), clientes, estoque (`/estoque`, `/estoque/novo`, `/estoque/:productId`), caixa (`/caixa?dia=`), Início (`/inicio?periodo=`), relatórios (`/relatorios?tipo=&periodo=&de=&ate=`), ajustes (`/ajustes`) e ajuda (`/ajuda`), com o tour de primeiro uso no Início (`state.tour`).
- **Próxima:** Fase 12 (Polimento): animações, revisão dos estados vazio/carregando/erro em todas as telas, auditoria de acessibilidade (axe/Lighthouse ≥ 95), revisão dos textos, PWA básico (manifest), testes dos fluxos principais e capturas de tela no README. O componente `ComingSoon` já não é usado por nenhuma tela e pode sair.
- Ao concluir cada fase: atualize esta seção, o status em `docs/plano-de-implementacao.md` e o Roadmap do `README.md`, e faça **um commit por fase**.

## Documentação relacionada

- `docs/plano-de-implementacao.md`: plano mestre, status e detalhamento das fases.
- `README.md`: visão geral, como rodar, roadmap e guia de integração com back-end.
- `docs/regras-de-negocio.md`: regras detalhadas (vendas, pagamentos, fiado, estoque, caixa, relatórios).
- `docs/design-system.md`: princípios visuais, tokens e componentes.
