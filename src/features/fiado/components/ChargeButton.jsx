import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { useSettings } from '@/hooks/useSettings.js';
import { whatsappLink } from '@/lib/whatsapp.js';
import { chargeText } from '../charge.js';

/**
 * "Cobrar no WhatsApp" (regra 3.9): abre o WhatsApp do cliente com a mensagem educada
 * pronta. Sem WhatsApp cadastrado, não aparece: quem chama decide o que mostrar no lugar.
 *
 * @param {object} props
 * @param {import('@/domain/models.js').Customer} props.customer
 * @param {{ balanceCents: number, nextDueDate: string|null }} props.summary de `customerFiadoSummary`
 * @param {'secondary'|'ghost'} [props.variant='secondary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.fullWidth]
 */
export function ChargeButton({ customer, summary, variant = 'secondary', size = 'md', fullWidth }) {
  const { business, settings } = useSettings();
  if (!customer.phone || !(summary.balanceCents > 0)) return null;

  const href = whatsappLink({
    phone: customer.phone,
    text: chargeText({ customer, summary, businessName: business?.name, pixKey: settings?.pixKey }),
  });

  return (
    <Button
      as="a"
      href={href}
      target="_blank"
      rel="noreferrer"
      variant={variant}
      size={size}
      icon={MessageCircle}
      fullWidth={fullWidth}
    >
      Cobrar no WhatsApp
      <span className="visually-hidden">: {customer.name}</span>
    </Button>
  );
}
