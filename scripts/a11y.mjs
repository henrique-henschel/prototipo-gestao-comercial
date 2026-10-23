#!/usr/bin/env node
/**
 * Auditoria de acessibilidade com o axe-core (o mesmo motor do Lighthouse) em todas as
 * telas do app: entrar, cadastro, boas-vindas, tour, todas as telas logadas pela conta de
 * demonstração e a página "não encontrada". Também confere a rolagem horizontal.
 *
 * Pré-requisito: servidor rodando (`npm run dev`).
 *
 * Uso:
 *   npm run a11y                                   # 1440px, tema claro
 *   npm run a11y -- --width 360 --theme dark
 *   npm run a11y -- --theme contrast --text 1.5    # alto contraste com texto Enorme
 *   npm run a11y -- --only vender,caixa            # só as telas cujo nome contém o texto
 *
 * Opções:
 *   --width <px>      largura da tela (padrão 1440)
 *   --height <px>     altura da tela (padrão 900)
 *   --theme <t>       light | dark | contrast (padrão light)
 *   --text <n>        tamanho do texto (--font-scale): 1, 1.15, 1.3 ou 1.5 (padrão 1)
 *   --only <a,b>      filtra as telas pelo nome
 *   --base <url>      origem do app (padrão http://localhost:5173)
 *
 * Sai com código 1 se alguma tela tiver violação ou rolagem horizontal.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { assertServer, openPage, sleep } from './browser.mjs';

const require = createRequire(import.meta.url);
const AXE_SOURCE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

/** Regras do WCAG 2.2 A/AA e boas práticas (o que o Lighthouse também confere). */
const AXE_OPTIONS = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
  resultTypes: ['violations'],
};

function parseArgs(argv) {
  const options = {
    width: 1440,
    height: 900,
    theme: 'light',
    text: '1',
    only: '',
    base: 'http://localhost:5173',
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) options[argv[i].slice(2)] = argv[++i];
  }
  return {
    ...options,
    width: Number(options.width),
    height: Number(options.height),
    only: options.only ? options.only.split(',') : [],
  };
}

/* ---------- Ações na página (executadas no navegador) ---------- */

/** Navega dentro do app sem recarregar (o estado em memória continua). */
const pushRoute = (path) =>
  `history.pushState(null, '', ${JSON.stringify(path)}); dispatchEvent(new PopStateEvent('popstate'));`;

const clickButton = (text) =>
  `[...document.querySelectorAll('button')].find((b) => b.textContent.includes(${JSON.stringify(text)})).click();`;

/** Preenche um campo controlado pelo React (o setter nativo dispara o onChange). */
const fillField = (label, value) => `(() => {
  const field = [...document.querySelectorAll('input')].find((input) => input.labels?.[0]?.textContent.includes(${JSON.stringify(label)}));
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(field, ${JSON.stringify(value)});
  field.dispatchEvent(new Event('input', { bubbles: true }));
})();`;

/** Espera a tela terminar de carregar: título visível e nada marcado como "carregando". */
const WAIT_READY = `(async () => {
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 100));
    if (document.querySelector('h1') && !document.querySelector('[aria-busy="true"]')) break;
  }
  await new Promise((r) => setTimeout(r, 700));
})()`;

/** Espera o título (h1) da tela conter o texto. */
const waitHeading = (text) => `(async () => {
  for (let i = 0; i < 100; i++) {
    if (document.querySelector('h1')?.textContent.includes(${JSON.stringify(text)})) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
})()`;

/** Primeiro link da tela que leva a um caminho que começa com o prefixo. */
const firstLink = (prefix, exclude = '') => `(() => {
  const link = [...document.querySelectorAll('a[href^="${prefix}"]')].find((a) => {
    const rest = a.getAttribute('href').slice(${prefix.length});
    return rest && !rest.includes('?') && ${JSON.stringify(exclude)} !== rest;
  });
  return link?.getAttribute('href');
})()`;

const RUN_AXE = `(async () => {
  const { violations } = await axe.run(document, ${JSON.stringify(AXE_OPTIONS)});
  return {
    violations: violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 4).map((n) => (n.target.join(' ') + ' :: ' + n.failureSummary.split('\\n').slice(1, 2).join('')).slice(0, 220)),
      count: v.nodes.length,
    })),
    scrollWidth: document.documentElement.scrollWidth,
    title: document.title,
  };
})()`;

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  await assertServer(opts.base);
  const browserTheme = opts.theme === 'dark' ? 'dark' : 'light';
  const page = await openPage({ ...opts, theme: browserTheme, reducedMotion: true });
  const results = [];

  const applyPreferences = () =>
    page.evaluate(`(() => {
      ${opts.theme === 'contrast' ? "document.documentElement.dataset.theme = 'contrast';" : ''}
      document.documentElement.style.setProperty('--font-scale', '${opts.text}');
    })()`);

  const load = async (path) => {
    await page.send('Page.navigate', { url: new URL(path, opts.base).toString() });
    await sleep(1500);
    await page.evaluate(AXE_SOURCE);
    await applyPreferences();
    await page.evaluate(WAIT_READY);
  };

  const audit = async (name, heading) => {
    if (heading && !(await page.evaluate(waitHeading(heading)))) {
      console.log(`FALHOU ${name} (o título "${heading}" não apareceu)`);
      results.push({ name, violations: [{ id: 'sem-titulo' }], scrollWidth: 0 });
      return;
    }
    if (opts.only.length > 0 && !opts.only.some((filter) => name.includes(filter))) return;
    await applyPreferences();
    await page.evaluate(WAIT_READY);
    const result = await page.evaluate(RUN_AXE);
    results.push({ name, ...result });
    const overflow = result.scrollWidth > opts.width;
    const status = result.violations.length === 0 && !overflow ? 'ok' : 'FALHOU';
    console.log(
      `${status.padEnd(6)} ${name}${overflow ? ` (rolagem horizontal: ${result.scrollWidth}px)` : ''}`,
    );
    for (const violation of result.violations) {
      console.log(`       - [${violation.impact}] ${violation.id}: ${violation.help} (${violation.count})`);
      for (const node of violation.nodes) console.log(`           ${node}`);
    }
  };

  const go = async (path, name = path) => {
    await page.evaluate(pushRoute(path));
    await audit(name);
  };

  try {
    console.log(`Auditoria: ${opts.width}px, tema ${opts.theme}, texto ${opts.text}\n`);

    // Fora da área logada.
    await load('/entrar');
    await audit('entrar');
    await go('/cadastro', 'cadastro');
    await go('/pagina-que-nao-existe', 'não encontrada');

    // Conta nova: boas-vindas em três passos e o tour no Início.
    await load('/cadastro');
    await page.evaluate(fillField('Seu nome', 'Joana Prado'));
    await page.evaluate(fillField('E-mail', 'joana@exemplo.com'));
    await page.evaluate(fillField('Senha', '1234'));
    await page.evaluate(clickButton('Criar conta'));
    await audit('boas-vindas (1 de 3)', 'Como se chama');
    await page.evaluate(fillField('Nome do negócio', 'Doces da Joana'));
    await page.evaluate(clickButton('Continuar'));
    await audit('boas-vindas (2 de 3)', 'O que você vende');
    await page.evaluate(clickButton('Continuar'));
    await audit('boas-vindas (3 de 3)', 'Como você recebe');
    await page.evaluate(clickButton('Começar a usar'));
    await audit('início com o tour', 'Início');

    // Conta de demonstração: todas as telas logadas.
    await load('/entrar?voltar=/inicio');
    await page.evaluate(clickButton('demonstração'));
    await audit('início', 'Início');
    await go('/vender', 'vender');
    await page.evaluate(
      `[...document.querySelectorAll('button')].filter((b) => b.textContent.includes('R$'))[0]?.click()`,
    );
    await go('/vender?etapa=pagamento', 'vender: pagamento');
    await go('/vendas', 'vendas');
    const sale = await page.evaluate(firstLink('/vendas/'));
    if (sale) await go(sale, 'detalhe da venda');
    await go('/fiado', 'fiado');
    const account = await page.evaluate(firstLink('/fiado/'));
    if (account) await go(account, 'conta do cliente');
    await go('/clientes', 'clientes');
    await go('/estoque', 'estoque');
    const product = await page.evaluate(firstLink('/estoque/', 'novo'));
    await go('/estoque/novo', 'novo produto');
    if (product) await go(product, 'editar produto');
    await go('/caixa', 'caixa');
    await go('/relatorios', 'relatórios');
    await go('/ajustes', 'ajustes');
    await go('/ajuda', 'ajuda');
    await go('/mais', 'mais');
    await go('/design-system', 'design system');
  } finally {
    await page.close();
  }

  const failed = results.filter((r) => r.violations.length > 0 || r.scrollWidth > opts.width);
  console.log(`\n${results.length - failed.length} de ${results.length} telas sem problemas.`);
  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
