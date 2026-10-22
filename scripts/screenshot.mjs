#!/usr/bin/env node
/**
 * Captura de tela do app para verificação visual (sem dependências).
 * Abre o Chrome/Edge em modo headless e o controla pelo Chrome DevTools Protocol
 * com o WebSocket nativo do Node (>= 22).
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
 *   --wait <ms>       espera após carregar (padrão 1500)
 *   --base <url>      origem do app (padrão http://localhost:5173)
 *
 * Exemplos:
 *   npm run shot -- inicio.png
 *   npm run shot -- celular.png vender --width 360 --height 800 --theme dark
 *   npm run shot -- valores.png design-system --eval "document.querySelector('#valores').scrollIntoView({ behavior: 'instant' })"
 *   npm run shot -- overflow.png --width 360 --eval "document.documentElement.scrollWidth"
 *
 * Arquivos sem pasta são salvos em `shots/` (ignorada pelo git).
 * Se o Chrome não for encontrado, defina CHROME_PATH.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const BROWSER_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

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

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const out = resolve(/[\\/]/.test(opts.file) ? opts.file : join('shots', opts.file));
  mkdirSync(dirname(out), { recursive: true });

  const url = new URL(opts.route, opts.base).toString();
  try {
    await fetch(opts.base);
  } catch {
    console.error(`Não consegui acessar ${opts.base}. Rode "npm run dev" antes.`);
    process.exit(1);
  }

  const browser = BROWSER_CANDIDATES.find((path) => existsSync(path));
  if (!browser) {
    console.error('Chrome/Edge não encontrado. Defina a variável CHROME_PATH.');
    process.exit(1);
  }

  const profile = mkdtempSync(join(tmpdir(), 'caderneta-shot-'));
  const proc = spawn(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  try {
    // Com a porta 0 o navegador escolhe uma livre e a informa neste arquivo.
    let port;
    for (let i = 0; i < 100 && !port; i++) {
      await sleep(100);
      try {
        port = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0];
      } catch {
        /* ainda iniciando */
      }
    }
    if (!port) throw new Error('O navegador não abriu a porta de depuração.');

    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const page = targets.find((target) => target.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((done, fail) => {
      ws.addEventListener('open', done);
      ws.addEventListener('error', fail);
    });

    let nextId = 0;
    const pending = new Map();
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        pending.get(message.id)(message);
        pending.delete(message.id);
      }
    });
    const send = (method, params = {}) =>
      new Promise((done) => {
        nextId += 1;
        pending.set(nextId, done);
        ws.send(JSON.stringify({ id: nextId, method, params }));
      });

    await send('Emulation.setDeviceMetricsOverride', {
      width: opts.width,
      height: opts.height,
      deviceScaleFactor: 1,
      mobile: opts.width < 600,
    });
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: opts.theme }],
    });
    await send('Page.enable');
    await send('Page.navigate', { url });
    await sleep(opts.wait);

    if (opts.eval) {
      const expression = `(async () => { return (${opts.eval}); })()`;
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.result?.exceptionDetails) {
        console.error(
          'Erro no --eval:',
          result.result.exceptionDetails.exception?.description ?? result.result.exceptionDetails.text,
        );
      } else if (result.result?.result?.value !== undefined) {
        console.log('eval:', JSON.stringify(result.result.result.value));
      }
      await sleep(800); // deixa animações e transições terminarem
    }

    const params = { format: 'png' };
    if (opts.full) {
      const metrics = await send('Page.getLayoutMetrics');
      const { width, height } = metrics.result.cssContentSize;
      params.captureBeyondViewport = true;
      params.clip = { x: 0, y: 0, width, height, scale: 1 };
    }
    const shot = await send('Page.captureScreenshot', params);
    writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
    console.log(`Captura salva em ${out}`);
    ws.close();
  } finally {
    const exited = new Promise((done) => proc.once('exit', done));
    proc.kill();
    await Promise.race([exited, sleep(3000)]);
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      // Perfil temporário: se o Windows ainda segurar algum arquivo, o sistema limpa depois.
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
