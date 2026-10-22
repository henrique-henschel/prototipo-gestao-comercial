import { Banknote, CreditCard, NotebookText, QrCode, WalletCards } from 'lucide-react';

/** Ícone de cada forma de pagamento, sempre o mesmo em qualquer tela (sempre junto do nome). */
export const PAYMENT_ICONS = {
  dinheiro: Banknote,
  pix: QrCode,
  debito: CreditCard,
  credito: WalletCards,
  fiado: NotebookText,
};
