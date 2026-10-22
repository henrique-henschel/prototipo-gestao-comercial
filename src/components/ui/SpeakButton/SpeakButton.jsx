import { Square, Volume2 } from 'lucide-react';
import { useSpeech } from '@/hooks/useSpeech.js';
import { cx } from '@/lib/cx.js';
import styles from './SpeakButton.module.css';

/**
 * Botão "Ouvir": lê o texto em voz alta. Some sozinho se o navegador não suportar.
 *
 * @param {object} props
 * @param {string} props.text o que será falado (ex.: "Troco: 5 reais e 50 centavos")
 * @param {string} [props.label='Ouvir']
 * @param {boolean} [props.compact] só ícone (com aria-label)
 */
export function SpeakButton({ text, label = 'Ouvir', compact = false, className }) {
  const { supported, speaking, speak, stop } = useSpeech();
  if (!supported) return null;

  const Icon = speaking ? Square : Volume2;
  const currentLabel = speaking ? 'Parar' : label;

  return (
    <button
      type="button"
      className={cx(styles.speak, compact && styles.compact, speaking && styles.speaking, className)}
      onClick={() => (speaking ? stop() : speak(text))}
      aria-label={compact ? currentLabel : undefined}
      title={compact ? currentLabel : undefined}
    >
      <Icon size={20} strokeWidth={2.25} aria-hidden="true" />
      {!compact && <span>{currentLabel}</span>}
    </button>
  );
}
