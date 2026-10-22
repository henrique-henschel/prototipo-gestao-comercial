import { ChevronRight, LogOut, Palette } from 'lucide-react';
import { Link } from 'react-router';
import { ROUTES } from '@/app/routes.js';
import { MORE_ITEMS, PageHeader } from '@/components/layout';
import { Avatar, Button, Card } from '@/components/ui';
import { useLogout } from '@/hooks/useLogout.js';
import { useSession } from '@/hooks/useSession.js';
import { useSettings } from '@/hooks/useSettings.js';
import styles from './MorePage.module.css';

/**
 * "Mais" (celular): as áreas que não cabem na barra de baixo, a conta e o botão de sair.
 * No computador, a barra lateral já mostra tudo, mas a tela continua acessível.
 */
export default function MorePage() {
  const { user } = useSession();
  const { business } = useSettings();
  const logout = useLogout();

  return (
    <>
      <PageHeader title="Mais" description="Todas as outras áreas do app." />

      <nav aria-label="Outras áreas">
        <ul role="list" className={styles.list}>
          {MORE_ITEMS.map(({ to, label, description, icon: Icon }) => (
            <li key={to}>
              <Card as={Link} to={to} interactive padding="sm" className={styles.row}>
                <span className={styles.icon} aria-hidden="true">
                  <Icon size={24} strokeWidth={2.25} />
                </span>
                <span className={styles.text}>
                  <span className={styles.label}>{label}</span>
                  <span className={styles.description}>{description}</span>
                </span>
                <ChevronRight className={styles.chevron} size={22} aria-hidden="true" />
              </Card>
            </li>
          ))}
        </ul>
      </nav>

      {user && (
        <section aria-labelledby="minha-conta" className={styles.account}>
          <h2 id="minha-conta" className={styles.sectionTitle}>
            Minha conta
          </h2>
          <Card className={styles.accountCard}>
            <div className={styles.user}>
              <Avatar name={user.name} />
              <div className={styles.userText}>
                <p className={styles.label}>{user.name}</p>
                <p className={styles.description}>{business?.name || user.email}</p>
              </div>
            </div>
            <Button variant="secondary" icon={LogOut} onClick={logout} fullWidth>
              Sair da conta
            </Button>
          </Card>
        </section>
      )}

      <p className={styles.footer}>
        <Link to={ROUTES.designSystem} className={styles.footerLink}>
          <Palette size={18} aria-hidden="true" />
          Catálogo visual do app (para a equipe)
        </Link>
      </p>
    </>
  );
}
