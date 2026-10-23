import { Link, useNavigate } from 'react-router';
import { ArrowRight, ChevronDown, Compass } from 'lucide-react';
import { ROUTES } from '@/app/routes.js';
import { PageHeader } from '@/components/layout';
import { Button, Card } from '@/components/ui';
import { FAQ } from '../faq.js';
import { TOUR_STATE } from '../tourSteps.js';
import styles from './HelpPage.module.css';

/**
 * Ajuda: "Ver o passo a passo de novo" (refaz o tour no Início, a ação principal) e as
 * perguntas frequentes por assunto, em linguagem simples, cada uma com o caminho para a
 * tela de que fala. As respostas abrem e fecham com `<details>` (teclado e leitor de tela).
 */
export default function HelpPage() {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Ajuda" description="Respostas rápidas para as dúvidas mais comuns." />

      <div className={styles.layout}>
        <Card className={styles.tour}>
          <span className={styles.tourEmoji} aria-hidden="true">
            🧭
          </span>
          <div className={styles.tourText}>
            <h2 className={styles.tourTitle}>Primeira vez por aqui?</h2>
            <p className={styles.muted}>Veja em 5 passos rápidos o que dá para fazer no app.</p>
          </div>
          <Button
            size="lg"
            icon={Compass}
            onClick={() => navigate(ROUTES.home, { state: TOUR_STATE })}
            className={styles.tourButton}
          >
            Ver o passo a passo de novo
          </Button>
        </Card>

        <nav aria-label="Assuntos da ajuda" className={styles.topics}>
          <ul role="list" className={styles.topicList}>
            {FAQ.map((group) => (
              <li key={group.id}>
                <a href={`#ajuda-${group.id}`} className={styles.topic}>
                  <span aria-hidden="true">{group.emoji}</span> {group.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {FAQ.map((group) => (
          <Card
            key={group.id}
            as="section"
            id={`ajuda-${group.id}`}
            aria-labelledby={`ajuda-${group.id}-titulo`}
            className={styles.group}
          >
            <h2 id={`ajuda-${group.id}-titulo`} className={styles.groupTitle}>
              <span aria-hidden="true">{group.emoji}</span> {group.title}
            </h2>
            <div className={styles.questions}>
              {group.questions.map((item) => (
                <details key={item.question} className={styles.question}>
                  <summary>
                    <span>{item.question}</span>
                    <ChevronDown size={22} aria-hidden="true" className={styles.chevron} />
                  </summary>
                  <div className={styles.answer}>
                    <p>{item.answer}</p>
                    {item.link && (
                      <Link to={item.link.to} className={styles.link}>
                        {item.link.label}
                        <ArrowRight size={18} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
