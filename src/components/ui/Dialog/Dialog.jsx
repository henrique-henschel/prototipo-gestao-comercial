import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '../IconButton/IconButton.jsx';
import { cx } from '@/lib/cx.js';
import styles from './Dialog.module.css';

/**
 * Janela modal sobre o `<dialog>` nativo: foco preso, tecla Esc, camada superior
 * e fundo escurecido vêm do navegador. Entrada e saída animadas só com CSS
 * (`@starting-style` + `transition-behavior: allow-discrete`).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose chamado por Esc, clique fora ou botão fechar
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {import('react').ReactNode} [props.footer] ações (ficam fixas embaixo)
 * @param {'center'|'sheet'} [props.variant='center'] `sheet` sobe de baixo no celular
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.dismissible=true] permite fechar clicando fora/Esc
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  variant = 'center',
  size = 'md',
  dismissible = true,
  className,
  children,
}) {
  const ref = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal?.();
    if (!open && dialog.open) dialog.close?.();
  }, [open]);

  const handleCancel = (event) => {
    // Esc: quem decide fechar é o estado do React.
    event.preventDefault();
    if (dismissible) onClose();
  };

  const handleBackdropClick = (event) => {
    if (dismissible && event.target === ref.current) onClose();
  };

  return (
    // O clique no fundo é atalho de mouse/toque; pelo teclado, Esc e o botão fechar cumprem o papel.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      className={cx(styles.dialog, styles[variant], styles[size], className)}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      <div className={styles.surface}>
        <header className={styles.header}>
          {variant === 'sheet' && <span className={styles.grabber} aria-hidden="true" />}
          <div className={styles.headings}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className={styles.description}>
                {description}
              </p>
            )}
          </div>
          <IconButton label="Fechar" icon={X} variant="soft" onClick={onClose} className={styles.close} />
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </dialog>
  );
}

/**
 * Painel que sobe da parte de baixo da tela no celular (perto do polegar)
 * e vira janela central em telas maiores.
 * @param {Omit<Parameters<typeof Dialog>[0], 'variant'>} props
 */
export function BottomSheet(props) {
  return <Dialog {...props} variant="sheet" />;
}
