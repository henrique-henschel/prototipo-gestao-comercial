import { APP_TAGLINE } from '@/app/config.js';
import { cx } from '@/lib/cx.js';
import { Brand } from '../Brand/Brand.jsx';
import { SkipLink } from '../SkipLink/SkipLink.jsx';
import styles from './CenteredLayout.module.css';

/**
 * Tela fora do app logado (entrar, cadastro, boas-vindas, página não encontrada):
 * marca no topo e o conteúdo num cartão centralizado.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {boolean} [props.showTagline] frase do app abaixo da marca
 * @param {'sm'|'md'} [props.width='sm'] `md` para conteúdos mais largos (boas-vindas)
 */
export function CenteredLayout({ children, showTagline = false, width = 'sm' }) {
  return (
    <div className={styles.page}>
      <SkipLink targetId="conteudo" />
      <header className={styles.header}>
        <Brand size="lg" />
        {showTagline && <p className={styles.tagline}>{APP_TAGLINE}</p>}
      </header>
      <main id="conteudo" tabIndex={-1} className={cx(styles.main, styles[width])}>
        {children}
      </main>
    </div>
  );
}
