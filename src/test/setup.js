import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// O jsdom não implementa rolagem; o ScrollRestoration do roteador chama scrollTo a cada tela.
window.scrollTo = () => {};

// O jsdom não abre <dialog> como modal: abrir e fechar viram o atributo `open`,
// o que basta para o conteúdo das janelas aparecer (ou sumir) nos testes.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

afterEach(() => {
  cleanup();
});
