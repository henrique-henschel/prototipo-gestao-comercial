import { ROUTES } from '@/app/routes.js';

/**
 * Perguntas frequentes da Ajuda, em linguagem simples, agrupadas pelo assunto. `link`
 * leva para a tela de que a resposta fala.
 * @type {{ id: string, title: string, emoji: string,
 *   questions: { question: string, answer: string, link?: { to: string, label: string } }[] }[]}
 */
export const FAQ = [
  {
    id: 'vender',
    title: 'Vender',
    emoji: '🛒',
    questions: [
      {
        question: 'Como faço uma venda?',
        answer:
          'Toque em Vender, toque nos produtos que o cliente levou e depois em Cobrar. Escolha a forma de pagamento e conclua a venda. Para algo que não está na lista, use "Valor avulso".',
        link: { to: ROUTES.sell, label: 'Ir para Vender' },
      },
      {
        question: 'Como sei quanto dar de troco?',
        answer:
          'No pagamento em dinheiro, digite quanto o cliente deu (ou toque no valor da nota). O troco aparece bem grande, e o botão "Ouvir" fala o valor.',
      },
      {
        question: 'Errei a venda. E agora?',
        answer:
          'Logo depois de vender, toque em Desfazer no aviso de baixo. Passou o tempo? Abra a venda em Vendas e use "Cancelar venda": o estoque e o fiado voltam ao que eram.',
        link: { to: ROUTES.sales, label: 'Ver as vendas' },
      },
    ],
  },
  {
    id: 'fiado',
    title: 'Fiado',
    emoji: '📒',
    questions: [
      {
        question: 'Como vendo fiado?',
        answer:
          'Na hora de cobrar, escolha Fiado e quem está comprando. O vencimento já vem preenchido com o prazo dos Ajustes, e você pode mudar.',
      },
      {
        question: 'O cliente pagou uma parte. Como registro?',
        answer:
          'Em Fiado, toque em "Receber pagamento", escolha quem está pagando e digite o valor. O pagamento abate primeiro a compra mais antiga.',
        link: { to: ROUTES.fiado, label: 'Ir para o Fiado' },
      },
      {
        question: 'Como cobro um cliente atrasado?',
        answer:
          'Toque em "Cobrar no WhatsApp" na lista do Fiado. A mensagem já vai pronta e educada, com o valor da dívida e a sua chave Pix.',
      },
    ],
  },
  {
    id: 'estoque',
    title: 'Estoque',
    emoji: '📦',
    questions: [
      {
        question: 'Chegou mercadoria. O que faço?',
        answer:
          'Em Estoque, toque em "Entrada" no produto e digite quanto chegou. Se o preço de custo mudou, informe também: o lucro fica certo.',
        link: { to: ROUTES.inventory, label: 'Ir para o Estoque' },
      },
      {
        question: 'Algo estragou ou sumiu. Como acerto?',
        answer:
          'Abra o produto e use "Perda" (para o que estragou ou venceu) ou "Contar o estoque" (para acertar com o que você contou na prateleira).',
      },
    ],
  },
  {
    id: 'caixa',
    title: 'Caixa e dinheiro',
    emoji: '💵',
    questions: [
      {
        question: 'Para que serve o Caixa do dia?',
        answer:
          'Para saber quanto dinheiro deveria ter na gaveta. No fim do dia, conte o dinheiro e toque em "Fechar o dia": o app diz se sobrou, faltou ou bateu certinho.',
        link: { to: ROUTES.cash, label: 'Ir para o Caixa' },
      },
      {
        question: 'Comprei mercadoria para revender. É despesa?',
        answer:
          'Não. Registre como entrada no Estoque. Despesa é gasto que não vira mercadoria: gasolina, almoço, aluguel, gelo, sacolas.',
      },
      {
        question: 'O que é o "Lucro estimado"?',
        answer:
          'É o que você vendeu menos o custo dos produtos, as taxas da maquininha e as despesas. Se algum produto está sem custo, o lucro de verdade pode ser menor.',
      },
    ],
  },
  {
    id: 'relatorios',
    title: 'Relatórios',
    emoji: '📊',
    questions: [
      {
        question: 'Como mando os números para o contador?',
        answer:
          'Em Relatórios, escolha o relatório e o período e toque em "Baixar para o Excel". Também dá para salvar em PDF ou enviar um resumo pelo WhatsApp.',
        link: { to: ROUTES.reports, label: 'Ir para os Relatórios' },
      },
    ],
  },
  {
    id: 'conta',
    title: 'Ajustes e dados',
    emoji: '⚙️',
    questions: [
      {
        question: 'A letra está pequena. Dá para aumentar?',
        answer:
          'Sim. Em Ajustes, em "Aparência e acessibilidade", escolha o tamanho do texto. Lá também dá para deixar a tela escura ou com mais contraste.',
        link: { to: ROUTES.settings, label: 'Abrir os Ajustes' },
      },
      {
        question: 'Por que meus dados sumiram quando recarreguei a página?',
        answer:
          'Este é um app de demonstração: nada é guardado. Ao recarregar a página, tudo volta para os dados de exemplo da Barraca da Rosa.',
      },
    ],
  },
];
