import { useId } from 'react';
import { CircleQuestionMark } from 'lucide-react';
import { cx } from '@/lib/cx.js';
import styles from './HelpTip.module.css';

/**
 * Botão "?" que abre uma explicação curta ao lado.
 * Usa a Popover API nativa (abre/fecha, Esc e clique fora sem JavaScript)
 * e CSS Anchor Positioning para ficar grudado no botão.
 *
 * @param {object} props
 * @param {string} props.title assunto da ajuda (ex.: "O que é fiado?")
 * @param {import('react').ReactNode} props.children explicação em linguagem simples
 */
export function HelpTip({ title, children, className }) {
  const id = useId();
  const anchorName = `--help-${id.replace(/[^a-zA-Z0-9-]/g, '')}`;

  return (
    <span className={cx(styles.wrapper, className)}>
      <button
        type="button"
        className={styles.trigger}
        popoverTarget={id}
        aria-label={`Ajuda: ${title}`}
        title={title}
        style={{ anchorName }}
      >
        <CircleQuestionMark size={22} strokeWidth={2.25} aria-hidden="true" />
      </button>
      <div id={id} popover="auto" className={styles.bubble} style={{ positionAnchor: anchorName }}>
        <p className={styles.title}>{title}</p>
        <div className={styles.content}>{children}</div>
      </div>
    </span>
  );
}
