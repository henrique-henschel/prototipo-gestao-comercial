import { useContext } from 'react';
import { ToastContext } from '@/store/toast-context.js';

/**
 * Mostra avisos rápidos (toasts). Precisa estar dentro de `<ToastProvider>`.
 * @example
 * const toast = useToast();
 * toast.show({ message: 'Venda registrada', action: { label: 'Desfazer', onClick: undo } });
 * @returns {import('@/store/toast-context.js').ToastApi}
 */
export function useToast() {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast precisa estar dentro de <ToastProvider>.');
  return api;
}
