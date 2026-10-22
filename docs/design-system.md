# Design system

Referência visual e de interação da Caderneta. A versão viva, com todos os componentes renderizados, fica na rota `/design-system` (Fase 2).

> **Status:** Fase 1 concluída (reset, ordem das camadas e fonte). Os tokens e os componentes descritos abaixo são implementados na Fase 2. Ao implementar, mantenha este documento sincronizado com `src/styles/tokens.css` e com `src/components/ui/`.

## Princípios

1. **Entendível antes de bonito, e bonito também.** Quem usa pode ter pouca leitura e pouca prática com celular. Cada tela precisa ser compreendida em poucos segundos.
2. **Uma ação principal por tela**, grande e na zona do polegar (parte de baixo, no celular).
3. **Ícone + texto, sempre.** Palavras do dia a dia, frases curtas, sem jargão ("Quem me deve", não "Contas a receber").
4. **Números são protagonistas.** Valores em dinheiro grandes, com espaçamento tabular e alto contraste.
5. **Errar é barato.** "Desfazer" em vez de confirmações; mensagens de erro que dizem o que fazer.
6. **Completo sem ser poluído.** Recursos avançados ficam um toque adiante (menu "Mais", seções recolhíveis), nunca escondidos de verdade.
7. **Acessível por padrão**: WCAG 2.2 AA, teclado, leitor de tela, movimento reduzido, texto ampliável.

## Camadas CSS

Declaradas em `src/styles/index.css`:

```css
@layer reset, tokens, base, components, utilities, overrides;
```

| Camada       | Conteúdo                                                                |
| ------------ | ----------------------------------------------------------------------- |
| `reset`      | normalização mínima (`reset.css`)                                       |
| `tokens`     | custom properties de tema (`tokens.css`)                                |
| `base`       | fonte, elementos HTML, foco (`base.css`)                                |
| `components` | todos os `*.module.css`                                                 |
| `utilities`  | classes utilitárias pontuais (`.visually-hidden`, `.stack`, `.cluster`) |
| `overrides`  | exceções raras e documentadas                                           |

## Tokens (planejados)

### Cor (`oklch`)

| Papel                                       | Uso                              | Significado                                  |
| ------------------------------------------- | -------------------------------- | -------------------------------------------- |
| `--color-primary`                           | ações principais, marca          | verde-esmeralda: dinheiro, confiança         |
| `--color-accent`                            | fiado, destaques                 | âmbar                                        |
| `--color-success`                           | pago, quitado, ok                | verde                                        |
| `--color-warning`                           | vence em breve, estoque acabando | âmbar                                        |
| `--color-danger`                            | atrasado, acabou, cancelar       | vermelho                                     |
| `--color-info`                              | dicas, informação                | azul                                         |
| `--surface-0..3`, `--text-1..3`, `--border` | neutros de superfície e texto    | n/a                                          |
| `--chart-1..6`                              | séries do Recharts               | paleta categórica validada para claro/escuro |

- Estados de hover e pressionado derivados com `color-mix(in oklch, ...)`.
- Temas: `light-dark()` com `color-scheme`, mais `[data-theme="light" | "dark" | "contrast"]` na raiz.
- Cores semânticas **nunca** aparecem sozinhas: sempre com ícone e texto.

### Tipografia

- Fonte: **Atkinson Hyperlegible** (400 e 700), criada para máxima distinção entre caracteres (1/l/I, 0/O).
- Base de 18px (`font-size: 112.5%`), multiplicada por `--font-scale` (1 a 1,5) em Ajustes.
- Escala fluida com `clamp()`: `--text-sm`, `--text-md`, `--text-lg`, `--text-xl`, `--text-2xl`, `--text-money` (valores de destaque).
- Dinheiro: `font-variant-numeric: tabular-nums`.

### Espaço, forma e movimento

- Espaçamento em base 4px: `--space-1` (4px) a `--space-12` (48px).
- Raios: `--radius-sm` 8px, `--radius-md` 14px, `--radius-lg` 20px, `--radius-pill`.
- Sombras em camadas: `--shadow-1..3`.
- Alvos de toque: `--tap-min` 48px, `--tap-primary` 56px, `--tap-hero` 64px.
- Durações e curvas: `--dur-fast` 120ms, `--dur-base` 200ms, `--dur-slow` 320ms, `--ease-out`, `--ease-spring`.

## Componentes (`src/components/ui/`)

| Componente                                                                      | Notas de uso                                                                                               |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Button`                                                                        | variantes `primary`, `secondary`, `ghost`, `danger`; tamanhos `md`, `lg`, `hero`; ícone à esquerda + texto |
| `IconButton`                                                                    | só para ações secundárias óbvias; `aria-label` obrigatório                                                 |
| `Card`, `StatCard`                                                              | StatCard com valor, rótulo, variação e ícone; responsivo por container query                               |
| `Field`, `Input`, `Select`                                                      | rótulo sempre visível, ajuda e erro abaixo do campo                                                        |
| `MoneyInput` + `NumericKeypad`                                                  | entrada de valores estilo calculadora; digita centavos da direita para a esquerda                          |
| `QuantityStepper`                                                               | − / quantidade / +, botões de 48px                                                                         |
| `Chip`, `SegmentedControl`, `Tabs`                                              | filtros e alternâncias; chips com `scroll-snap`                                                            |
| `Badge`, `StatusPill`                                                           | StatusPill traduz os status de fiado e de estoque em cor + ícone + texto                                   |
| `Dialog`, `BottomSheet`                                                         | `<dialog>` nativo; animação de entrada com `@starting-style`                                               |
| `Toast` / `Toaster`                                                             | `aria-live`, ação "Desfazer", fecha sozinho                                                                |
| `EmptyState`, `Skeleton`                                                        | vazio que ensina o próximo passo; skeleton no formato do conteúdo real                                     |
| `Avatar`, `ProgressBar`, `SearchBar`, `DateShortcuts`, `HelpTip`, `SpeakButton` | n/a                                                                                                        |

## Layout

- **Celular** (a partir de 360px): `TopBar` + conteúdo + `BottomNav` com 5 itens (Início, Fiado, **Vender** em destaque no centro, Estoque, Mais).
- **Tablet e desktop**: `Sidebar` com ícone + rótulo; o PDV fica em duas colunas (produtos | carrinho).
- Container queries nos componentes; media queries só para o esqueleto da página.

## Gráficos

Recharts com cores de `--chart-*` e textos com os tokens de tipografia. Sempre com título em linguagem simples ("Quanto você vendeu nos últimos 7 dias"), valor principal escrito e tooltip acessível. Nada de gráfico sem o número por extenso ao lado.
