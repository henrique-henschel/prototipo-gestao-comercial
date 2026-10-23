import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    modules: {
      // Nomes legíveis no desenvolvimento ajudam a depurar; hash curto em produção.
      generateScopedName:
        process.env.NODE_ENV === 'production' ? '[hash:base64:6]' : '[name]__[local]__[hash:base64:4]',
    },
  },
  server: {
    port: 5173,
    open: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // Os testes de integração montam o app inteiro e carregam telas sob demanda:
    // numa máquina lenta (ou com a suíte inteira em paralelo), 5 s não bastam.
    testTimeout: 20_000,
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
