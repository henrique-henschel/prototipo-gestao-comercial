#!/usr/bin/env node
/**
 * Gera os ícones PNG do app (manifest e "Adicionar à tela inicial") a partir do desenho do
 * `public/favicon.svg`, desenhando no Chrome/Edge headless (sem dependências).
 *
 * Uso: npm run icons
 *
 * Saída em public/:
 *   icon-192.png, icon-512.png       ícone comum (cantos arredondados, fundo transparente)
 *   icon-maskable-512.png            ícone "maskable": fundo cheio e desenho dentro da zona
 *                                    segura, para o Android recortar no formato do aparelho
 *   apple-touch-icon.png (180)       iPhone/iPad: fundo cheio (o sistema arredonda os cantos)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openPage } from './browser.mjs';

const favicon = readFileSync(resolve('public/favicon.svg'), 'utf8');
const background = favicon.match(/<rect width="64" height="64" rx="16" fill="([^"]+)"\/>/)?.[1];
if (!background) throw new Error('Não achei o fundo do favicon.svg (o <rect> de 64×64).');
const drawing = favicon
  .replace(/<svg[^>]*>|<\/svg>/g, '')
  .replace(/<rect width="64" height="64"[^>]*\/>/, '')
  .trim();

/** Fundo cheio e o caderno reduzido no centro (zona segura do ícone maskable). */
const fullBleed = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${background}"/>
  <g transform="translate(32 32) scale(0.8) translate(-32 -32)">${drawing}</g>
</svg>`;

const ICONS = [
  { file: 'icon-192.png', size: 192, svg: favicon },
  { file: 'icon-512.png', size: 512, svg: favicon },
  { file: 'icon-maskable-512.png', size: 512, svg: fullBleed },
  { file: 'apple-touch-icon.png', size: 180, svg: fullBleed },
];

const page = await openPage({ width: 512, height: 512, theme: 'light' });
try {
  await page.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  for (const { file, size, svg } of ICONS) {
    const sized = svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
    const html = `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${sized}`;
    await page.send('Page.navigate', {
      url: `data:text/html;base64,${Buffer.from(html).toString('base64')}`,
    });
    await new Promise((done) => setTimeout(done, 300));
    const shot = await page.send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: size, height: size, scale: 1 },
    });
    writeFileSync(resolve('public', file), Buffer.from(shot.result.data, 'base64'));
    console.log(`public/${file} (${size}×${size})`);
  }
} finally {
  await page.close();
}
