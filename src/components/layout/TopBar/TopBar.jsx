import { CircleQuestionMark } from 'lucide-react';
import { Link } from 'react-router';
import { ROUTES } from '@/app/routes.js';
import { Button } from '@/components/ui';
import { useSettings } from '@/hooks/useSettings.js';
import { today } from '@/lib/date.js';
import { formatDateMedium } from '@/lib/format.js';
import { Brand } from '../Brand/Brand.jsx';
import styles from './TopBar.module.css';
import { cx } from '@/lib/cx.js';

/**
 * Barra de cima do celular: o nome do negócio, a data de hoje e o atalho da ajuda.
 */
export function TopBar() {
  const { business } = useSettings();

  return (
    <header className={cx(styles.topbar, 'no-print')}>
      <Link to={ROUTES.home} className={styles.brandLink}>
        <Brand title={business?.name || undefined} subtitle={formatDateMedium(today())} wrap />
      </Link>
      <Button as={Link} to={ROUTES.help} variant="ghost" size="sm" icon={CircleQuestionMark}>
        Ajuda
      </Button>
    </header>
  );
}
