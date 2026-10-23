import { whatsappLink } from './whatsapp.js';

/**
 * Compartilhar um texto (regra 8): pelo menu de compartilhar do aparelho (Web Share API)
 * quando ele existe; senão, pelo WhatsApp, com o texto pronto e sem destinatário (o
 * próprio WhatsApp pergunta para quem enviar).
 */

/**
 * O aparelho tem o menu de compartilhar? Serve para escrever o botão certo
 * ("Compartilhar" ou "Enviar no WhatsApp").
 * @param {Navigator} [nav]
 */
export function canShareNatively(nav = globalThis.navigator) {
  return typeof nav?.share === 'function';
}

/**
 * @param {{ title: string, text: string }} content
 * @param {{ nav?: Navigator, openUrl?: (url: string) => void }} [deps] para os testes
 * @returns {Promise<'shared'|'cancelled'|'whatsapp'>} `cancelled`: a pessoa fechou o menu
 */
export async function shareText({ title, text }, deps = {}) {
  const nav = deps.nav ?? globalThis.navigator;
  const openUrl = deps.openUrl ?? ((url) => window.open(url, '_blank', 'noopener,noreferrer'));

  if (canShareNatively(nav) && (!nav.canShare || nav.canShare({ title, text }))) {
    try {
      await nav.share({ title, text });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
      // Outro erro (sem permissão, por exemplo): segue pelo WhatsApp.
    }
  }

  openUrl(whatsappLink({ text }));
  return 'whatsapp';
}
