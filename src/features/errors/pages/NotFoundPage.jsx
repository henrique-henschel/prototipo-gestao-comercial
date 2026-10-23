import { House } from 'lucide-react';
import { Link } from 'react-router';
import { APP_NAME } from '@/app/config.js';
import { ROUTES } from '@/app/routes.js';
import { CenteredLayout } from '@/components/layout';
import { Button, Card, EmptyState } from '@/components/ui';

/** 404 amigável: explica em palavras simples e leva de volta ao início. */
export default function NotFoundPage() {
  return (
    <CenteredLayout>
      <title>{`Página não encontrada · ${APP_NAME}`}</title>
      <Card>
        <EmptyState
          titleAs="h1"
          emoji="🧭"
          title="Não achamos essa página"
          description="O endereço pode estar errado ou a página mudou de lugar."
          action={
            <Button as={Link} to={ROUTES.home} size="lg" icon={House}>
              Ir para o início
            </Button>
          }
        />
      </Card>
    </CenteredLayout>
  );
}
