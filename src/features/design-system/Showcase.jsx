import styles from './DesignSystemPage.module.css';

/**
 * Seção do catálogo, com âncora para a navegação lateral.
 * @param {{ id: string, title: string, description?: string, children: import('react').ReactNode }} props
 */
export function Section({ id, title, description, children }) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
      <header className={styles.sectionHeader}>
        <h2 id={`${id}-title`}>{title}</h2>
        {description && <p className={styles.sectionDescription}>{description}</p>}
      </header>
      {children}
    </section>
  );
}

/**
 * Caixa de exemplo com legenda.
 * @param {{ title: string, note?: string, wide?: boolean, children: import('react').ReactNode }} props
 */
export function Example({ title, note, wide = false, children }) {
  return (
    <figure className={wide ? `${styles.example} ${styles.exampleWide}` : styles.example}>
      <figcaption className={styles.exampleCaption}>
        <span className={styles.exampleTitle}>{title}</span>
        {note && <span className={styles.exampleNote}>{note}</span>}
      </figcaption>
      <div className={styles.exampleBody}>{children}</div>
    </figure>
  );
}
