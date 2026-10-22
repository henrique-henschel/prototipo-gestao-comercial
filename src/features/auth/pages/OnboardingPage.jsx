import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CircleAlert, PartyPopper, RotateCcw, Store } from 'lucide-react';
import { Navigate } from 'react-router';
import { APP_NAME } from '@/app/config.js';
import { ROUTES } from '@/app/routes.js';
import { CenteredLayout } from '@/components/layout';
import {
  Button,
  Card,
  Chip,
  ChipGroup,
  EmptyState,
  Input,
  ProgressBar,
  Skeleton,
  Switch,
} from '@/components/ui';
import { PAYMENT_METHOD_KEYS, PAYMENT_METHODS, PRODUCT_CATEGORIES } from '@/domain/constants.js';
import { validateSettings } from '@/domain/rules/settings.js';
import { useDataStatus } from '@/hooks/useData.js';
import { useSession } from '@/hooks/useSession.js';
import { useSettings } from '@/hooks/useSettings.js';
import { useToast } from '@/hooks/useToast.js';
import styles from './OnboardingPage.module.css';

const STEP_COUNT = 3;

/** Explicação curta de cada forma de pagamento, em palavras do dia a dia. */
const METHOD_HINTS = {
  dinheiro: 'Notas e moedas',
  pix: 'Na hora, pelo celular',
  debito: 'Na maquininha',
  credito: 'Na maquininha, à vista ou parcelado',
  fiado: 'O cliente leva agora e paga depois',
};

/**
 * Boas-vindas em 3 passos depois de criar a conta: nome do negócio, o que vende e
 * como recebe. No fim, dá para começar com os dados de exemplo ou do zero.
 */
export default function OnboardingPage() {
  const { session } = useSession();
  const { business, settings } = useSettings();
  const { status, reload } = useDataStatus();

  if (session?.onboarded) return <Navigate to={ROUTES.home} replace />;

  let content;
  if (status === 'error' && !business) {
    content = (
      <Card>
        <EmptyState
          tone="danger"
          emoji="📶"
          title="Não foi possível carregar"
          description="Confira a internet e tente de novo."
          action={
            <Button icon={RotateCcw} onClick={reload}>
              Tentar de novo
            </Button>
          }
        />
      </Card>
    );
  } else if (!business || !settings) {
    content = (
      <Card padding="lg" aria-busy="true">
        <span className="visually-hidden">Carregando…</span>
        <Skeleton width="40%" />
        <Skeleton shape="rect" height="3rem" className={styles.skeletonGap} />
        <Skeleton lines={3} />
      </Card>
    );
  } else {
    content = <OnboardingWizard business={business} settings={settings} />;
  }

  return (
    <CenteredLayout width="md">
      <title>{`Boas-vindas · ${APP_NAME}`}</title>
      {content}
    </CenteredLayout>
  );
}

/**
 * @param {{ business: import('@/domain/models.js').Business, settings: import('@/domain/models.js').Settings }} props
 */
function OnboardingWizard({ business, settings }) {
  const { user, markOnboarded } = useSession();
  const { completeOnboarding } = useSettings();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState(business.name);
  const [sells, setSells] = useState(business.sells);
  const [methods, setMethods] = useState(settings.paymentMethods);
  const [keepSampleData, setKeepSampleData] = useState(true);
  const [error, setError] = useState(/** @type {string|null} */ (null));
  const [pending, setPending] = useState(false);
  const headingRef = useRef(null);
  const nameRef = useRef(null);
  const isFirstRender = useRef(true);

  // A cada passo, o foco vai para o título novo: o leitor de tela anuncia a pergunta.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const firstName = user?.name.split(' ')[0];
  const isLast = step === STEP_COUNT - 1;

  function toggleCategory(value) {
    setSells((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    );
  }

  async function finish() {
    setPending(true);
    try {
      await completeOnboarding({ businessName, sells, paymentMethods: methods, keepSampleData });
      markOnboarded();
      toast.show({ message: 'Tudo pronto!', description: 'Agora é só começar a vender.' });
    } catch (caught) {
      toast.show({ message: caught.message, tone: 'danger' });
      setPending(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (step === 0 && !businessName.trim()) {
      setError('Digite o nome do seu negócio.');
      nameRef.current?.focus();
      return;
    }
    if (step === 2 && validateSettings({ ...settings, paymentMethods: methods }).length > 0) {
      setError('Deixe pelo menos uma forma de pagamento ligada.');
      return;
    }
    setError(null);
    if (isLast) finish();
    else setStep(step + 1);
  }

  function goBack() {
    setError(null);
    setStep(step - 1);
  }

  return (
    <Card padding="lg">
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.progress}>
          <p className={styles.stepCount}>
            Passo {step + 1} de {STEP_COUNT}
          </p>
          <ProgressBar value={step + 1} max={STEP_COUNT} label="Progresso das boas-vindas" size="sm" />
        </div>

        {step === 0 && (
          <fieldset className={styles.step}>
            <legend className="visually-hidden">Nome do negócio</legend>
            <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
              Como se chama o seu negócio?
            </h1>
            <p className={styles.description}>
              {firstName ? `Olá, ${firstName}! ` : ''}É o nome que aparece no app e nos recibos.
            </p>
            <Input
              ref={nameRef}
              label="Nome do negócio"
              icon={Store}
              placeholder="Ex.: Barraca da Rosa"
              autoComplete="organization"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              error={error ?? undefined}
            />
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className={styles.step}>
            <legend className="visually-hidden">O que você vende</legend>
            <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
              O que você vende?
            </h1>
            <p className={styles.description}>
              Escolha quantos quiser. Isso ajuda a organizar os seus produtos.
            </p>
            <ChipGroup label="Tipos de produto" wrap>
              {PRODUCT_CATEGORIES.map((category) => (
                <Chip
                  key={category.value}
                  emoji={category.emoji}
                  selected={sells.includes(category.value)}
                  onClick={() => toggleCategory(category.value)}
                >
                  {category.label}
                </Chip>
              ))}
            </ChipGroup>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className={styles.step}>
            <legend className="visually-hidden">Como você recebe</legend>
            <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
              Como você recebe?
            </h1>
            <p className={styles.description}>
              Desligue o que você não aceita. Dá para mudar depois, em Ajustes.
            </p>
            <div className={styles.switches}>
              {PAYMENT_METHOD_KEYS.map((method) => (
                <Switch
                  key={method}
                  label={PAYMENT_METHODS[method].label}
                  description={METHOD_HINTS[method]}
                  checked={methods[method]}
                  onChange={(checked) => setMethods((current) => ({ ...current, [method]: checked }))}
                />
              ))}
            </div>
            {error && (
              <p className={styles.error} role="alert">
                <CircleAlert size={20} aria-hidden="true" />
                {error}
              </p>
            )}
            <div className={styles.sample}>
              <Switch
                label="Começar com dados de exemplo"
                description="Mostra vendas, clientes e produtos de mentira para você conhecer o app."
                checked={keepSampleData}
                onChange={setKeepSampleData}
              />
            </div>
          </fieldset>
        )}

        <div className={styles.actions}>
          {step > 0 && (
            <Button variant="ghost" size="lg" icon={ArrowLeft} onClick={goBack} disabled={pending}>
              Voltar
            </Button>
          )}
          <Button
            type="submit"
            size="lg"
            icon={isLast ? PartyPopper : undefined}
            iconRight={isLast ? undefined : ArrowRight}
            loading={pending}
            className={styles.next}
          >
            {isLast ? 'Começar a usar' : 'Continuar'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
