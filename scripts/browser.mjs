/**
 * Abre o Chrome/Edge em modo headless e o controla pelo Chrome DevTools Protocol com o
 * WebSocket nativo do Node (>= 22), sem dependências. Usado pelo `screenshot.mjs`
 * (`npm run shot`) e pelo `a11y.mjs` (`npm run a11y`).
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

export const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** Encerra o processo com uma mensagem se o servidor do app não responder. */
export async function assertServer(base) {
  try {
    await fetch(base);
  } catch {
    console.error(`Não consegui acessar ${base}. Rode "npm run dev" antes.`);
    process.exit(1);
  }
}

/**
 * @typedef {object} PageOptions
 * @property {number} width
 * @property {number} height
 * @property {'light'|'dark'} theme preferência do sistema emulada
 * @property {string} [media] ex.: "print"
 * @property {boolean} [reducedMotion] emula `prefers-reduced-motion: reduce`
 */

/**
 * Abre o navegador numa aba em branco com a tela e o tema pedidos.
 * @param {PageOptions} options
 * @returns {Promise<{ send: (method: string, params?: object) => Promise<any>, evaluate: (expression: string) => Promise<any>, close: () => Promise<void> }>}
 */
export async function openPage({ width, height, theme, media, reducedMotion = false }) {
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

  const close = async () => {
    const exited = new Promise((done) => proc.once('exit', done));
    proc.kill();
    await Promise.race([exited, sleep(3000)]);
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      // Perfil temporário: se o Windows ainda segurar algum arquivo, o sistema limpa depois.
    }
  };

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

    /** Executa JavaScript na página (aceita promessas) e devolve o valor ou lança o erro. */
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      const details = result.result?.exceptionDetails;
      if (details) throw new Error(details.exception?.description ?? details.text);
      return result.result?.result?.value;
    };

    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600,
    });
    await send('Emulation.setEmulatedMedia', {
      media: media ?? '',
      features: [
        { name: 'prefers-color-scheme', value: theme },
        { name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' },
      ],
    });
    await send('Page.enable');

    return {
      send,
      evaluate,
      close: async () => {
        ws.close();
        await close();
      },
    };
  } catch (error) {
    await close();
    throw error;
  }
}
