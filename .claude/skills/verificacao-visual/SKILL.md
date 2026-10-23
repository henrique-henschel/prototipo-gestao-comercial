---
name: verificacao-visual
description: Como conferir em imagem uma mudança de interface deste projeto com npm run shot (capturas headless em 360px e 1440px, temas claro, escuro e alto contraste, texto Enorme, telas logadas pela conta de demonstração e checagem de rolagem horizontal). Use sempre que mudar uma tela ou componente visual, antes de dar a tarefa por concluída.
---

# Verificação visual

Toda mudança de interface é conferida em imagem, não só nos testes. Com `npm run dev` rodando, `npm run shot` (`scripts/screenshot.mjs`) abre o Chrome/Edge em modo headless e salva a captura em `shots/`, pasta ignorada pelo git. Depois, leia a imagem para conferir.

```bash
npm run shot -- inicio.png                                   # 1440px, tema claro
npm run shot -- celular.png vender --width 360 --height 800 --theme dark
npm run shot -- inteira.png design-system --full             # página inteira
npm run shot -- secao.png design-system --eval "document.querySelector('#valores').scrollIntoView({ behavior: 'instant' })"
npm run shot -- overflow.png --width 360 --eval "document.documentElement.scrollWidth"   # deve imprimir 360
npm run shot -- dialogo.png --eval "[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Vender fiado')).click()"
```

- No Git Bash, escreva a rota **sem barra inicial** (`vender`, não `/vender`), porque o MSYS converte `/x` em um caminho do Windows.
- Âncoras `#secao` não rolam sozinhas: use `--eval` com `scrollIntoView`.
- Tema alto contraste e tamanho do texto: abra `design-system`, clique nos rótulos do seletor (ex.: `--eval "(async () => { [...document.querySelectorAll('label')].find((l) => l.textContent.trim() === 'Contraste').click(); })()"`) e depois navegue dentro do app com `history.pushState(null, '', '/entrar?voltar=/fiado'); dispatchEvent(new PopStateEvent('popstate'))`. As preferências valem até recarregar a página.
- **Telas logadas:** a sessão vive só em memória, então toda captura começa deslogada. Abra `entrar?voltar=/rota` e entre pela conta de demonstração no `--eval`; a guarda leva para a rota pedida:

  ```bash
  npm run shot -- fiado.png "entrar?voltar=/fiado" --width 360 --height 800 --eval "(async () => { [...document.querySelectorAll('button')].find((b) => b.textContent.includes('demonstração')).click(); await new Promise((r) => setTimeout(r, 2500)); return location.pathname + ' ' + document.documentElement.scrollWidth; })()"
  ```

- O `--eval` precisa ser **uma linha só** (quebras de linha dão `SyntaxError`). Para scripts longos, guarde num arquivo e passe `"$(tr '\n' ' ' < arquivo.js)"`.
- Com `--full`, elementos fixos (como a `BottomNav`) aparecem no meio da imagem: é efeito da captura, não bug. Gráficos do Recharts saem vazios com `--full` (veja as lições do `CLAUDE.md`).
- Mínimo por tela: 360px e 1440px, claro e escuro, e sem rolagem horizontal. Para telas novas, inclua também alto contraste com texto "Enorme".
- **Impressão e PDF:** `--media print` emula a impressão (`print.css`) na captura; com o nome terminando em `.pdf`, a saída é o PDF A4 que o navegador imprimiria. O `beforeprint` não dispara sozinho na captura: chame `dispatchEvent(new Event('beforeprint'))` no `--eval` para abrir os "Ver os números".
- **`voltar` com mais de um parâmetro:** o `&` da rota pedida vira parâmetro do `/entrar`. Use `encodeURIComponent` (ex.: `entrar?voltar=%2Frelatorios%3Ftipo%3Dcaixa%26periodo%3D7dias`).
- **Porta ocupada:** se o `npm run dev` subir em outra porta (5174), passe `--base http://localhost:5174`.
- **Acessibilidade de todas as telas:** `npm run a11y` (`scripts/a11y.mjs`) entra pela demonstração, percorre as 24 telas e estados e roda o axe, medindo também a rolagem horizontal (`--width 360`, `--theme dark|contrast`, `--text 1.5`, `--only caixa`). Sai com código 1 se algo falhar.
- **Estados carregando e erro:** em Ajustes > Modo demonstração, ligue "Simular internet lenta" ou "Simular falha de internet" e toque em "Carregar tudo de novo"; depois navegue com `history.pushState`.
- **Botões de janelas fechadas:** os `<dialog>` fechados continuam no DOM. Num `--eval`, procure botões dentro de `dialog[open]` (ou da tela), senão um "assim mesmo" escondido pode ser clicado.
- **Imagens leves:** com o nome terminando em `.webp`, a captura sai comprimida (as do README ficam em `docs/capturas/`).
- Se o Claude in Chrome estiver conectado, ele também serve para interação real, mas o `npm run shot` não depende dele.
