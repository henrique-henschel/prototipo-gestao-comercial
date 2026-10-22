import { ROUTES } from '@/app/routes.js';
import { ComingSoon } from '@/components/layout';

/** Detalhe de uma venda, com cancelamento. Em construção: chega na fase 5. */
export default function SaleDetailPage() {
  return (
    <ComingSoon title="Venda" description="Itens, pagamento e recibo." phase={5} backTo={ROUTES.sales} />
  );
}
