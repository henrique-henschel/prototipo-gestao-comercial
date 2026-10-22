import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// O jsdom não implementa rolagem; o ScrollRestoration do roteador chama scrollTo a cada tela.
window.scrollTo = () => {};

afterEach(() => {
  cleanup();
});
