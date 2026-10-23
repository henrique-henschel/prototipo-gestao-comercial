/**
 * Passos do tour de primeiro uso: poucos, curtos e com o nome do menu em destaque, para a
 * pessoa achar o botão depois. `strong` é o trecho em negrito dentro de `text`.
 * @type {{ emoji: string, title: string, text: string, strong?: string[] }[]}
 */
export const TOUR_STEPS = [
  {
    emoji: '👋',
    title: 'Boas-vindas!',
    text: 'Aqui é o caderno do seu negócio, no celular. Em 5 passos rápidos, veja o que dá para fazer.',
  },
  {
    emoji: '🛒',
    title: 'Vender',
    text: 'Toque em Vender, escolha os produtos e como o cliente pagou. No dinheiro, o troco aparece bem grande.',
    strong: ['Vender'],
  },
  {
    emoji: '📒',
    title: 'Fiado',
    text: 'Em Fiado você vê quem está devendo e quem atrasou. Dá para receber e cobrar pelo WhatsApp.',
    strong: ['Fiado'],
  },
  {
    emoji: '📦',
    title: 'Estoque e caixa',
    text: 'O Estoque avisa o que está acabando. No Caixa do dia, você confere o dinheiro da gaveta antes de ir embora.',
    strong: ['Estoque', 'Caixa do dia'],
  },
  {
    emoji: '↩️',
    title: 'Errou? Tem volta',
    text: 'Quase tudo tem Desfazer no aviso que aparece embaixo. Na Ajuda, você tira dúvidas e vê este passo a passo de novo.',
    strong: ['Desfazer', 'Ajuda'],
  },
];

/** Estado de navegação que abre o tour no Início: `navigate(ROUTES.home, { state: TOUR_STATE })`. */
export const TOUR_STATE = { tour: true };
