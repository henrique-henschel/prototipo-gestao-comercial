# Design system

Referência visual e de interação da Caderneta. A versão viva, com todos os componentes renderizados e interativos, fica na rota pública `/design-system` (também há um link no fim da tela "Mais").

> Mantenha este documento sincronizado com `src/styles/tokens.css` e `src/components/ui/`.

## Princípios

1. **Entendível antes de bonito, e bonito também.** Quem usa pode ter pouca leitura e pouca prática com celular. Cada tela precisa ser compreendida em poucos segundos.
2. **Uma ação principal por tela**, grande e na zona do polegar (parte de baixo, no celular).
3. **Ícone + texto, sempre.** Palavras do dia a dia, frases curtas, sem jargão ("Quem me deve", não "Contas a receber").
4. **Números são protagonistas.** Valores em dinheiro grandes, legíveis e alinhados.
5. **Errar é barato.** "Desfazer" em vez de confirmações; mensagens de erro que dizem o que fazer.
6. **Completo sem ser poluído.** Recursos avançados ficam um toque adiante (menu "Mais", seções recolhíveis), nunca escondidos de verdade.
7. **Acessível por padrão**: WCAG 2.2 AA, teclado, leitor de tela, movimento reduzido, texto ampliável e alto contraste.

## Camadas CSS

Declaradas em `src/styles/index.css`:

```css
@layer reset, tokens, base, components, utilities, overrides;
```

| Camada       | Arquivo(s)                   | Conteúdo                                                                                      |
| ------------ | ---------------------------- | --------------------------------------------------------------------------------------------- |
| `reset`      | `reset.css`                  | normalização mínima, movimento reduzido                                                       |
| `tokens`     | `tokens.css`                 | custom properties e temas                                                                     |
| `base`       | `base.css`, `animations.css` | elementos HTML, foco, fonte, keyframes, `@property --progress`                                |
| `components` | `**/*.module.css`            | todo CSS Module envolve suas regras em `@layer components`                                    |
| `utilities`  | `utilities.css`              | `.visually-hidden`, `.stack`, `.cluster`, `.container`, `.tabular`, `.text-muted`, `.text-sm` |
| `overrides`  | n/a                          | exceções raras e documentadas                                                                 |

## Temas

- **Padrão:** segue o sistema (`color-scheme: light dark`). Todo token de cor usa `light-dark(claro, escuro)`.
- **Forçado:** `<html data-theme="light|dark|contrast">`, aplicado pelo `PreferencesProvider` (`src/store/PreferencesProvider.jsx`).
- **Alto contraste:** preto sobre branco, bordas de 2px, cores semânticas escurecidas e sem sombras. Também é aplicado de forma parcial quando o sistema pede `prefers-contrast: more` e nenhum tema foi escolhido.
- **Cores forçadas** (Windows): componentes com estado ganham bordas e `Highlight` via `@media (forced-colors: active)`.

## Tokens

### Cor

Cada papel semântico tem quatro tokens: base (preenchimento), `on-*` (texto sobre a base), `*-soft` (fundo suave) e `*-text` (texto ou ícone sobre fundo neutro ou suave).

| Papel      | Tokens                                                                                                                         | Significado                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| Primária   | `--color-primary`, `-on-primary`, `-primary-soft`, `-primary-text`                                                             | ações principais, marca (verde-esmeralda) |
| Destaque   | `--color-accent*`                                                                                                              | fiado, chamadas especiais (âmbar)         |
| Sucesso    | `--color-success*`                                                                                                             | pago, quitado, deu certo                  |
| Atenção    | `--color-warning*`                                                                                                             | vence logo, acabando                      |
| Perigo     | `--color-danger*`                                                                                                              | atrasado, acabou, cancelar                |
| Informação | `--color-info*`                                                                                                                | dicas e ajuda                             |
| Neutros    | `--surface-page`, `--surface-1..3`, `--surface-inverse`, `--surface-overlay`, `--text-1..3`, `--text-inverse`, `--border-1..2` | superfícies, textos e bordas              |
| Foco       | `--focus-ring`                                                                                                                 | contorno de foco (azul, contraste ≥ 3:1)  |

Hover e pressionado são derivados com `color-mix(in oklch, …)`.

### Cards de produto

`--product-verde`, `--product-azul`, `--product-amarelo`, `--product-laranja`, `--product-vermelho`, `--product-rosa`, `--product-roxo` e `--product-cinza`: o fundo suave do emoji no `ProductTile` (`features/sales/components/`), um por chave de `PRODUCT_COLORS`. Claros no tema claro e escuros no escuro, sempre com o texto padrão por cima.

### Gráficos

`--chart-1` a `--chart-8`, com a paleta categórica de referência da skill dataviz, validada para daltonismo em claro e escuro, mais `--chart-grid`, `--chart-axis` e `--chart-label`.

- A ordem é fixa e nunca ciclada. **Cada entidade tem um slot fixo** (por exemplo, cada forma de pagamento sempre com a mesma cor), e filtros não repintam as séries.
- Gráficos em que qualquer par de marcas pode ficar lado a lado (dispersão, pequenos múltiplos) usam no máximo os 3 primeiros slots.
- Os slots 3, 4 e 5 ficam abaixo de 3:1 no tema claro. Por isso, gráficos sempre mostram rótulos diretos ou uma tabela com os valores.
- As cores de status (sucesso, atenção, perigo) **não** são usadas como série.

### Tipografia

- Fonte **Atkinson Hyperlegible** (400 e 700, self-hosted via `@fontsource`), criada para distinguir 1/l/I e 0/O. O zero cortado é proposital.
- Raiz em `calc(112.5% * var(--font-scale))`: 18px na escala 1. `--font-scale` vai de 1 (Normal) a 1,5 (Enorme).
- Escala: `--text-xs` (0,78rem), `--text-sm`, `--text-md` (1rem), `--text-lg`, e as fluidas com `clamp()`: `--text-xl`, `--text-2xl`, `--text-3xl` e `--text-money`.
- Alinhamento numérico (`tabular-nums`) em colunas, teclado, quantidades e valores em lista.

### Espaço, forma e movimento

Tudo em `rem`: quando o texto cresce, espaços e áreas de toque crescem junto.

| Grupo     | Tokens                                                                                                     |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| Espaço    | `--space-1` (0,25rem) … `--space-16` (4rem); `--gutter` fluido; `--content-max`                            |
| Toque     | `--tap-min` (2,75rem ≈ 50px), `--tap-primary` (≈ 58px), `--tap-hero` (≈ 68px)                              |
| Raios     | `--radius-xs`, `-sm`, `-md`, `-lg`, `-xl`, `-pill`                                                         |
| Bordas    | `--border-width` (1px; 2px no alto contraste), `--border-width-strong`                                     |
| Sombras   | `--shadow-1..3` (em camadas; contorno sólido no alto contraste)                                            |
| Movimento | `--dur-fast` 120ms, `--dur-base` 200ms, `--dur-slow` 320ms; `--ease-out`, `--ease-in-out`, `--ease-spring` |
| Camadas   | `--z-sticky`, `--z-nav`, `--z-overlay`, `--z-toast`                                                        |
| Layout    | `--sidebar-width`, `--bottomnav-height`, `--topbar-height`, `--cart-bar-height`                            |

## Componentes (`src/components/ui/`)

Importe sempre pelo índice: `import { Button, MoneyInput } from '@/components/ui';`

| Componente                                   | Uso e decisões                                                                                                                                                                                                                                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                     | Variantes `primary`, `secondary`, `ghost`, `accent`, `danger`; tamanhos `sm`, `md`, `lg`, `hero`; `icon`, `loading` (spinner + `aria-busy`), `fullWidth`, `as` (para `Link`). O recuo lateral do `hero` acompanha a largura da tela (`clamp` com `vw`), para caber com texto Enorme a 360px. |
| `IconButton`                                 | Só para ações óbvias (fechar, +/−). `label` obrigatório (vira `aria-label` e dica).                                                                                                                                                                                                          |
| `Field`                                      | Moldura com rótulo visível, dica e erro (`role="alert"`). Recebe uma função com as props de acessibilidade do controle.                                                                                                                                                                      |
| `Input`, `Select`, `Textarea`                | Baseados em `Field`. `Input` aceita `icon` e `suffix`. O `Select` é nativo, melhor no celular, e o `Textarea` cresce com `field-sizing: content`.                                                                                                                                            |
| `Switch`                                     | Checkbox nativo com `role="switch"`.                                                                                                                                                                                                                                                         |
| `MoneyInput`                                 | Dinheiro estilo calculadora: os dígitos entram pela direita, sem vírgula. Funciona com teclado físico, do celular ou com `keypad` próprio (`inputMode="none"`). Valor em **centavos**. O valor nunca passa da largura do campo (`cqi`), nem com texto grande.                                |
| `NumericKeypad`                              | Teclas de 68px que "afundam" ao toque; segure ⌫ para limpar. Não rouba o foco do campo.                                                                                                                                                                                                      |
| `QuantityInput`                              | Quantidade digitada como o `MoneyInput` (mesma aparência), sem vírgula: em unidades inteiras cada dígito é uma unidade; em kg e litros os dígitos entram pela direita com 3 casas ("1,500 kg"). Aceita `keypad` próprio.                                                                     |
| `QuantityStepper`                            | − / quantidade / +, com passo decimal sem erro de arredondamento (kg).                                                                                                                                                                                                                       |
| `Chip`, `ChipGroup`                          | Filtros `aria-pressed`; o grupo rola com `scroll-snap` e bordas esmaecidas por `mask-image`.                                                                                                                                                                                                 |
| `SegmentedControl`                           | Rádios nativos com estado visual por `:has(input:checked)`, sem JavaScript de estilo.                                                                                                                                                                                                        |
| `Tabs`                                       | Padrão WAI-ARIA com ←/→/Home/End.                                                                                                                                                                                                                                                            |
| `Badge`                                      | Contadores e rótulos curtos, `soft` ou `solid`.                                                                                                                                                                                                                                              |
| `StatusPill`                                 | Cor + ícone + palavra. Presets de domínio em `statusPresets.js` (`quitado`, `em_dia`, `vence_em_breve`, `vence_hoje`, `atrasado`, `bloqueado`, `ok`, `acabando`, `acabou`, `concluida`, `cancelada`).                                                                                        |
| `Card`, `CardHeader`                         | Superfície padrão; `interactive` para cards tocáveis.                                                                                                                                                                                                                                        |
| `StatCard`                                   | Indicador com variação boa/ruim (`delta.positive`). Muda de layout por **container query**.                                                                                                                                                                                                  |
| `Dialog`, `BottomSheet`                      | `<dialog>` nativo: foco preso, Esc e camada superior. Entrada e saída com `@starting-style` + `allow-discrete`. A rolagem da página é travada por `html:has(dialog:modal)`. O `BottomSheet` sobe de baixo no celular.                                                                        |
| `Toaster` (via `ToastProvider` + `useToast`) | Avisos em `popover="manual"`, por cima até de modais, e `aria-live`. Ação "Desfazer", pausa com mouse ou foco, até 3 visíveis.                                                                                                                                                               |
| `EmptyState`                                 | Vazio ou erro que ensina o próximo passo, com uma ação.                                                                                                                                                                                                                                      |
| `Skeleton`                                   | Carregamento no formato do conteúdo; a região que envolve marca `aria-busy`.                                                                                                                                                                                                                 |
| `ProgressBar`                                | `role="progressbar"`; preenchimento animado pela propriedade registrada `--progress`.                                                                                                                                                                                                        |
| `Avatar`                                     | Iniciais com cor estável por nome (matiz derivada em `oklch`).                                                                                                                                                                                                                               |
| `SearchBar`                                  | `type="search"` com botão de limpar grande.                                                                                                                                                                                                                                                  |
| `DateShortcuts`                              | Atalhos "Em 7/15/30 dias" + calendário nativo + resumo ("Vence em 30 dias, sexta-feira…").                                                                                                                                                                                                   |
| `HelpTip`                                    | "?" com **Popover API** + **CSS Anchor Positioning** (fallback centralizado).                                                                                                                                                                                                                |
| `SpeakButton`                                | "Ouvir" com Web Speech API em pt-BR; some se o navegador não suportar.                                                                                                                                                                                                                       |

Hooks e estado relacionados: `useToast`, `usePreferences`, `useSpeech` (`src/hooks/`); `ToastProvider` e `PreferencesProvider` (`src/store/`).

## Layout (`src/components/layout/`)

Importe pelo índice: `import { PageHeader } from '@/components/layout';`

- **Celular** (a partir de 360px): `TopBar` + conteúdo + `BottomNav` com 5 itens (Início, Fiado, **Vender** em destaque no centro, Estoque, Mais). Os avisos usam `--toast-offset` para ficar acima da navegação (definido pelo `AppShell` com `:root:has(...)`).
- **Tablet e computador** (a partir de 48rem = 768px): `Sidebar` com marca, "Vender" em destaque, as áreas com ícone + rótulo e a conta. O PDV ficará em duas colunas (produtos | carrinho).
- Container queries nos componentes; media queries só para o esqueleto da página. Colunas de grid com `minmax(0, 1fr)`, para que conteúdo rolável não alargue a página.
- **Texto grande em tela estreita** ("Enorme" a 360px equivale a uns 240px): os rótulos da `BottomNav` crescem até caber na largura do item (`min(var(--text-xs), 21cqi)`), o logo da `TopBar` sai quando falta espaço (container query no `Brand` com `wrap`) e a lista de "Mais" esconde a seta. Palavras nunca são cortadas no meio: use `overflow-wrap: break-word`, não `anywhere`.

| Componente           | Uso e decisões                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppShell`           | Esqueleto da área logada. Envolve o conteúdo no `<ViewTransition>` do React (cross-fade na troca de tela) e põe o foco no `<main>` a cada tela nova. |
| `Sidebar`            | Barra lateral do computador. Itens em `navigation.js`; tela atual marcada por `aria-current="page"` (fundo suave + filete à esquerda).               |
| `BottomNav`          | Barra de baixo do celular. "Mais" fica marcado também nas telas que moram dentro dele (Vendas, Clientes...).                                         |
| `TopBar`             | Barra de cima do celular: nome do negócio, data curta ("qui., 22 de out.") e "Ajuda".                                                                |
| `PageHeader`         | `h1`, frase de apoio, ações (largura toda no celular) e "Voltar" opcional. Também define o título da aba (`<title>` do React 19).                    |
| `CenteredLayout`     | Telas fora da área logada (entrar, cadastro, boas-vindas, 404, erro): marca no topo e conteúdo centralizado (`sm` ou `md`).                          |
| `Brand`              | Logo + nome. `subtitle` para uma segunda linha; `wrap` deixa o título em até duas linhas e esconde o logo quando falta espaço.                       |
| `SkipLink`           | "Pular para o conteúdo", visível só com foco do teclado.                                                                                             |
| `NavigationProgress` | Faixa no topo enquanto a próxima tela (carregada sob demanda) chega, com "Carregando…" para leitores de tela.                                        |
| `ComingSoon`         | Conteúdo provisório das telas das próximas fases.                                                                                                    |

## Gráficos

Recharts com cores de `--chart-*` e textos nos tokens de texto (nunca a cor da série). Sempre com título em linguagem simples ("Quanto você vendeu nos últimos 7 dias"), valor principal escrito, tooltip ao passar o dedo ou o mouse e tabela alternativa. Nunca usar dois eixos Y. Componentes em `src/components/charts/` (índice em `index.js`, exemplos em `/design-system#graficos`):

| Componente     | Uso                                                                                                                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ChartCard`    | Moldura de todo gráfico: `title`, `summary` (o valor principal escrito) e `table` (os mesmos números em "Ver os números", com `<details>`). O gráfico fica `aria-hidden`: a tabela é a versão acessível. |
| `ColumnChart`  | Colunas de uma série (`--chart-1`), no máximo 24px de largura, ponta arredondada de 4px, grade horizontal discreta e eixo Y compacto (`formatBRL(v, { compact: true })`). Sem legenda.                   |
| `DonutChart`   | Partes de um todo (até 6), total no meio e legenda escrita (cor, ícone, nome, valor e %). Vão de 2px da cor da superfície entre as fatias. Fatias zeradas somem.                                         |
| `RankedBars`   | Ranking em HTML (mais vendidos): posição, nome, valor e barra proporcional ao maior. Sem espaço, o valor desce para baixo do nome. A lista já é acessível.                                               |
| `ChartTooltip` | Conteúdo do tooltip: valor em destaque, nome em segundo plano e um traço da cor da série.                                                                                                                |

- **Cor fixa por entidade:** cada forma de pagamento usa `--chart-${PAYMENT_METHODS[x].chartSlot}` em qualquer gráfico, e a cor nunca muda com o tamanho ou com um filtro.
- **Ordem da rosca validada:** com 5 formas, nenhuma escolha de cores passa no validador da skill `dataviz` em todos os pares (Pix e débito, crédito e fiado são parecidos para daltônicos). A rosca usa a ordem fixa `PAYMENT_RING_ORDER` (Pix, crédito, débito, fiado, dinheiro), em que toda fatia vizinha passa, e a legenda escreve nome e valor de cada uma.
- **Comparações em reais** nos indicadores ("R$ 12,00 a mais"), com a base escrita uma vez acima ("Comparando com ontem até esta hora"). Porcentagem confunde e perde o sentido quando o valor anterior é zero ou negativo.
- **Recharts e reduzir movimento:** a animação do Recharts é feita em JavaScript, então os gráficos desligam `isAnimationActive` com `prefers-reduced-motion`. A camada de teclado do Recharts fica desligada (`accessibilityLayer={false}`), porque o gráfico está escondido do leitor de tela.
