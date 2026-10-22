import { useCallback, useEffect, useState } from 'react';
import { LOCALE } from '@/app/config.js';

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * Leitura em voz alta (Web Speech API), em português do Brasil.
 * Ajuda quem tem dificuldade de leitura a conferir valores e troco.
 *
 * @returns {{ supported: boolean, speaking: boolean, speak: (text: string) => void, stop: () => void }}
 */
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text) => {
    if (!supported || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LOCALE;
    utterance.rate = 0.95;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang?.replace('_', '-') === LOCALE);
    if (voice) utterance.voice = voice;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => stop, [stop]);

  return { supported, speaking, speak, stop };
}
