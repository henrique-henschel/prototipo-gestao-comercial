import { ROUTES } from '@/app/routes.js';
import { ComingSoon } from '@/components/layout';

/** Conta de fiado de um cliente. Em construção: chega na fase 6. */
export default function CustomerAccountPage() {
  return (
    <ComingSoon
      title="Conta do cliente"
      description="Compras no fiado, pagamentos e cobrança."
      phase={6}
      backTo={ROUTES.fiado}
    />
  );
}
