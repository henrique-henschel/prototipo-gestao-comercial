import { ClipboardCheck, PackageMinus, PackagePlus, ShoppingCart, Undo2 } from 'lucide-react';
import { formatQuantity } from '@/lib/format.js';

/**
 * Como cada tipo de movimentação aparece na tela (sempre ícone + texto). Os rótulos vêm de
 * `STOCK_MOVEMENT_TYPES`; aqui ficam o ícone, o tom e os textos das ações.
 */
export const MOVEMENT_UI = {
  entrada: {
    icon: PackagePlus,
    tone: 'success',
    action: 'Entrada de mercadoria',
    title: 'Chegou mercadoria',
    done: 'Entrada registrada',
  },
  ajuste: {
    icon: ClipboardCheck,
    tone: 'info',
    action: 'Contar o estoque',
    title: 'Contar o estoque',
    done: 'Contagem registrada',
  },
  perda: {
    icon: PackageMinus,
    tone: 'danger',
    action: 'Perda',
    title: 'Registrar perda',
    done: 'Perda registrada',
  },
  venda: { icon: ShoppingCart, tone: 'neutral' },
  estorno: { icon: Undo2, tone: 'neutral' },
};

/** Movimentos que o vendedor faz à mão, na ordem dos botões. */
export const MANUAL_MOVEMENTS = ['entrada', 'ajuste', 'perda'];

/**
 * Variação com sinal: "+12 un", "−2 un", "0 un".
 * @param {number} delta
 * @param {string} unitShort
 */
export function signedQuantity(delta, unitShort) {
  const text = formatQuantity(Math.abs(delta), unitShort);
  return delta > 0 ? `+${text}` : delta < 0 ? `−${text}` : text;
}
