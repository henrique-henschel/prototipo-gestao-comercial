import { LogOut } from 'lucide-react';
import { Link, NavLink } from 'react-router';
import { ROUTES } from '@/app/routes.js';
import { Avatar, Button } from '@/components/ui';
import { useLogout } from '@/hooks/useLogout.js';
import { useSession } from '@/hooks/useSession.js';
import { useSettings } from '@/hooks/useSettings.js';
import { Brand } from '../Brand/Brand.jsx';
import { NAV, SIDEBAR_FOOTER, SIDEBAR_MAIN } from '../navigation.js';
import styles from './Sidebar.module.css';

function NavItem({ item }) {
  const Icon = item.icon;
  return (
    <li>
      <NavLink to={item.to} className={styles.link}>
        <Icon size={22} strokeWidth={2.25} aria-hidden="true" />
        <span>{item.label}</span>
      </NavLink>
    </li>
  );
}

/**
 * Barra lateral do computador e do tablet: marca, "Vender" em destaque, áreas do
 * app com ícone e nome, ajustes, ajuda e a conta.
 */
export function Sidebar() {
  const { user } = useSession();
  const { business } = useSettings();
  const logout = useLogout();

  return (
    <aside className={styles.sidebar}>
      <Link to={ROUTES.home} className={styles.brandLink}>
        <Brand subtitle={business?.name || undefined} />
      </Link>

      <Button as={NavLink} to={NAV.sell.to} size="lg" icon={NAV.sell.icon} fullWidth className={styles.sell}>
        {NAV.sell.label}
      </Button>

      <nav aria-label="Menu principal" className={styles.nav}>
        <ul role="list" className={styles.list}>
          {SIDEBAR_MAIN.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </ul>
        <ul role="list" className={styles.list}>
          {SIDEBAR_FOOTER.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </ul>
      </nav>

      {user && (
        <div className={styles.account}>
          <div className={styles.user}>
            <Avatar name={user.name} size="sm" />
            <div className={styles.userText}>
              <p className={styles.userName}>{user.name}</p>
              <p className={styles.userEmail}>{user.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" icon={LogOut} onClick={logout} fullWidth>
            Sair
          </Button>
        </div>
      )}
    </aside>
  );
}
