import styles from './SkipLink.module.css';

/**
 * "Pular para o conteúdo": primeiro item do teclado, aparece só ao receber foco.
 * @param {{ targetId?: string }} props id do `<main>`
 */
export function SkipLink({ targetId = 'conteudo' }) {
  return (
    <a href={`#${targetId}`} className={styles.skipLink}>
      Pular para o conteúdo
    </a>
  );
}
