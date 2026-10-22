import { NotebookPen } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '@/app/config.js';
import styles from './App.module.css';

/**
 * Tela provisória da Fase 1 (fundação). Será substituída pelo roteador
 * e pelo AppShell na Fase 4.
 */
export default function App() {
  return (
    <main className={styles.boot}>
      <div className={styles.logo} aria-hidden="true">
        <NotebookPen size={40} strokeWidth={2.25} />
      </div>
      <h1 className={styles.title}>{APP_NAME}</h1>
      <p className={styles.tagline}>{APP_TAGLINE}</p>
      <p className={styles.status}>Fundação do projeto pronta. Próxima etapa: design system.</p>
    </main>
  );
}
