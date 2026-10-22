import { Example, Section } from './Showcase.jsx';
import styles from './DesignSystemPage.module.css';

const PRINCIPLES = [
  { emoji: '👀', title: 'Entendível em segundos', text: 'Cada tela se explica sozinha, sem manual.' },
  { emoji: '👍', title: 'Uma ação principal', text: 'Grande, clara e perto do polegar.' },
  { emoji: '🏷️', title: 'Ícone + texto', text: 'Sempre com palavras do dia a dia.' },
  { emoji: '💰', title: 'Números em destaque', text: 'Valores grandes, legíveis e alinhados.' },
  { emoji: '↩️', title: 'Errar é barato', text: '"Desfazer" em vez de perguntas confusas.' },
  { emoji: '♿', title: 'Acessível por padrão', text: 'Contraste, teclado, voz e letra grande.' },
];

const ROLES = [
  { name: 'primary', label: 'Primária', meaning: 'Ações principais, marca' },
  { name: 'accent', label: 'Destaque', meaning: 'Fiado, chamadas especiais' },
  { name: 'success', label: 'Sucesso', meaning: 'Pago, quitado, deu certo' },
  { name: 'warning', label: 'Atenção', meaning: 'Vence logo, acabando' },
  { name: 'danger', label: 'Perigo', meaning: 'Atrasado, acabou, cancelar' },
  { name: 'info', label: 'Informação', meaning: 'Dicas e ajuda' },
];

const NEUTRALS = [
  '--surface-page',
  '--surface-1',
  '--surface-2',
  '--surface-3',
  '--border-1',
  '--border-2',
  '--text-3',
  '--text-2',
  '--text-1',
];

const CHART = [1, 2, 3, 4, 5, 6, 7, 8];

const TYPE_SCALE = [
  { token: '--text-money', sample: 'R$ 1.250,00', note: 'Valores em destaque' },
  { token: '--text-3xl', sample: 'Hoje você vendeu', note: 'Número principal da tela' },
  { token: '--text-2xl', sample: 'Quem me deve', note: 'Título da página' },
  { token: '--text-xl', sample: 'Vendas da semana', note: 'Título de seção' },
  { token: '--text-lg', sample: 'Coxinha de frango', note: 'Título de card' },
  { token: '--text-md', sample: 'Texto padrão, com 18px para leitura fácil.', note: 'Corpo (base)' },
  { token: '--text-sm', sample: 'Informação de apoio', note: 'Dicas e legendas' },
  { token: '--text-xs', sample: 'Selos e contadores', note: 'Mínimo permitido' },
];

const SPACES = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16];
const RADII = ['xs', 'sm', 'md', 'lg', 'xl', 'pill'];

export function Foundations() {
  return (
    <>
      <Section
        id="principios"
        title="Princípios"
        description="Quem usa pode ter pouca leitura e pouca prática com celular. Todas as decisões partem daqui."
      >
        <ul className={styles.principles} role="list">
          {PRINCIPLES.map((principle) => (
            <li key={principle.title} className={styles.principle}>
              <span className={styles.principleEmoji} aria-hidden="true">
                {principle.emoji}
              </span>
              <strong>{principle.title}</strong>
              <span className="text-muted text-sm">{principle.text}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="cores"
        title="Cores"
        description="Definidas em oklch() com light-dark(): cada token se ajusta ao tema sozinho. Cor nunca aparece sem ícone e texto."
      >
        <div className={styles.roleGrid}>
          {ROLES.map((role) => (
            <article key={role.name} className={styles.role}>
              <div className={styles.roleSwatch} style={{ background: `var(--color-${role.name})` }}>
                <span style={{ color: `var(--color-on-${role.name})` }}>Aa</span>
              </div>
              <div className={styles.roleSoft} style={{ background: `var(--color-${role.name}-soft)` }}>
                <span style={{ color: `var(--color-${role.name}-text)` }}>Texto sobre suave</span>
              </div>
              <div className={styles.roleInfo}>
                <strong>{role.label}</strong>
                <span className="text-muted text-sm">{role.meaning}</span>
                <code className={styles.code}>--color-{role.name}</code>
              </div>
            </article>
          ))}
        </div>

        <Example title="Neutros" note="superfícies, bordas e textos" wide>
          <div className={styles.neutralRow}>
            {NEUTRALS.map((token) => (
              <div key={token} className={styles.neutral}>
                <span className={styles.neutralChip} style={{ background: `var(${token})` }} />
                <code className={styles.code}>{token}</code>
              </div>
            ))}
          </div>
        </Example>

        <Example
          title="Paleta dos gráficos"
          note="ordem fixa e validada para daltonismo; cada entidade mantém sua cor"
          wide
        >
          <div className={styles.chartRow}>
            {CHART.map((slot) => (
              <div key={slot} className={styles.chartSlot}>
                <span className={styles.chartChip} style={{ background: `var(--chart-${slot})` }} />
                <code className={styles.code}>--chart-{slot}</code>
              </div>
            ))}
          </div>
        </Example>
      </Section>

      <Section
        id="tipografia"
        title="Tipografia"
        description="Atkinson Hyperlegible: criada para máxima distinção entre letras e números (1, l, I · 0, O). Base de 18px, ampliável até 150%."
      >
        <div className={styles.typeList}>
          {TYPE_SCALE.map(({ token, sample, note }) => (
            <div key={token} className={styles.typeRow}>
              <div className={styles.typeMeta}>
                <code className={styles.code}>{token}</code>
                <span className="text-muted text-sm">{note}</span>
              </div>
              <p className={styles.typeSample} style={{ fontSize: `var(${token})` }}>
                {sample}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="espaco-forma"
        title="Espaço e forma"
        description="Tudo em rem: quando o texto cresce, espaços e áreas de toque crescem junto."
      >
        <div className={styles.exampleGrid}>
          <Example title="Espaçamento" note="--space-*">
            <div className={styles.spaceList}>
              {SPACES.map((step) => (
                <div key={step} className={styles.spaceRow}>
                  <code className={styles.code}>{step}</code>
                  <span className={styles.spaceBar} style={{ inlineSize: `var(--space-${step})` }} />
                </div>
              ))}
            </div>
          </Example>
          <Example title="Raios" note="--radius-*">
            <div className={styles.radiusRow}>
              {RADII.map((radius) => (
                <div key={radius} className={styles.radiusItem}>
                  <span className={styles.radiusBox} style={{ borderRadius: `var(--radius-${radius})` }} />
                  <code className={styles.code}>{radius}</code>
                </div>
              ))}
            </div>
          </Example>
          <Example title="Sombras" note="--shadow-1 a 3">
            <div className={styles.shadowRow}>
              {[1, 2, 3].map((level) => (
                <span
                  key={level}
                  className={styles.shadowBox}
                  style={{ boxShadow: `var(--shadow-${level})` }}
                >
                  {level}
                </span>
              ))}
            </div>
          </Example>
          <Example title="Áreas de toque" note="mínimo, principal e destaque">
            <div className={styles.tapRow}>
              {['min', 'primary', 'hero'].map((size) => (
                <div key={size} className={styles.tapItem}>
                  <span className={styles.tapBox} style={{ blockSize: `var(--tap-${size})` }} />
                  <code className={styles.code}>--tap-{size}</code>
                </div>
              ))}
            </div>
          </Example>
        </div>
      </Section>
    </>
  );
}
