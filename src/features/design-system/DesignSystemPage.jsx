import { Contrast, Monitor, Moon, NotebookPen, Sun } from 'lucide-react';
import { SegmentedControl } from '@/components/ui';
import { APP_NAME } from '@/app/config.js';
import { usePreferences } from '@/hooks/usePreferences.js';
import { FONT_SCALES } from '@/store/preferences-context.js';
import { ComponentDemos } from './ComponentDemos.jsx';
import { Foundations } from './Foundations.jsx';
import styles from './DesignSystemPage.module.css';

const NAV = [
  { id: 'principios', label: 'Princípios' },
  { id: 'cores', label: 'Cores' },
  { id: 'tipografia', label: 'Tipografia' },
  { id: 'espaco-forma', label: 'Espaço e forma' },
  { id: 'botoes', label: 'Botões' },
  { id: 'campos', label: 'Campos' },
  { id: 'valores', label: 'Valores' },
  { id: 'selecao', label: 'Seleção' },
  { id: 'status', label: 'Status' },
  { id: 'cards', label: 'Cards' },
  { id: 'graficos', label: 'Gráficos' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'sobreposicoes', label: 'Janelas e ajuda' },
  { id: 'diversos', label: 'Pessoas e busca' },
];

const THEMES = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'contrast', label: 'Contraste', icon: Contrast },
];

/**
 * Catálogo vivo do design system (/design-system): tokens e todos os
 * componentes de `components/ui`, com troca de tema e tamanho do texto.
 */
export default function DesignSystemPage() {
  const { preferences, setPreference } = usePreferences();

  return (
    <div className={styles.page}>
      <a href="#conteudo" className={styles.skipLink}>
        Pular para o conteúdo
      </a>

      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            <NotebookPen size={22} strokeWidth={2.25} />
          </span>
          <div>
            <p className={styles.brandName}>{APP_NAME}</p>
            <p className={styles.brandSub}>Design system</p>
          </div>
        </div>
        <div className={styles.controls}>
          <SegmentedControl
            label="Tema"
            options={THEMES}
            value={preferences.theme}
            onChange={(value) => setPreference('theme', value)}
          />
          <SegmentedControl
            label="Tamanho do texto"
            options={FONT_SCALES.map(({ value, label }) => ({ value: String(value), label }))}
            value={String(preferences.fontScale)}
            onChange={(value) => setPreference('fontScale', Number(value))}
          />
        </div>
      </header>

      <div className={styles.layout}>
        <nav className={styles.nav} aria-label="Seções do design system">
          <ul role="list">
            {NAV.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <main id="conteudo" className={styles.main} tabIndex={-1}>
          <div className={styles.intro}>
            <h1>Design system</h1>
            <p>
              Tokens, componentes e padrões de interação da {APP_NAME}. Tudo feito com CSS puro e moderno:
              camadas (<code>@layer</code>), <code>oklch()</code>, <code>light-dark()</code>, container
              queries, <code>:has()</code>, <code>@starting-style</code>, Popover API e Anchor Positioning.
            </p>
          </div>
          <Foundations />
          <ComponentDemos />
        </main>
      </div>
    </div>
  );
}
