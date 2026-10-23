import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// `findBy*` e `waitFor` esperam até 5 s (o padrão é 1 s): as telas são carregadas sob
// demanda, e a primeira importação pode demorar com a suíte inteira rodando.
configure({ asyncUtilTimeout: 5000 });

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
