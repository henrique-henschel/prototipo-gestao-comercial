#!/usr/bin/env node
/**
 * Captura de tela do app para verificação visual (sem dependências).
 * Abre o Chrome/Edge em modo headless pelo `browser.mjs` (Chrome DevTools Protocol).
 *
 * Pré-requisito: servidor rodando (`npm run dev`).
 *
 * Uso:
 *   npm run shot -- <arquivo.png> [rota] [opções]
 *
 * A rota é relativa à raiz e pode ficar sem a barra inicial ("vender", "design-system");
 * no Git Bash, prefira sem barra, porque ele converte "/x" em um caminho do Windows.
 * Âncoras (#secao) não rolam sozinhas (o React renderiza depois): use --eval com scrollIntoView().
 *
 * Opções:
 *   --width <px>      largura da tela (padrão 1440; < 600 emula celular)
 *   --height <px>     altura da tela (padrão 1000)
 *   --theme <t>       light | dark (preferência do sistema emulada; padrão light)
 *   --full            página inteira em vez de só a área visível
 *   --eval "<js>"     expressão JavaScript executada antes da captura (aceita await;
 *                     para vários passos use "(async () => { ...; return x })()"). O
 *                     valor retornado é impresso (útil para medir overflow etc.).
 *   --media print     emula a impressão (print.css) na captura
 *   --wait <ms>       espera após carregar (padrão 1500)
 *   --base <url>      origem do app (padrão http://localhost:5173)
 *
 * Exemplos:
 *   npm run shot -- inicio.png
 *   npm run shot -- celular.png vender --width 360 --height 800 --theme dark
 *   npm run shot -- valores.png design-system --eval "document.querySelector('#valores').scrollIntoView({ behavior: 'instant' })"
 *   npm run shot -- overflow.png --width 360 --eval "document.documentElement.scrollWidth"
 *   npm run shot -- relatorio.pdf "entrar?voltar=/relatorios" --eval "..."   # PDF como na impressão (A4)
 *
 * Com o nome terminando em .pdf, a saída é o PDF que o navegador imprimiria (Page.printToPDF);
 * terminando em .webp, a imagem sai comprimida (usada nas capturas do README, em docs/capturas/).
 * Arquivos sem pasta são salvos em `shots/` (ignorada pelo git).
 * Se o Chrome não for encontrado, defina CHROME_PATH.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { assertServer, openPage, sleep } from './browser.mjs';

function parseArgs(argv) {
  const options = {
    width: 1440,
    height: 1000,
    theme: 'light',
    full: false,
    wait: 1500,
    base: 'http://localhost:5173',
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--full') options.full = true;
    else if (arg.startsWith('--')) options[arg.slice(2)] = argv[++i];
    else positional.push(arg);
  }
  const [file, route = ''] = positional;
  // O Git Bash (MSYS) converte argumentos como "/vender" em "C:/Program Files/Git/vender".
  if (/^[a-z]:[\\/]/i.test(route)) {
    console.error(
      `A rota virou um caminho do Windows (${route}). Escreva a rota sem a barra inicial ` +
        '(ex.: "vender" ou "design-system") ou use MSYS_NO_PATHCONV=1.',
    );
    process.exit(1);
  }
  if (!file) {
    console.error(
      'Uso: npm run shot -- <arquivo.png> [rota] [--width 390] [--theme dark] [--full] [--eval "js"]',
    );
    process.exit(1);
  }
  return {
    ...options,
    file,
    route,
    width: Number(options.width),
    height: Number(options.height),
    wait: Number(options.wait),
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const out = resolve(/[\\/]/.test(opts.file) ? opts.file : join('shots', opts.file));
  mkdirSync(dirname(out), { recursive: true });

  const url = new URL(opts.route, opts.base).toString();
  await assertServer(opts.base);

  const { send, evaluate, close } = await openPage(opts);
  try {
    await send('Page.navigate', { url });
    await sleep(opts.wait);

    if (opts.eval) {
      try {
        const value = await evaluate(`(async () => { return (${opts.eval}); })()`);
        if (value !== undefined) console.log('eval:', JSON.stringify(value));
      } catch (error) {
        console.error('Erro no --eval:', error.message);
      }
      await sleep(800); // deixa animações e transições terminarem
    }

    if (out.endsWith('.pdf')) {
      const pdf = await send('Page.printToPDF', { preferCSSPageSize: true, printBackground: true });
      writeFileSync(out, Buffer.from(pdf.result.data, 'base64'));
      console.log(`PDF salvo em ${out}`);
      return;
    }

    // .webp sai comprimido (capturas do README); o resto, em PNG sem perdas.
    const params = out.endsWith('.webp') ? { format: 'webp', quality: 80 } : { format: 'png' };
    if (opts.full) {
      const metrics = await send('Page.getLayoutMetrics');
      const { width, height } = metrics.result.cssContentSize;
      params.captureBeyondViewport = true;
      params.clip = { x: 0, y: 0, width, height, scale: 1 };
    }
    const shot = await send('Page.captureScreenshot', params);
    writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
    console.log(`Captura salva em ${out}`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
