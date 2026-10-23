import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, Undo2, X } from 'lucide-react';
import { cx } from '@/lib/cx.js';
import styles from './Toaster.module.css';

const TONE_ICON = { success: CircleCheck, info: Info, warning: TriangleAlert, danger: CircleAlert };
const EXIT_MS = 200;

/**
 * Região de avisos. Fica na camada superior do navegador (`popover="manual"`),
 * então aparece até por cima de janelas modais abertas.
 *
 * @param {object} props
 * @param {Array<import('@/store/toast-context.js').ToastOptions & { id: string }>} props.toasts
 * @param {(id: string) => void} props.onDismiss
 */
export function Toaster({ toasts, onDismiss }) {
  const ref = useRef(null);

  // Mostra o contêiner uma vez; ele é transparente e não captura cliques.
  useEffect(() => {
    const node = ref.current;
    if (node && !node.matches?.(':popover-open')) node.showPopover?.();
  }, []);

  // Um modal aberto depois do contêiner ficaria por cima dele: reabrir o
  // popover o coloca de volta no topo da camada superior.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || toasts.length === 0 || !document.querySelector('dialog:modal')) return;
    node.hidePopover?.();
    node.showPopover?.();
  }, [toasts]);

  return (
    <div ref={ref} popover="manual" className={cx(styles.toaster, 'no-print')}>
      <ol className={styles.list} role="status" aria-live="polite" aria-label="Avisos">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </ol>
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const { id, message, description, tone, action, duration } = toast;
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const remaining = useRef(duration);
  const Icon = TONE_ICON[tone] ?? Info;

  const close = () => {
    setLeaving(true);
    setTimeout(() => onDismiss(id), EXIT_MS);
  };

  // Temporizador com pausa: ao passar o mouse ou focar no aviso, o tempo para.
  useEffect(() => {
    if (paused || leaving) return undefined;
    const startedAt = Date.now();
    const timer = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => onDismiss(id), EXIT_MS);
    }, remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - startedAt;
    };
  }, [paused, leaving, id, onDismiss]);

  return (
    <li
      className={cx(styles.toast, styles[tone], leaving && styles.leaving)}
      style={{ '--duration': `${duration}ms` }}
      data-paused={paused || undefined}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon className={styles.icon} size={24} strokeWidth={2.25} aria-hidden="true" />
      <div className={styles.text}>
        <p className={styles.message}>{message}</p>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {action && (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            action.onClick();
            close();
          }}
        >
          {/^desfazer$/i.test(action.label) && <Undo2 size={18} strokeWidth={2.5} aria-hidden="true" />}
          {action.label}
        </button>
      )}
      <button type="button" className={styles.close} aria-label="Fechar aviso" onClick={close}>
        <X size={18} strokeWidth={2.5} aria-hidden="true" />
      </button>
      <span className={styles.timer} aria-hidden="true" />
    </li>
  );
}
