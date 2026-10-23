import { canShareNatively, shareText } from './share.js';

const content = { title: 'Relatório', text: 'Vendido: R$ 10,00' };

describe('shareText (regra 8)', () => {
  it('usa o menu de compartilhar do aparelho quando ele existe', async () => {
    const nav = { share: vi.fn(() => Promise.resolve()) };
    const openUrl = vi.fn();
    expect(canShareNatively(nav)).toBe(true);
    await expect(shareText(content, { nav, openUrl })).resolves.toBe('shared');
    expect(nav.share).toHaveBeenCalledWith(content);
    expect(openUrl).not.toHaveBeenCalled();
  });

  it('fechar o menu não abre o WhatsApp', async () => {
    const nav = { share: vi.fn(() => Promise.reject(new DOMException('fechou', 'AbortError'))) };
    const openUrl = vi.fn();
    await expect(shareText(content, { nav, openUrl })).resolves.toBe('cancelled');
    expect(openUrl).not.toHaveBeenCalled();
  });

  it('sem o menu, abre o WhatsApp com o resumo em texto', async () => {
    const openUrl = vi.fn();
    expect(canShareNatively({})).toBe(false);
    await expect(shareText(content, { nav: {}, openUrl })).resolves.toBe('whatsapp');
    expect(openUrl).toHaveBeenCalledWith(`https://wa.me/?text=${encodeURIComponent(content.text)}`);
  });

  it('se o menu falhar por outro motivo, segue pelo WhatsApp', async () => {
    const nav = { share: vi.fn(() => Promise.reject(new DOMException('negado', 'NotAllowedError'))) };
    const openUrl = vi.fn();
    await expect(shareText(content, { nav, openUrl })).resolves.toBe('whatsapp');
    expect(openUrl).toHaveBeenCalledTimes(1);
  });

  it('respeita o canShare do aparelho', async () => {
    const nav = { share: vi.fn(), canShare: () => false };
    const openUrl = vi.fn();
    await expect(shareText(content, { nav, openUrl })).resolves.toBe('whatsapp');
    expect(nav.share).not.toHaveBeenCalled();
  });
});
