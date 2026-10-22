/**
 * Links do WhatsApp (`wa.me`), usados no recibo da venda e na cobrança do fiado (regra 3.9).
 * O número é guardado só com os dígitos e com DDD, sem o 55 do Brasil.
 */

const COUNTRY_CODE = '55';

/**
 * Link que abre o WhatsApp com a mensagem pronta. Sem número, o próprio WhatsApp
 * pergunta para quem enviar.
 * @param {{ phone?: string|null, text: string }} input
 * @returns {string}
 */
export function whatsappLink({ phone, text }) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  const target = digits ? `${COUNTRY_CODE}${digits}` : '';
  return `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
}
