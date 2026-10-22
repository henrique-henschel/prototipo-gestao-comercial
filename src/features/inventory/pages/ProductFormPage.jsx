import { ROUTES } from '@/app/routes.js';
import { ComingSoon } from '@/components/layout';

/** Cadastro e edição de produto (rotas /estoque/novo e /estoque/:productId). Em construção: chega na fase 7. */
export default function ProductFormPage() {
  return (
    <ComingSoon
      title="Produto"
      description="Nome, preço, custo e estoque."
      phase={7}
      backTo={ROUTES.inventory}
    />
  );
}
