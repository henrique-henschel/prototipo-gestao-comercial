import { Hammer } from 'lucide-react';
import { Card, EmptyState } from '@/components/ui';
import { PageHeader } from '../PageHeader/PageHeader.jsx';

/**
 * Tela ainda em construção (protótipo em fases). Mantém o título e o cabeçalho reais,
 * para a navegação já funcionar de ponta a ponta.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.description] frase do PageHeader
 * @param {number} props.phase fase do plano em que a tela será entregue
 * @param {string} [props.backTo]
 */
export function ComingSoon({ title, description, phase, backTo }) {
  return (
    <>
      <PageHeader title={title} description={description} backTo={backTo} />
      <Card>
        <EmptyState
          icon={Hammer}
          title="Esta tela está sendo construída"
          description={`Ela chega na fase ${phase} do protótipo. Enquanto isso, use o menu para conhecer as outras áreas.`}
        />
      </Card>
    </>
  );
}
