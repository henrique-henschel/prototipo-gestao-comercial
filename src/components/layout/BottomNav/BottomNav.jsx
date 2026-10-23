import { NavLink, matchPath, useLocation } from 'react-router';
import { cx } from '@/lib/cx.js';
import { BOTTOM_NAV, MORE_ITEMS, NAV } from '../navigation.js';
import styles from './BottomNav.module.css';

/**
 * Barra de baixo do celular: Início, Fiado, Vender (no centro, em destaque), Estoque e Mais.
 * "Mais" fica marcado também nas telas que moram dentro dele (Vendas, Clientes...).
 */
export function BottomNav() {
  const { pathname } = useLocation();
  const insideMore = MORE_ITEMS.some((item) => matchPath({ path: item.to, end: false }, pathname));

  return (
    <nav aria-label="Menu principal" className={cx(styles.bottomNav, 'no-print')}>
      <ul role="list" className={styles.list}>
        {BOTTOM_NAV.map((item) => {
          const Icon = item.icon;
          const isSell = item === NAV.sell;
          const isMore = item === NAV.more;
          return (
            <li key={item.to} className={styles.item}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cx(
                    styles.link,
                    isSell && styles.sell,
                    (isActive || (isMore && insideMore)) && styles.active,
                  )
                }
                aria-current={isMore && insideMore ? 'true' : undefined}
              >
                <span className={styles.icon} aria-hidden="true">
                  <Icon size={isSell ? 28 : 24} strokeWidth={2.25} />
                </span>
                <span className={styles.label}>{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
