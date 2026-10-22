import { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { APP_NAME } from '@/app/config.js';
import { CenteredLayout } from '@/components/layout';
import { Button, Card, EmptyState } from '@/components/ui';
import NotFoundPage from './NotFoundPage.jsx';

/**
 * Erro inesperado numa tela (inclusive falha ao baixar o código dela, comum com
 * internet ruim). Oferece tentar de novo sem mostrar detalhes técnicos.
 */
export default function RouteErrorPage() {
  const error = useRouteError();

  useEffect(() => {
    console.error(error);
  }, [error]);

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  return (
    <CenteredLayout>
      <title>{`Algo deu errado · ${APP_NAME}`}</title>
      <Card>
        <EmptyState
          tone="danger"
          emoji="😕"
          title="Algo deu errado"
          description="Pode ser a internet. Tente de novo; se continuar, feche e abra o app."
          action={
            <Button size="lg" icon={RotateCcw} onClick={() => window.location.reload()}>
              Tentar de novo
            </Button>
          }
        />
      </Card>
    </CenteredLayout>
  );
}
