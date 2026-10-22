import { ComingSoon } from '@/components/layout';
import { useSession } from '@/hooks/useSession.js';

/** Início (dashboard). Em construção: chega na fase 9. */
export default function HomePage() {
  const { user } = useSession();
  const firstName = user?.name.split(' ')[0];

  return (
    <ComingSoon
      title="Início"
      description={
        firstName ? `Olá, ${firstName}! Aqui você vai ver como está o seu negócio hoje.` : undefined
      }
      phase={9}
    />
  );
}
