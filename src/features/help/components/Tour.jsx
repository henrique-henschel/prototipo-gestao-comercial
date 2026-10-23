import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button, Dialog } from '@/components/ui';
import { TOUR_STEPS } from '../tourSteps.js';
import styles from './Tour.module.css';

/** Texto do passo com os nomes dos menus em negrito. */
function StepText({ text, strong = [] }) {
  if (strong.length === 0) return text;
  const pattern = new RegExp(`(${strong.join('|')})`);
  return text
    .split(pattern)
    .map((part, index) => (strong.includes(part) ? <strong key={index}>{part}</strong> : part));
}

/**
 * Tour de primeiro uso: uma janela com poucos passos, "Pular" sempre à mão e "Voltar".
 * Abre sozinho depois das boas-vindas e pode ser refeito na Ajuda.
 * @param {{ open: boolean, onClose: () => void }} props
 */
export function Tour({ open, onClose }) {
  const [index, setIndex] = useState(0);
  const step = TOUR_STEPS[index];
  const isLast = index === TOUR_STEPS.length - 1;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={step.title}
      size="sm"
      footer={
        <>
          {index > 0 ? (
            <Button variant="secondary" icon={ArrowLeft} onClick={() => setIndex(index - 1)}>
              Voltar
            </Button>
          ) : (
            <Button variant="ghost" onClick={onClose}>
              Pular
            </Button>
          )}
          {isLast ? (
            <Button size="lg" icon={Check} onClick={onClose}>
              Começar
            </Button>
          ) : (
            <Button size="lg" iconRight={ArrowRight} onClick={() => setIndex(index + 1)}>
              Próximo
            </Button>
          )}
        </>
      }
    >
      <div className={styles.step} aria-live="polite">
        <span className={styles.emoji} aria-hidden="true">
          {step.emoji}
        </span>
        <p className={styles.text}>
          <StepText text={step.text} strong={step.strong} />
        </p>
        <p className={styles.progress}>
          Passo {index + 1} de {TOUR_STEPS.length}
        </p>
        <ol className={styles.dots} aria-hidden="true">
          {TOUR_STEPS.map((item, position) => (
            <li key={item.title} data-current={position === index || undefined} />
          ))}
        </ol>
      </div>
    </Dialog>
  );
}
