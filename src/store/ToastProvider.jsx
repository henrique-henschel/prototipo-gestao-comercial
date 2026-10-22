import { useCallback, useMemo, useState } from 'react';
import { Toaster } from '@/components/ui/Toast/Toaster.jsx';
import { ToastContext } from './toast-context.js';

const DEFAULT_DURATION = 5000;
const ACTION_DURATION = 8000;
const MAX_VISIBLE = 3;

let sequence = 0;

/**
 * Guarda a fila de avisos e renderiza o `Toaster`.
 * Mantém no máximo 3 avisos visíveis; o mais antigo sai primeiro.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((options) => {
    sequence += 1;
    const id = `toast-${sequence}`;
    const toast = {
      id,
      tone: 'success',
      duration: options.action ? ACTION_DURATION : DEFAULT_DURATION,
      ...options,
    };
    setToasts((current) => [...current, toast].slice(-MAX_VISIBLE));
    return id;
  }, []);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
