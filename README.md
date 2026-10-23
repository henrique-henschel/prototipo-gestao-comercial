# Caderneta: protótipo de gestão comercial

> Suas vendas, o fiado e o estoque na palma da mão.

Protótipo **front-end de alta fidelidade** de um SaaS de gestão comercial para **pequenos negócios e vendedores ambulantes**. É a base definitiva da interface do produto real: tudo é navegável e interativo, mas **não há back-end nem persistência**. Os dados de exemplo vivem em memória e voltam ao estado inicial quando a página é recarregada.

"Caderneta" é um nome provisório, que lembra o caderninho do fiado. Para trocar, edite `src/app/config.js` e o `<title>` de `index.html`.

## Para quem é

Para quem vende na rua, na feira, na barraca, no carrinho ou numa lojinha, e precisa controlar o dinheiro **sem complicação**. A interface foi pensada para quem tem **pouca familiaridade com tecnologia**:

- botões grandes, sempre com ícone **e** texto;
- palavras do dia a dia ("Quem me deve", "Troco", "Mercadoria acabando");
- teclado numérico próprio, parecido com uma calculadora;
- botão "Desfazer" em vez de perguntas confusas;
- leitura em voz alta, tamanho de letra ajustável, tema escuro e de alto contraste.

## Funcionalidades

| Área                   | O que faz                                                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vender**             | Venda por produto (toque no card) ou por valor avulso; desconto; carrinho sempre visível; baixa automática do estoque                                          |
| **Receber**            | Dinheiro (com troco em destaque), Pix (QR da chave do negócio), débito, crédito (à vista ou parcelado), **fiado** e **pagamento dividido** entre várias formas |
| **Fiado**              | "Quem me deve" ordenado por urgência; vencimentos; limite de crédito por cliente; bloqueio; pagamentos parciais; cobrança pronta pelo WhatsApp                 |
| **Estoque**            | Produtos com emoji/foto, custo, preço e margem; entradas, ajustes e perdas; alertas de "acabando" e "acabou"                                                   |
| **Caixa do dia**       | Troco inicial, entradas por forma de pagamento, despesas, conferência no fechamento                                                                            |
| **Início (dashboard)** | Quanto vendeu hoje, lucro estimado, a receber, gráficos da semana, formas de pagamento, avisos importantes                                                     |
| **Relatórios**         | Por período e por tipo; exportação em Excel (CSV), PDF (impressão) e compartilhamento                                                                          |
| **Ajustes**            | Dados do negócio, chave Pix, taxas da maquininha, regras de estoque, acessibilidade, modo demonstração                                                         |

> As funcionalidades são entregues em fases (veja o [Roadmap](#roadmap)). As Fases 1 a 5 estão concluídas: fundação, design system, domínio e dados (regras testadas, dados de exemplo, serviços e estado global), a navegação (entrar, criar conta, boas-vindas, menus do celular e do computador) e o fluxo de vender (PDV, carrinho, todas as formas de pagamento, venda concluída com "Desfazer", histórico e cancelamento). As telas das outras áreas chegam a partir da Fase 6; o catálogo vivo de componentes fica em `/design-system`.

## Como rodar

Pré-requisito: **Node.js 22 ou superior**.

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173` e toque em **"Entrar com conta de demonstração"** para ver o app com os dados de exemplo da "Barraca da Rosa". Qualquer e-mail e senha também entram, e **"Criar conta"** mostra as boas-vindas, com a opção de começar do zero. Como nada é salvo, recarregar a página sai da conta e volta aos dados de exemplo.

### Scripts

| Comando                                   | Descrição                                                                        |
| ----------------------------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`                             | Servidor de desenvolvimento                                                      |
| `npm run build`                           | Build de produção (`dist/`)                                                      |
| `npm run preview`                         | Serve o build localmente                                                         |
| `npm test` / `npm run test:watch`         | Testes com Vitest + Testing Library                                              |
| `npm run lint`                            | ESLint (React, Hooks, acessibilidade JSX)                                        |
| `npm run format` / `npm run format:check` | Prettier                                                                         |
| `npm run shot -- <arquivo.png> [rota]`    | Captura de tela headless para verificação visual (veja `scripts/screenshot.mjs`) |

## Tecnologias

- **React 19** em JavaScript (JSX), com contratos de dados documentados em **JSDoc**
- **Vite 8** para build e dev server
- **React Router 8** para as rotas
- **CSS puro e moderno**: `@layer`, custom properties, `oklch()`, `color-mix()`, `light-dark()`, nesting nativo, `:has()`, container queries, `@starting-style`, View Transitions, `scroll-snap`, `@property`, `@media print`. **Sem Tailwind.**
- **Recharts** para os gráficos, colorido pelos tokens do design system
- **lucide-react** para os ícones, **Atkinson Hyperlegible** como fonte (feita para máxima legibilidade)
- **Vitest**, **Testing Library**, **ESLint** (com `jsx-a11y`) e **Prettier**

## Estrutura do projeto

```
src/
├─ app/          configuração, rotas e providers
├─ styles/       CSS global em camadas (reset, tokens, base, utilitários, impressão)
├─ components/   ui/ (design system), layout/, charts/
├─ features/     uma pasta por área (sales, fiado, inventory, cash, reports...)
├─ domain/       modelos (JSDoc), constantes e regras de negócio puras
├─ mocks/        dados de exemplo e banco em memória
├─ services/     camada de acesso a dados (o ponto de troca pela API real)
├─ store/        estado global (Context + useReducer)
├─ hooks/        hooks reutilizáveis
└─ lib/          formatação, CSV, WhatsApp, compartilhamento
docs/            plano de implementação, regras de negócio e design system
scripts/         screenshot.mjs (capturas de tela para verificação visual)
```

Os detalhes e as convenções estão no [`CLAUDE.md`](./CLAUDE.md).

## Decisões técnicas

- **Front-end only, estado em memória.** O protótipo demonstra todos os fluxos sem depender de servidor. Recarregar restaura os dados de exemplo, e há também o botão "Restaurar dados de exemplo" em Ajustes.
- **Dinheiro em centavos inteiros.** Evita erros de arredondamento (R$ 0,10 + R$ 0,20 dá exatamente R$ 0,30).
- **Regras de negócio isoladas e testadas** em `src/domain/rules`, independentes de React.
- **Camada de serviços assíncrona com latência simulada.** As telas já nascem com estados reais de carregamento e erro, e o modo demonstração permite simular lentidão e falhas.
- **Dados de exemplo determinísticos e relativos a hoje.** Os dashboards sempre mostram um negócio "vivo".

## Integração futura com o back-end

O protótipo foi organizado para que a troca por uma API real seja localizada:

1. **Contratos**: `src/domain/models.js` descreve todas as entidades (Produto, Venda, Pagamento, Cliente, ContaFiado, MovimentoEstoque, Despesa, Caixa, Negócio) e `docs/regras-de-negocio.md` descreve as regras que o back-end deve **revalidar**.
2. **Serviços**: cada função de `src/services/*.service.js` já é `async` e tem assinatura equivalente a um endpoint REST. Basta trocar a implementação em memória por chamadas HTTP, mantendo a mesma assinatura.
3. **Mocks**: `src/mocks/` pode ser removido ou reaproveitado em testes e em MSW.
4. **Regras puras**: `src/domain/rules` pode continuar no front para feedback imediato (troco, totais, status) e ser espelhado no servidor.

## Roadmap

O detalhamento de cada fase está em [`docs/plano-de-implementacao.md`](./docs/plano-de-implementacao.md).

| Fase | Entrega                                                              | Status       |
| ---- | -------------------------------------------------------------------- | ------------ |
| 1    | Fundação: Vite, React, ESLint, Prettier, Vitest, fonte, documentação | ✅ Concluída |
| 2    | Design system: tokens, componentes `ui/`, página `/design-system`    | ✅ Concluída |
| 3    | Domínio e dados: modelos, regras + testes, seed, serviços, store     | ✅ Concluída |
| 4    | Shell e navegação: layout, rotas, login simulado, boas-vindas        | ✅ Concluída |
| 5    | Vender: PDV, carrinho, pagamentos, venda concluída, histórico        | ✅ Concluída |
| 6    | Fiado e clientes: quem me deve, receber, cobrar no WhatsApp, CRUD    | ✅ Concluída |
| 7    | Estoque                                                              | ⏳           |
| 8    | Caixa e despesas                                                     | ⏳           |
| 9    | Dashboard                                                            | ⏳           |
| 10   | Relatórios e exportação                                              | ⏳           |
| 11   | Ajustes, acessibilidade, ajuda e tour                                | ⏳           |
| 12   | Polimento, auditoria de acessibilidade, PWA básico                   | ⏳           |

## Limitações do protótipo

- Nenhum dado é salvo: recarregar a página volta aos dados de exemplo.
- Login, Pix, maquininha e WhatsApp são simulados: o Pix mostra um QR da chave configurada e o WhatsApp abre um link `wa.me` com a mensagem pronta.
- Não há multiusuário, sincronização ou emissão fiscal.

## Capturas de tela

_Serão adicionadas conforme as telas forem concluídas._
